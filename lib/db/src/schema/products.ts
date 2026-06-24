import {
  pgTable,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  weightGrams: doublePrecision("weight_grams").notNull(),
  fineness: text("fineness").notNull().default("999.9"),
  category: text("category").notNull(),
  subcat: text("subcat").notNull(),
  year: integer("year"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  image: text("image"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
