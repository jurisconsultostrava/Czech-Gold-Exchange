import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FeedAlertMonitor,
  classifyFeedFailure,
  type FeedAlertPayload,
} from "./feedAlerts";
import { EmptyFeedError } from "./exportFeeds";

const silentLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
};

function makeMonitor(
  over: Partial<{
    threshold: number;
    repeatMs: number;
    now: () => number;
  }> = {},
): { monitor: FeedAlertMonitor; alerts: FeedAlertPayload[] } {
  const alerts: FeedAlertPayload[] = [];
  const monitor = new FeedAlertMonitor({
    threshold: over.threshold ?? 3,
    repeatMs: over.repeatMs ?? 1000,
    now: over.now,
    logger: silentLogger,
    notify: (payload) => {
      alerts.push(payload);
    },
  });
  return { monitor, alerts };
}

test("classifyFeedFailure distinguishes zero-matches from price-source", () => {
  assert.equal(classifyFeedFailure(new EmptyFeedError()), "zero-matches");
  assert.equal(
    classifyFeedFailure(new Error("Price feed responded 500")),
    "price-source",
  );
  assert.equal(classifyFeedFailure("boom"), "price-source");
});

test("a single transient failure does not alert", () => {
  const { monitor, alerts } = makeMonitor({ threshold: 3 });
  assert.equal(monitor.recordFailure("heureka", new Error("down")), false);
  assert.equal(alerts.length, 0);
});

test("alert fires once consecutive failures reach the threshold", () => {
  const { monitor, alerts } = makeMonitor({ threshold: 3 });
  assert.equal(monitor.recordFailure("heureka", new Error("down")), false);
  assert.equal(monitor.recordFailure("heureka", new Error("down")), false);
  assert.equal(monitor.recordFailure("heureka", new Error("down")), true);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].feed, "heureka");
  assert.equal(alerts[0].reason, "price-source");
  assert.equal(alerts[0].consecutiveFailures, 3);
});

test("alert names which feed failed and why (zero matches)", () => {
  const { monitor, alerts } = makeMonitor({ threshold: 1 });
  monitor.recordFailure("google", new EmptyFeedError());
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].feed, "google");
  assert.equal(alerts[0].reason, "zero-matches");
  assert.match(alerts[0].message, /google/);
  assert.match(alerts[0].message, /zero matches/);
});

test("repeat alerts are throttled until the cooldown elapses", () => {
  let clock = 0;
  const { monitor, alerts } = makeMonitor({
    threshold: 1,
    repeatMs: 1000,
    now: () => clock,
  });
  monitor.recordFailure("zbozi", new Error("down")); // fires at t=0
  assert.equal(alerts.length, 1);

  clock = 500;
  monitor.recordFailure("zbozi", new Error("down")); // within cooldown
  assert.equal(alerts.length, 1);

  clock = 1000;
  monitor.recordFailure("zbozi", new Error("down")); // cooldown elapsed
  assert.equal(alerts.length, 2);
});

test("a success resets the streak so the next alert needs the full threshold again", () => {
  const { monitor, alerts } = makeMonitor({ threshold: 2 });
  monitor.recordFailure("heureka", new Error("down"));
  monitor.recordSuccess("heureka");
  assert.equal(monitor.recordFailure("heureka", new Error("down")), false);
  assert.equal(alerts.length, 0);
  assert.equal(monitor.recordFailure("heureka", new Error("down")), true);
  assert.equal(alerts.length, 1);
});

test("failure streaks are tracked independently per feed", () => {
  const { monitor, alerts } = makeMonitor({ threshold: 2 });
  monitor.recordFailure("heureka", new Error("down"));
  monitor.recordFailure("google", new Error("down"));
  assert.equal(alerts.length, 0);
  monitor.recordFailure("heureka", new Error("down")); // heureka hits 2
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].feed, "heureka");
});

test("alert payload carries the underlying error message and a timestamp", () => {
  const { monitor, alerts } = makeMonitor({
    threshold: 1,
    now: () => 0,
  });
  monitor.recordFailure("heureka", new Error("Price feed responded 503"));
  assert.equal(alerts[0].error, "Price feed responded 503");
  assert.equal(alerts[0].ts, new Date(0).toISOString());
});
