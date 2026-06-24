---
name: SwissGold xaumanager feeds
description: The two distinct xaumanager.cz feeds and how they relate (catalog vs live price)
---

# SwissGold supplier feeds (xaumanager.cz)

Two **separate** feeds with **different XML schemas**, joined by a shared item ID. Do not merge them or key one by the other's field names.

- **Product feed** (`PRODUCT_FEED_URL`, `…/export/meistergold`) — the product CATALOG; the seed builds the `products` table from it. It is the authoritative source for material, weight, fineness, category, and image — prefer it over name-regex guessing.
- **Price feed** (`PRICE_FEED_URL`, `…/export/xml`) — live PRICE + STOCK + buyback, read at request time by the `/prices` route. Never use it as the catalog/product source.

**Why it matters:** the two feeds enumerate the same 215 items, but only the price feed has live pricing/stock and only the product feed has clean catalog metadata. The seed and the runtime price path must stay on their respective feeds.

**Join key:** the product feed's item id equals the price feed's code equals the image-host id, so the runtime join `feed.get(product.id)` works. If a future feed breaks that identity, the price join silently drops products (they vanish from `/prices`).

**Gotcha:** the product feed reports the same fineness for every metal (it is not metal-specific). Treat it as the supplier's declared value, not a derived truth.

Known cosmetic limit: the Czech name builder can collapse two distinct variants to the same display name (e.g. plain vs "Minted"); ids stay distinct and the original supplier name is preserved in the product description.
