-- HakkaBakka POS operational schema draft (Cloudflare D1 / SQLite)
-- DRAFT ONLY: do not apply to production until the morning review and backup.
-- Core order records remain in the existing ORDERS D1 "orders" table.
-- This migration adds normalized POS operations without altering customer orders.

PRAGMA foreign_keys = ON;

-- POS-specific metadata for each order. order_number intentionally references the
-- existing order ledger by value so this draft does not assume an integer PK.
CREATE TABLE IF NOT EXISTS pos_order_meta (
  order_number TEXT PRIMARY KEY,
  order_type TEXT NOT NULL CHECK (order_type IN ('DINE_IN','TAKEAWAY','DELIVERY','ONLINE')),
  source TEXT NOT NULL DEFAULT 'POS' CHECK (source IN ('POS','ONLINE','ADMIN')),
  table_no INTEGER CHECK (table_no IS NULL OR table_no BETWEEN 1 AND 20),
  cashier_id TEXT,
  customer_address TEXT,
  delivery_instructions TEXT,
  discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_charges REAL NOT NULL DEFAULT 0 CHECK (delivery_charges >= 0),
  grand_total REAL NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Item-level snapshot: name and price are copied at sale time so later menu edits
-- never rewrite historical bills.
CREATE TABLE IF NOT EXISTS pos_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  menu_item_id TEXT,
  item_name TEXT NOT NULL,
  variant TEXT,
  category TEXT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  line_total REAL NOT NULL CHECK (line_total >= 0),
  kitchen_status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (kitchen_status IN ('NEW','PREPARING','READY','SERVED','CANCELLED')),
  item_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_items_order ON pos_order_items(order_number,id);
CREATE INDEX IF NOT EXISTS idx_pos_items_kitchen ON pos_order_items(kitchen_status,created_at);

-- Payment attempts and manual verification trail. A screenshot/reference is NOT
-- proof of payment; only an authorized cashier action may mark a payment PAID.
CREATE TABLE IF NOT EXISTS pos_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CASH','UPI','CARD','ONLINE','OTHER')),
  amount REAL NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  transaction_reference TEXT,
  proof_file_key TEXT,
  verified_by TEXT,
  verified_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_payments_order ON pos_payments(order_number,id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_status ON pos_payments(status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_payment_reference
  ON pos_payments(transaction_reference)
  WHERE transaction_reference IS NOT NULL AND transaction_reference <> '';

-- One or more KOTs per order; reprints are tracked instead of silently replacing
-- the original ticket.
CREATE TABLE IF NOT EXISTS pos_kot_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kot_number TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  station TEXT NOT NULL DEFAULT 'KITCHEN',
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW','ACCEPTED','PREPARING','READY','SERVED','CANCELLED')),
  print_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (print_status IN ('PENDING','PRINTED','FAILED','REPRINTED')),
  reprint_count INTEGER NOT NULL DEFAULT 0 CHECK (reprint_count >= 0),
  created_by TEXT,
  printed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_kot_queue ON pos_kot_tickets(status,created_at);
CREATE INDEX IF NOT EXISTS idx_pos_kot_order ON pos_kot_tickets(order_number);

-- Cash drawer shifts for the single billing counter.
CREATE TABLE IF NOT EXISTS pos_cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cashier_id TEXT NOT NULL,
  opening_cash REAL NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closing_cash REAL CHECK (closing_cash IS NULL OR closing_cash >= 0),
  expected_cash REAL,
  variance REAL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_status ON pos_cash_sessions(status,opened_at);

CREATE TABLE IF NOT EXISTS pos_cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('CASH_IN','CASH_OUT','REFUND','PAID_OUT')),
  amount REAL NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  order_number TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_session ON pos_cash_movements(session_id,created_at);

-- Append-only audit trail for sensitive actions and corrections.
CREATE TABLE IF NOT EXISTS pos_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_audit_entity ON pos_audit_log(entity_type,entity_id,created_at);
CREATE INDEX IF NOT EXISTS idx_pos_audit_actor ON pos_audit_log(actor_id,created_at);
