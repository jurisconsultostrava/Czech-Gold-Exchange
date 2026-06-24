import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { CookieOptions } from "express";
import { JWT_SECRET } from "./jwtSecret";

export const CUSTOMER_COOKIE = "sg_customer_token";

export interface CustomerTokenPayload {
  sub: string;
  email: string;
  role: "customer";
}

export function signCustomerToken(id: string, email: string): string {
  return jwt.sign(
    { sub: id, email, role: "customer" } satisfies CustomerTokenPayload,
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export function verifyCustomerToken(
  token: string,
): CustomerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      (decoded as CustomerTokenPayload).role === "customer" &&
      typeof (decoded as CustomerTokenPayload).sub === "string"
    ) {
      return decoded as CustomerTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function customerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
