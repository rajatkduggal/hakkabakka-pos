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
  table_no INT,
  order_type VARCHAR(50),
  total DECIMAL(10,2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  item_name VARCHAR(100),
  qty INT,
  price DECIMAL(10,2)
);

INSERT INTO restaurant_tables (table_no, status) VALUES
(1,'Available'),(2,'Available'),(3,'Available'),(4,'Available'),
(5,'Available'),(6,'Available'),(7,'Available'),(8,'Available'),
(9,'Available'),(10,'Available'),(11,'Available'),(12,'Available'),
(13,'Available'),(14,'Available'),(15,'Available'),(16,'Available'),
(17,'Available'),(18,'Available'),(19,'Available'),(20,'Available');
