USE hakkabakka_pos;

ALTER TABLE orders
  ADD COLUMN order_no VARCHAR(40) NULL,
  ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'POS',
  ADD COLUMN customer_name VARCHAR(100) NULL,
  ADD COLUMN customer_phone VARCHAR(20) NULL,
  ADD COLUMN address TEXT NULL,
  ADD COLUMN pincode VARCHAR(10) NULL,
  ADD COLUMN food_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN delivery_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN special_instructions TEXT NULL;

UPDATE orders SET order_no = CONCAT('POS-', id) WHERE order_no IS NULL;

ALTER TABLE orders
  MODIFY COLUMN order_no VARCHAR(40) NOT NULL,
  ADD UNIQUE KEY uq_orders_order_no (order_no),
  ADD INDEX idx_orders_status_created (status, created_at),
  ADD INDEX idx_orders_source_created (source, created_at);

ALTER TABLE order_items
  MODIFY COLUMN item_name VARCHAR(150) NOT NULL,
  MODIFY COLUMN qty INT NOT NULL DEFAULT 1,
  MODIFY COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;

