import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, administratorsTable } from "@workspace/db";
import { verifyPassword } from "./customerAuth";
import { JWT_SECRET } from "./jwtSecret";

export interface AdminTokenPayload {
  email: string;
  role: "admin";
}

export function signAdminToken(email: string): string {
  return jwt.sign({ email, role: "admin" } satisfies AdminTokenPayload, JWT_SECRET, {
    expiresIn: "12h",
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      (decoded as AdminTokenPayload).role === "admin"
    ) {
      return decoded as AdminTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const rows = await db
      .select()
      .from(administratorsTable)
      .where(eq(administratorsTable.email, normalizedEmail))
      .limit(1);
    const admin = rows[0];
    if (admin) {
      return verifyPassword(password, admin.passwordHash);
    }
  } catch (error) {
    console.error("Admin DB query failed", error);
    // Fall through to the env var fallback below.
  }

  // Fallback to environment variables for backward compatibility while
  // migrating admin credentials to the `administrators` database table.
  const fallbackEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const fallbackPassword = process.env.ADMIN_PASSWORD;
  if (
    fallbackEmail &&
    fallbackPassword &&
    normalizedEmail === fallbackEmail &&
    password === fallbackPassword
  ) {
    return true;
  }

  return false;
}
