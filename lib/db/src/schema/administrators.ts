import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const administratorsTable = pgTable("administrators", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAdministratorSchema = createInsertSchema(
  administratorsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdministrator = z.infer<typeof insertAdministratorSchema>;
export type Administrator = typeof administratorsTable.$inferSelect;
