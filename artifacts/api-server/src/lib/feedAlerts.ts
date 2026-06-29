import { logger as defaultLogger } from "./logger";
import { EmptyFeedError } from "./exportFeeds";

/**
 * Why a feed build failed, surfaced in the alert so an operator knows whether
 * the upstream price source is down or the join produced zero matches.
 */
export type FeedFailureReason = "price-source" | "zero-matches";

export interface FeedAlertPayload {
  feed: string;
  reason: FeedFailureReason;
  /** Human-readable reason text (Czech-friendly, English log). */
  message: string;
  /** How many consecutive times this feed has failed. */
  consecutiveFailures: number;
  /** The underlying error message, if any. */
  error?: string;
  ts: string;
}

interface FeedState {
  consecutiveFailures: number;
  lastReason: FeedFailureReason | null;
  lastAlertAt: number;
  alerted: boolean;
}

type MinimalLogger = {
  error: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  info: (obj: unknown, msg?: string) => void;
};

export interface FeedAlertOptions {
  /** Consecutive failures required before the first alert fires. */
  threshold?: number;
  /** Minimum gap between repeat alerts for a still-failing feed (ms). */
  repeatMs?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
  /** Injectable sink that delivers the alert (webhook by default). */
  notify?: (payload: FeedAlertPayload) => void | Promise<void>;
  logger?: MinimalLogger;
}

const DEFAULT_THRESHOLD = 3;
const DEFAULT_REPEAT_MS = 30 * 60_000;

function reasonText(reason: FeedFailureReason): string {
  return reason === "zero-matches"
    ? "no active products matched the live price feed (zero matches)"
    : "the live price source is unavailable";
}

/**
 * Classify a thrown feed-build error: an {@link EmptyFeedError} means the join
 * produced zero matches, anything else means the upstream price source failed.
 */
export function classifyFeedFailure(err: unknown): FeedFailureReason {
  return err instanceof EmptyFeedError ? "zero-matches" : "price-source";
}

/**
 * Tracks per-feed failure streaks and raises an alert when a feed fails
 * repeatedly, so a downed price-comparison feed (Heureka/Zboží/Google) is
 * surfaced instead of failing silently. A single transient failure is ignored;
 * the alert fires only once `threshold` consecutive failures accrue, and then
 * at most once per `repeatMs` while the feed stays down. A successful build
 * resets the streak and logs a recovery.
 */
export class FeedAlertMonitor {
  private readonly threshold: number;
  private readonly repeatMs: number;
  private readonly now: () => number;
  private readonly notify: (payload: FeedAlertPayload) => void | Promise<void>;
  private readonly logger: MinimalLogger;
  private readonly states = new Map<string, FeedState>();

  constructor(options: FeedAlertOptions = {}) {
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
    this.repeatMs = options.repeatMs ?? DEFAULT_REPEAT_MS;
    this.now = options.now ?? (() => Date.now());
    this.logger = options.logger ?? defaultLogger;
    this.notify = options.notify ?? ((payload) => this.postWebhook(payload));
  }

  private stateFor(feed: string): FeedState {
    let state = this.states.get(feed);
    if (!state) {
      state = {
        consecutiveFailures: 0,
        lastReason: null,
        lastAlertAt: 0,
        alerted: false,
      };
      this.states.set(feed, state);
    }
    return state;
  }

  /** Record a successful feed build; resets the streak and logs any recovery. */
  recordSuccess(feed: string): void {
    const state = this.states.get(feed);
    if (state && state.consecutiveFailures > 0) {
      if (state.alerted) {
        this.logger.info(
          { feed, recoveredAfter: state.consecutiveFailures },
          `Feed "${feed}" recovered`,
        );
      }
      state.consecutiveFailures = 0;
      state.lastReason = null;
      state.alerted = false;
      state.lastAlertAt = 0;
    }
  }

  /**
   * Record a failed feed build. Returns whether an alert was fired on this call.
   */
  recordFailure(feed: string, err: unknown): boolean {
    const reason = classifyFeedFailure(err);
    const state = this.stateFor(feed);
    state.consecutiveFailures += 1;
    state.lastReason = reason;

    const error = err instanceof Error ? err.message : String(err);
    this.logger.warn(
      { feed, reason, consecutiveFailures: state.consecutiveFailures, err },
      `Feed "${feed}" build failed (${reason})`,
    );

    if (!this.shouldAlert(state)) return false;

    const payload: FeedAlertPayload = {
      feed,
      reason,
      message: `Feed "${feed}" has failed ${state.consecutiveFailures} time(s) in a row: ${reasonText(reason)}.`,
      consecutiveFailures: state.consecutiveFailures,
      error,
      ts: new Date(this.now()).toISOString(),
    };

    state.lastAlertAt = this.now();
    state.alerted = true;
    this.fire(payload);
    return true;
  }

  private shouldAlert(state: FeedState): boolean {
    if (state.consecutiveFailures < this.threshold) return false;
    if (!state.alerted) return true;
    return this.now() - state.lastAlertAt >= this.repeatMs;
  }

  private fire(payload: FeedAlertPayload): void {
    this.logger.error(
      {
        feed: payload.feed,
        reason: payload.reason,
        consecutiveFailures: payload.consecutiveFailures,
        err: payload.error,
      },
      `FEED ALERT: ${payload.message}`,
    );
    try {
      const result = this.notify(payload);
      if (result && typeof result.then === "function") {
        result.catch((notifyErr: unknown) => {
          this.logger.warn(
            { err: notifyErr, feed: payload.feed },
            "Feed alert notifier failed",
          );
        });
      }
    } catch (notifyErr) {
      this.logger.warn(
        { err: notifyErr, feed: payload.feed },
        "Feed alert notifier threw",
      );
    }
  }

  private async postWebhook(payload: FeedAlertPayload): Promise<void> {
    const url = process.env.FEED_ALERT_WEBHOOK_URL;
    if (!url) return;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:rotating_light: ${payload.message}`,
        ...payload,
      }),
    });
    if (!res.ok) {
      throw new Error(`Feed alert webhook responded ${res.status}`);
    }
  }
}

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Process-wide monitor shared by the feed routes. */
export const feedAlerts = new FeedAlertMonitor({
  threshold: envInt("FEED_ALERT_THRESHOLD"),
  repeatMs: envInt("FEED_ALERT_REPEAT_MS"),
});
