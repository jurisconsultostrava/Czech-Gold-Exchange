import { db, administratorsTable } from "@workspace/db";
import { hashPassword } from "../lib/customerAuth";

const DEFAULT_ADMIN_EMAIL = "admin@swissgold.cz";
const DEFAULT_ADMIN_PASSWORD = "SwissGold2024!";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

async function seedAdmin(): Promise<void> {
  const existing = await db.select().from(administratorsTable).limit(1);
  if (existing.length > 0) {
    console.log("Administrator already exists, skipping seed");
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db
    .insert(administratorsTable)
    .values({
      email: ADMIN_EMAIL,
      passwordHash,
    })
    .onConflictDoNothing();

  console.log(`Administrator seeded: ${ADMIN_EMAIL}`);
  console.log(
    "Please change the default password after first login for security.",
  );
}

seedAdmin()
  .then(() => {
    console.log("Admin seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Admin seed failed", err);
    process.exit(1);
  });
