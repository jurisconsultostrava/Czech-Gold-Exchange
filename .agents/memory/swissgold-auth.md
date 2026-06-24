---
name: SwissGold dual auth model
description: How customer vs admin auth differ on SwissGold, and the shared JWT secret rule
---

# SwissGold dual auth model

Two independent auth systems coexist:
- **Admin**: bearer JWT (`role: "admin"`), token in `localStorage` key `sg_admin_token`, sent via Authorization header by the generated client's auth-token getter.
- **Customer**: httpOnly cookie `sg_customer_token` (`role: "customer"`), JWT. The cookie is sent automatically same-origin (storefront + `/api` share the proxy host), so generated React Query hooks work with NO mutator change.

**Why:** keeping customer sessions in an httpOnly cookie avoids exposing the token to JS; admin stays bearer because the admin SPA already drives it explicitly.

**How to apply:**
- Customer-protected routes read the cookie in `requireCustomer` middleware; `cookie-parser` must stay wired in `app.ts`.
- To link a guest-or-logged-in action (orders/buybacks) to a customer, decode the cookie token best-effort and set `customerId` (nullable) — never require it.

## JWT secret is fail-fast
Both admin and customer tokens sign with `lib/jwtSecret.ts` = `JWT_SECRET ?? SESSION_SECRET`, which **throws at boot if neither is set**. Never reintroduce a hardcoded fallback secret — a predictable secret lets anyone forge `role:"admin"` tokens.
