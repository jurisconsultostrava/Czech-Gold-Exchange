import jwt from "jsonwebtoken";
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

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return email === adminEmail && password === adminPassword;
}
