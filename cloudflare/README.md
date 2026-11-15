# HakkaBakka POS — Cloudflare D1 integration branch

This branch is an isolated preview. The live customer website, online checkout, UPI settings and production orders remain unchanged.

## Database status
- Preview admin D1: backup/export completed before schema extension.
- Preview admin D1: 20 tables are present and all are AVAILABLE.
- Preview admin D1: monthly POS order counter exists.
- Preview admin D1: operational tables successfully applied: order metadata, item snapshots, payment attempts, KOT/reprints, cashier shifts, cash movements and audit log.
- Preview orders D1: existing `orders` table inspected; no test orders inserted.
- Production admin/orders databases were inspected read-only only; no writes made.
- `cloudflare/migrations/0002_pos_operations_draft.sql` remains the reproducible SQL source for the applied preview schema.

## Agreed operating setup
- 20 tables; one billing counter.
- Thermal printer: PSF588; KOT print and reprint workflow must be tested on the physical device.
- Dine-in, takeaway, delivery and online orders.
- Payment records default to PENDING. UPI screenshot/reference is not automatic payment verification.
- Order number sequence: monthly counter; format HB-POS-YYYYMM-00001.
- Cloudflare Workers + D1 only. No Railway.

## Remaining blockers
- POS login currently reports upstream HTTP 404; route exists in the Admin API source, so deployed routing/response mismatch must be isolated before changing authentication.
- POS API must be tested after login, including menu/table/order/report routes.
- Do not create production test orders or mark real payments paid.
- Do not point a public production domain to the preview Worker until authentication, end-to-end flows and printer tests pass.
