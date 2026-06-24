import type { Request, Response, NextFunction } from "express";
import {
  CUSTOMER_COOKIE,
  verifyCustomerToken,
  type CustomerTokenPayload,
} from "../lib/customerAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: CustomerTokenPayload;
    }
  }
}

export function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token || typeof token !== "string") {
    res.status(401).json({ error: "Nepřihlášeno" });
    return;
  }
  const payload = verifyCustomerToken(token);
  if (!payload) {
    res.status(401).json({ error: "Neplatná relace" });
    return;
  }
  req.customer = payload;
  next();
}
