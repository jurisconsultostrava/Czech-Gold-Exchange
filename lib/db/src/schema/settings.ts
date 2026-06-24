import { pgTable, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  eurToCzk: doublePrecision("eur_to_czk").notNull().default(25.2),
  globalMarginCzk: doublePrecision("global_margin_czk").notNull().default(300),
  marginInvestZlato: doublePrecision("margin_invest_zlato")
    .notNull()
    .default(300),
  marginInvestStribro: doublePrecision("margin_invest_stribro")
    .notNull()
    .default(200),
  marginPlatinaPalladium: doublePrecision("margin_platina_palladium")
    .notNull()
    .default(400),
  marginMinceCnb: doublePrecision("margin_mince_cnb").notNull().default(500),
  buybackSpreadPct: doublePrecision("buyback_spread_pct").notNull().default(0),
  deferredDiscountPct: doublePrecision("deferred_discount_pct")
    .notNull()
    .default(9),
  bulkTier1Qty: integer("bulk_tier1_qty").notNull().default(2),
  bulkTier1DiscountPct: doublePrecision("bulk_tier1_discount_pct")
    .notNull()
    .default(0.05),
  bulkTier2Qty: integer("bulk_tier2_qty").notNull().default(5),
  bulkTier2DiscountPct: doublePrecision("bulk_tier2_discount_pct")
    .notNull()
    .default(0.1),
  bulkTier3Qty: integer("bulk_tier3_qty").notNull().default(10),
  bulkTier3DiscountPct: doublePrecision("bulk_tier3_discount_pct")
    .notNull()
    .default(0.2),
});

export const insertSettingsSchema = createInsertSchema(settingsTable);
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
