import { pgTable, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buybacksTable = pgTable("buyback_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  requestNumber: text("request_number").notNull().unique(),
  status: text("status").notNull().default("new"),
  customerId: text("customer_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  itemDescription: text("item_description"),
  estimatedCzk: doublePrecision("estimated_czk"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBuybackSchema = createInsertSchema(buybacksTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBuyback = z.infer<typeof insertBuybackSchema>;
export type Buyback = typeof buybacksTable.$inferSelect;
