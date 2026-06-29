---
name: SwissGold feed alerts
description: How repeated feed 502s are surfaced (alerting design + its single-instance assumption)
---

# SwissGold feed-down alerting

The price-comparison feed routes (`/feed/heureka`, `/feed/zbozi`, `/feed/google`) already
return 502 on failure; `lib/feedAlerts.ts` turns *repeated* 502s into an operator alert so a
downed feed isn't silent.

**Design decisions (durable):**
- Alert only after N **consecutive** failures (`FEED_ALERT_THRESHOLD`, default 3) — a single
  transient blip must not page anyone. Re-alerts are throttled (`FEED_ALERT_REPEAT_MS`, default
  30m) while the feed stays down; a success resets the streak and logs a recovery.
- Failure reason is classified two ways: `EmptyFeedError` → `zero-matches`, anything else →
  `price-source`. The alert message names the feed and the reason.
- Delivery = always an error-level log; optional webhook if `FEED_ALERT_WEBHOOK_URL` is set
  (Slack-style `text` field + structured payload).

**Why the in-process streak counter is OK:** Railway runs a **single** combined web service
(see swissgold-railway-deploy), so one process sees every feed request and the in-memory streak
is accurate. **If the deployment ever scales to multiple instances**, each replica counts its own
streak — the threshold would effectively multiply and alerts would lag. At that point move the
counter to a shared store (DB/Redis) or alert from a log-based monitor instead.
