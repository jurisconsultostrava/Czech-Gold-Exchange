import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  db,
  productsTable,
  ordersTable,
  orderItemsTable,
  buybacksTable,
  priceOverridesTable,
  contentBlocksTable,
  settingsTable,
  customersTable,
} from "@workspace/db";
import {
  AdminLoginBody,
  AdminUpdateProductBody,
  AdminUpdateOrderBody,
  AdminUpdateBuybackBody,
  AdminUpdateSettingsBody,
  AdminUpdateContentBody,
  AdminUpdateOverrideBody,
} from "@workspace/api-zod";
import { signAdminToken, checkCredentials } from "../lib/auth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getSettings } from "../lib/settings";
import { fetchSpot } from "../lib/feeds";

const router: IRouter = Router();

router.post("/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatné přihlašovací údaje" });
    return;
  }
  const { email, password } = parsed.data;
  if (!checkCredentials(email, password)) {
    res.status(401).json({ error: "Nesprávné přihlašovací údaje" });
    return;
  }
  res.json({ token: signAdminToken(email) });
});

router.use(requireAdmin);

router.get("/stats", async (req, res): Promise<void> => {
  const [products, newOrders, newBuybacks] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(ordersTable).where(eq(ordersTable.status, "new")),
    db.select().from(buybacksTable).where(eq(buybacksTable.status, "new")),
  ]);
  let spotGoldCzkPerGram = 0;
  let eurCzk = 0;
  try {
    const [spot, settings] = await Promise.all([fetchSpot(), getSettings()]);
    spotGoldCzkPerGram =
      spot.spots.find((s) => s.metal === "gold")?.pricePerGramCzk ?? 0;
    eurCzk = spot.eurCzk ?? settings.eurToCzk;
  } catch (err) {
    req.log.warn({ err }, "Spot unavailable for stats");
    const settings = await getSettings();
    eurCzk = settings.eurToCzk;
  }
  res.json({
    productCount: products.length,
    newOrders: newOrders.length,
    newBuybacks: newBuybacks.length,
    spotGoldCzkPerGram,
    eurCzk,
  });
});

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));
  res.json(products);
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const parsed = AdminUpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná data produktu" });
    return;
  }
  const b = parsed.data;
  const [updated] = await db
    .update(productsTable)
    .set({
      name: b.name,
      manufacturer: b.manufacturer ?? null,
      weightGrams: b.weightGrams,
      fineness: b.fineness,
      category: b.category,
      subcat: b.subcat,
      year: b.year ?? null,
      featured: b.featured,
      active: b.active,
      image: b.image ?? null,
      description: b.description ?? null,
      sortOrder: b.sortOrder,
    })
    .where(eq(productsTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Produkt nenalezen" });
    return;
  }
  res.json(updated);
});

router.get("/orders", async (req, res): Promise<void> => {
  const { status } = req.query;
  const conditions =
    typeof status === "string" && status
      ? [eq(ordersTable.status, status)]
      : [];
  const orders = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Objednávka nenalezena" });
    return;
  }
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, rows[0].id));
  res.json({ ...rows[0], items });
});

router.put("/orders/:id", async (req, res): Promise<void> => {
  const parsed = AdminUpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatný stav" });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Objednávka nenalezena" });
    return;
  }
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, updated.id));
  res.json({ ...updated, items });
});

router.get("/buybacks", async (req, res): Promise<void> => {
  const { status } = req.query;
  const conditions =
    typeof status === "string" && status
      ? [eq(buybacksTable.status, status)]
      : [];
  const rows = await db
    .select()
    .from(buybacksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(buybacksTable.createdAt));
  res.json(rows);
});

router.get("/buybacks/:id", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(buybacksTable)
    .where(eq(buybacksTable.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Žádost nenalezena" });
    return;
  }
  res.json(rows[0]);
});

router.put("/buybacks/:id", async (req, res): Promise<void> => {
  const parsed = AdminUpdateBuybackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná data" });
    return;
  }
  const [updated] = await db
    .update(buybacksTable)
    .set({
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? null,
    })
    .where(eq(buybacksTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Žádost nenalezena" });
    return;
  }
  res.json(updated);
});

router.get("/settings", async (_req, res): Promise<void> => {
  res.json(await getSettings());
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = AdminUpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná nastavení" });
    return;
  }
  await getSettings();
  const [updated] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, 1))
    .returning();
  res.json(updated);
});

router.get("/content", async (_req, res): Promise<void> => {
  const blocks = await db.select().from(contentBlocksTable);
  res.json(blocks);
});

router.put("/content/:key", async (req, res): Promise<void> => {
  const parsed = AdminUpdateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatný obsah" });
    return;
  }
  const [updated] = await db
    .insert(contentBlocksTable)
    .values({ key: req.params.key, value: parsed.data.value })
    .onConflictDoUpdate({
      target: contentBlocksTable.key,
      set: { value: parsed.data.value },
    })
    .returning();
  res.json(updated);
});

router.get("/overrides", async (_req, res): Promise<void> => {
  const rows = await db.select().from(priceOverridesTable);
  res.json(rows);
});

router.put("/overrides/:productId", async (req, res): Promise<void> => {
  const parsed = AdminUpdateOverrideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná data" });
    return;
  }
  const b = parsed.data;
  const [updated] = await db
    .insert(priceOverridesTable)
    .values({
      productId: req.params.productId,
      marginCzk: b.marginCzk ?? null,
      marginPct: b.marginPct ?? null,
      active: b.active,
    })
    .onConflictDoUpdate({
      target: priceOverridesTable.productId,
      set: {
        marginCzk: b.marginCzk ?? null,
        marginPct: b.marginPct ?? null,
        active: b.active,
      },
    })
    .returning();
  res.json(updated);
});

router.get("/customers", async (_req, res): Promise<void> => {
  const [customers, orders, buybacks] = await Promise.all([
    db.select().from(customersTable).orderBy(desc(customersTable.createdAt)),
    db.select().from(ordersTable),
    db.select().from(buybacksTable),
  ]);
  const summaries = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const totalSpentCzk = custOrders.reduce((sum, o) => sum + (o.totalCzk ?? 0), 0);
    return {
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      createdAt: c.createdAt,
      orderCount: custOrders.length,
      totalSpentCzk,
      buybackCount: buybacks.filter((b) => b.customerId === c.id).length,
    };
  });
  res.json(summaries);
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.params.id))
    .limit(1);
  const customer = rows[0];
  if (!customer) {
    res.status(404).json({ error: "Zákazník nenalezen" });
    return;
  }
  const { passwordHash: _passwordHash, ...publicCustomer } = customer;
  const [orders, buybacks] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerId, customer.id))
      .orderBy(desc(ordersTable.createdAt)),
    db
      .select()
      .from(buybacksTable)
      .where(eq(buybacksTable.customerId, customer.id))
      .orderBy(desc(buybacksTable.createdAt)),
  ]);
  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    }),
  );
  res.json({ customer: publicCustomer, orders: ordersWithItems, buybacks });
});

export default router;
