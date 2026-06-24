import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { RegisterCustomerBody, LoginCustomerBody } from "@workspace/api-zod";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  signCustomerToken,
  hashPassword,
  verifyPassword,
} from "../lib/customerAuth";
import { requireCustomer } from "../middlewares/requireCustomer";

const router: IRouter = Router();

function publicCustomer(c: typeof customersTable.$inferSelect) {
  const { passwordHash: _passwordHash, ...rest } = c;
  return rest;
}

router.post("/register", async (req, res): Promise<void> => {
  const parsed = RegisterCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Neplatné údaje" });
    return;
  }
  const b = parsed.data;
  const email = b.email.trim().toLowerCase();

  const existing = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email))
    .limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "E-mail je již zaregistrovaný" });
    return;
  }

  const [created] = await db
    .insert(customersTable)
    .values({
      email,
      passwordHash: await hashPassword(b.password),
      firstName: b.firstName ?? null,
      lastName: b.lastName ?? null,
      phone: b.phone ?? null,
    })
    .returning();

  res.cookie(
    CUSTOMER_COOKIE,
    signCustomerToken(created.id, created.email),
    customerCookieOptions(),
  );
  res.status(201).json(publicCustomer(created));
});

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Nesprávné přihlašovací údaje" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email))
    .limit(1);
  const customer = rows[0];
  if (!customer || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
    res.status(401).json({ error: "Nesprávné přihlašovací údaje" });
    return;
  }

  res.cookie(
    CUSTOMER_COOKIE,
    signCustomerToken(customer.id, customer.email),
    customerCookieOptions(),
  );
  res.json(publicCustomer(customer));
});

router.post("/logout", async (_req, res): Promise<void> => {
  res.clearCookie(CUSTOMER_COOKIE, { ...customerCookieOptions(), maxAge: undefined });
  res.json({ message: "Odhlášeno" });
});

router.get("/me", requireCustomer, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.customer!.sub))
    .limit(1);
  if (!rows[0]) {
    res.status(401).json({ error: "Nepřihlášeno" });
    return;
  }
  res.json(publicCustomer(rows[0]));
});

export default router;
