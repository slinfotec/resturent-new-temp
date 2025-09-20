-- db/schema.sql
-- SQL schema for POS sales and sale_items

CREATE DATABASE IF NOT EXISTS pos_db;
USE pos_db;

-- sales table stores each sale summary
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT DEFAULT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_sales_customer (customer_id),
  INDEX idx_sales_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- sale_items table stores line items for each sale
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_batch_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  -- optional snapshot fields for audit
  stock_snapshot INT DEFAULT NULL,
  expiry DATE DEFAULT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  INDEX idx_sale_items_sale_id (sale_id),
  INDEX idx_sale_items_product_batch (product_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional table for customers (if you want to store them server-side)
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example: simple products table for reference
CREATE TABLE IF NOT EXISTS product_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  expiry DATE DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
