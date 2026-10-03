CREATE DATABASE hakkabakka_pos;

USE hakkabakka_pos;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  username VARCHAR(50),
  password VARCHAR(255),
  role VARCHAR(50)
);

CREATE TABLE restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_no INT,
  status VARCHAR(50)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(40) NOT NULL UNIQUE,
  source VARCHAR(30) NOT NULL DEFAULT 'POS',
  table_no INT NULL,
  order_type VARCHAR(50) NOT NULL,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  address TEXT,
  pincode VARCHAR(10),
  food_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_status_created (status, created_at),
  INDEX idx_orders_source_created (source, created_at)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

INSERT INTO restaurant_tables (table_no, status) VALUES
(1,'Available'),(2,'Available'),(3,'Available'),(4,'Available'),
(5,'Available'),(6,'Available'),(7,'Available'),(8,'Available'),
(9,'Available'),(10,'Available'),(11,'Available'),(12,'Available'),
(13,'Available'),(14,'Available'),(15,'Available'),(16,'Available'),
(17,'Available'),(18,'Available'),(19,'Available'),(20,'Available');
