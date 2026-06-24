import { pgTable, text, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priceOverridesTable = pgTable("price_overrides", {
  productId: text("product_id").primaryKey(),
  marginCzk: doublePrecision("margin_czk"),
  marginPct: doublePrecision("margin_pct"),
  active: boolean("active").notNull().default(true),
});

export const insertPriceOverrideSchema =
  createInsertSchema(priceOverridesTable);
export type InsertPriceOverride = z.infer<typeof insertPriceOverrideSchema>;
export type PriceOverride = typeof priceOverridesTable.$inferSelect;
