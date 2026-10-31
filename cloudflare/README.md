# HakkaBakka POS — Cloudflare D1 integration branch

This is an isolated implementation branch. It does not alter the live website or deploy automatically.

## Architecture
- `DB`: existing `hakkabakka-admin` D1 database (admin sessions + POS tables/counters).
- `ORDERS`: existing `hb-orders` D1 database (shared order ledger).
- Requires an existing admin session token. Send it as `Authorization: Bearer <token>` or the `hb_admin_session` cookie.
- Payment state is always created as `PENDING`; never treat a UPI screenshot/reference as verified payment.

## Files
- `cloudflare/pos-worker.js`: Worker API source.
- `cloudflare/migrations/0001_pos_tables.sql`: additive schema for 20 tables and POS order counters.

## Routes
- `GET /health`
- Authenticated `GET /api/tables`
- Authenticated `GET /api/orders`
- Authenticated `POST /api/orders`
- Authenticated `PATCH /api/orders/:order_number/status`
- Authenticated `GET /api/reports/daily`

## Before deployment
1. Back up both D1 databases.
2. Verify the Admin API's session token hashing and cookie name. This worker assumes SHA-256 hex in `admin_sessions.token_hash` and cookie `hb_admin_session`.
3. Apply the migration to a staging copy first.
4. Restrict CORS to the actual admin/POS origins.
5. Run concurrent order-number tests and printer tests on the real PSF588 device.
6. Do not point a public production domain to this worker until authentication and end-to-end tests pass.

The Worker API is not yet a complete POS user interface. The existing Node/MySQL application remains unchanged in this branch.
