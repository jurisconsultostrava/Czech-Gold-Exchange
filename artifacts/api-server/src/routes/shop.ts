import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  buybacksTable,
} from "@workspace/db";
import { CreateOrderBody, CreateBuybackBody } from "@workspace/api-zod";
import { CUSTOMER_COOKIE, verifyCustomerToken } from "../lib/customerAuth";

const router: IRouter = Router();

function currentCustomerId(req: { cookies?: Record<string, unknown> }): string | null {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token || typeof token !== "string") return null;
  return verifyCustomerToken(token)?.sub ?? null;
}

function makeNumber(prefix: string): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${stamp}-${rand}`;
}

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná objednávka" });
    return;
  }
  const body = parsed.data;
  const orderNumber = makeNumber("SG");

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      customerId: currentCustomerId(req),
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone ?? null,
      customerAddress: body.customerAddress ?? null,
      customerCity: body.customerCity ?? null,
      customerZip: body.customerZip ?? null,
      paymentMethod: body.paymentMethod,
      deliveryMethod: body.deliveryMethod,
      currency: body.currency,
      totalCzk: body.totalCzk,
      totalEur: body.totalEur,
    })
    .returning();

  const items = await db
    .insert(orderItemsTable)
    .values(
      body.items.map((it) => ({
        orderId: order.id,
        productId: it.productId,
        productName: it.productName,
        weightGrams: it.weightGrams ?? null,
        quantity: it.quantity,
        unitPriceCzk: it.unitPriceCzk,
        unitPriceEur: it.unitPriceEur,
      })),
    )
    .returning();

  res.status(201).json({ ...order, items });
});

router.post("/buybacks", async (req, res): Promise<void> => {
  const parsed = CreateBuybackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatná žádost" });
    return;
  }
  const body = parsed.data;
  const requestNumber = makeNumber("VYK");

  const [buyback] = await db
    .insert(buybacksTable)
    .values({
      requestNumber,
      customerId: currentCustomerId(req),
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone ?? null,
      itemDescription: body.itemDescription ?? null,
      estimatedCzk: body.estimatedCzk ?? null,
    })
    .returning();

  res.status(201).json(buyback);
});

export default router;
