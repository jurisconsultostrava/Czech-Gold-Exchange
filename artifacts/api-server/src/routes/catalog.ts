import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNotNull, ne } from "drizzle-orm";
import {
  db,
  productsTable,
  priceOverridesTable,
  contentBlocksTable,
} from "@workspace/db";
import { fetchPriceFeed, fetchSpot } from "../lib/feeds";
import { computePrice } from "../lib/pricing";
import { getSettings } from "../lib/settings";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const { category, subcat, featured } = req.query;
  const conditions = [eq(productsTable.active, true)];
  if (typeof category === "string" && category) {
    conditions.push(eq(productsTable.category, category));
  }
  if (typeof subcat === "string" && subcat) {
    conditions.push(eq(productsTable.subcat, subcat));
  }
  if (featured === "true") {
    conditions.push(eq(productsTable.featured, true));
  }
  const products = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));
  res.json(products);
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.active, true),
        isNotNull(productsTable.image),
        ne(productsTable.image, ""),
      ),
    )
    .orderBy(
      desc(productsTable.featured),
      asc(productsTable.sortOrder),
      asc(productsTable.name),
    )
    .limit(8);
  res.json(products);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Produkt nenalezen" });
    return;
  }
  res.json(rows[0]);
});

router.get("/prices", async (req, res): Promise<void> => {
  try {
    const [feed, settings, products, overrides] = await Promise.all([
      fetchPriceFeed(),
      getSettings(),
      db.select().from(productsTable).where(eq(productsTable.active, true)),
      db.select().from(priceOverridesTable),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.productId, o]));
    const prices = products
      .map((product) => {
        const item = feed.get(product.id);
        if (!item) return null;
        return computePrice(
          product,
          item,
          settings,
          overrideMap.get(product.id),
        );
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
    res.json(prices);
  } catch (err) {
    req.log.error({ err }, "Failed to compute prices");
    res.status(502).json({ error: "Ceny nejsou momentálně dostupné" });
  }
});

router.get("/spot", async (req, res): Promise<void> => {
  try {
    const [spot, settings] = await Promise.all([fetchSpot(), getSettings()]);
    res.json({
      spots: spot.spots,
      eurCzk: spot.eurCzk ?? settings.eurToCzk,
      ts: spot.ts,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch spot");
    res.status(502).json({ error: "Spotové ceny nejsou dostupné" });
  }
});

router.get("/settings/public", async (_req, res): Promise<void> => {
  const s = await getSettings();
  res.json({
    eurToCzk: s.eurToCzk,
    deferredDiscountPct: s.deferredDiscountPct,
    bulkTier1Qty: s.bulkTier1Qty,
    bulkTier1DiscountPct: s.bulkTier1DiscountPct,
    bulkTier2Qty: s.bulkTier2Qty,
    bulkTier2DiscountPct: s.bulkTier2DiscountPct,
    bulkTier3Qty: s.bulkTier3Qty,
    bulkTier3DiscountPct: s.bulkTier3DiscountPct,
  });
});

router.get("/content", async (_req, res): Promise<void> => {
  const blocks = await db.select().from(contentBlocksTable);
  const map: Record<string, string> = {};
  for (const b of blocks) map[b.key] = b.value;
  res.json(map);
});

export default router;
