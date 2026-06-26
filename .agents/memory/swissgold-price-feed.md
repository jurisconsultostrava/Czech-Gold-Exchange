---
name: SwissGold price feed units & matching
description: Why the live price feed is used as-is (CZK, no margin) and the haléře trap if the feed source changes.
---

# SwissGold live price feed

The storefront has **no stored sell price** — prices are computed live at request
time by matching the price feed to each product, then served from `/api/prices`.

## Source & matching
- Live price source is the **mergado.com shoptet-univerzalni XML** (`PRICE_FEED_URL`).
- Each product is matched to a feed `SHOPITEM` by **`CODE` first (`CODE === product.id`), then by normalized `NAME`** (diacritics stripped, lowercased, whitespace collapsed). Name fallback exists because not every product id equals a feed code.

## Unit + margin model (the trap)
- The mergado feed quotes the **final published retail price incl. VAT in WHOLE CZK**. It is shown **as-is**: no ÷100, and **no category/global margin** added. `sellPriceCzk` defaults to the feed price.
- Per-product `price_overrides` (marginPct / marginCzk, opt-in `active`) can still adjust the price; the global/category margin settings no longer feed into the default price.

**Why:** the user confirmed the XML price is "final for publication" and is in CZK.

**How to apply:** The PREVIOUS source (xaumanager `…/export/xml`) quoted prices in **haléře (÷100)**. If `PRICE_FEED_URL` is ever pointed back at a haléře feed, you must restore the ÷100 conversion in `artifacts/api-server/src/lib/feeds.ts` and re-add margin handling in `pricing.ts`, or every price will be 100× too small. Different feeds = different units; never assume.

# Spot ticker (metals + EUR/CZK)

Separate from product pricing. `fetchSpot` uses the xaumanager spot API first; on failure / zero metals it falls back to **GoldAPI.io** (`GOLDAPI_KEY`, `x-access-token` header, metals XAU/XAG/XPT/XPD in CZK).

- **EUR/CZK trick:** GoldAPI is metals-only and has no forex endpoint. Derive EUR/CZK as **gold-in-CZK ÷ gold-in-EUR** (`XAU/CZK.price / XAU/EUR.price`). The primary spot feed usually returns `eur_czk: null`, which is why the ticker showed the static settings default (25.2) — backfill from GoldAPI fixes that; final fallback is `settings.eurToCzk`.
- **Why:** user asked for GoldAPI as the fallback; live EUR/CZK was the actual gap.
- **Quota:** all wrapped in the 60s `spotCache`, so GoldAPI is hit at most once/min even during an outage.
