import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  customersTable,
  ordersTable,
  orderItemsTable,
  buybacksTable,
} from "@workspace/db";
import { UpdateProfileBody, ChangePasswordBody } from "@workspace/api-zod";
import { requireCustomer } from "../middlewares/requireCustomer";
import { hashPassword, verifyPassword } from "../lib/customerAuth";

const router: IRouter = Router();

router.use(requireCustomer);

function publicCustomer(c: typeof customersTable.$inferSelect) {
  const { passwordHash: _passwordHash, ...rest } = c;
  return rest;
}

router.put("/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná data" });
    return;
  }
  const b = parsed.data;
  const [updated] = await db
    .update(customersTable)
    .set({
      firstName: b.firstName ?? null,
      lastName: b.lastName ?? null,
      phone: b.phone ?? null,
      address: b.address ?? null,
      city: b.city ?? null,
      zip: b.zip ?? null,
    })
    .where(eq(customersTable.id, req.customer!.sub))
    .returning();
  if (!updated) {
    res.status(401).json({ error: "Nepřihlášeno" });
    return;
  }
  res.json(publicCustomer(updated));
});

router.put("/password", async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná data" });
    return;
  }
  const rows = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.sub))
    .limit(1);
  const customer = rows[0];
  if (!customer) {
    res.status(401).json({ error: "Nepřihlášeno" });
    return;
  }
  if (!(await verifyPassword(parsed.data.currentPassword, customer.passwordHash))) {
    res.status(400).json({ error: "Stávající heslo není správné" });
    return;
  }
  await db
    .update(customersTable)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(customersTable.id, customer.id));
  res.json({ message: "Heslo bylo změněno" });
});

router.get("/orders", async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, req.customer!.sub))
    .orderBy(desc(ordersTable.createdAt));
  const withItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    }),
  );
  res.json(withItems);
});

router.get("/buybacks", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(buybacksTable)
    .where(eq(buybacksTable.customerId, req.customer!.sub))
    .orderBy(desc(buybacksTable.createdAt));
  res.json(rows);
});

export default router;
