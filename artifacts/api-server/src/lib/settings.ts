import { db, settingsTable } from "@workspace/db";
import type { Settings } from "@workspace/db";

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(settingsTable)
    .values({ id: 1 })
    .returning();
  return created;
}
