import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("new"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerZip: text("customer_zip"),
  paymentMethod: text("payment_method").notNull().default("bank_transfer"),
  deliveryMethod: text("delivery_method").notNull().default("personal"),
  totalCzk: doublePrecision("total_czk").notNull(),
  totalEur: doublePrecision("total_eur").notNull(),
  currency: text("currency").notNull().default("CZK"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  weightGrams: doublePrecision("weight_grams"),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCzk: doublePrecision("unit_price_czk").notNull(),
  unitPriceEur: doublePrecision("unit_price_eur").notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({
  id: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
