import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken, type AdminTokenPayload } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Neautorizováno" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Neplatný token" });
    return;
  }
  req.admin = payload;
  next();
}
