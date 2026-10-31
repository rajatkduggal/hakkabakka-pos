# HakkaBakka POS — Cloudflare D1 integration branch

This branch is an isolated preview. The live customer website, online checkout, UPI settings and production orders must remain unchanged during setup and testing.

## Database plan
- Existing admin D1: admin sessions, menu catalogue, 20 dine-in tables and monthly POS order-number counters.
- Existing orders D1: shared order ledger for POS and online orders.
- `cloudflare/migrations/0001_pos_tables.sql`: additive 20-table and counter migration.
- `cloudflare/migrations/0002_pos_operations_draft.sql`: draft-only operational tables for order metadata/items, payment attempts, KOT/reprints, cashier shifts, cash movements and audit history.

## Agreed operating setup
- 20 tables; one billing counter.
- Thermal printer: PSF588; KOT print and reprint workflow to be tested on the actual device.
- Dine-in, takeaway, delivery and online orders.
- Payment records default to PENDING. UPI screenshot/reference is not automatic payment verification.
- Order number sequence: monthly counter; format HB-POS-YYYYMM-00001.
- Cloudflare Workers + D1 only. No Railway.

## Important status
The operational migration is a draft and has NOT been applied to any database. Before applying it, confirm the target preview D1 database, take a backup, inspect the existing schema, and test migration in isolation. Do not apply it to production during setup.

The current POS login proxy still depends on the separate Admin API route. The known `/api/login` upstream currently returns HTTP 404; do not work around this by guessing an endpoint or pointing POS at the customer orders Worker.
