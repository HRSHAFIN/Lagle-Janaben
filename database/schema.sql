CREATE DATABASE IF NOT EXISTS lagle_janaben
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lagle_janaben;

-- -----------------------------------------------------------
-- Products
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          VARCHAR(32)    NOT NULL PRIMARY KEY,
  name        VARCHAR(255)   NOT NULL,
  description TEXT,
  price       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  category    VARCHAR(100)   NOT NULL DEFAULT 'General',
  image       VARCHAR(500)   DEFAULT NULL,
  images      JSON           DEFAULT NULL,
  inventory   INT            NOT NULL DEFAULT 0,
  rating      DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
  featured    TINYINT(1)     NOT NULL DEFAULT 0,
  status      ENUM('Active','Draft','Out of Stock') NOT NULL DEFAULT 'Active',
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Orders
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(32)   NOT NULL PRIMARY KEY,
  customer_name   VARCHAR(255)  NOT NULL,
  customer_email  VARCHAR(255)  NOT NULL,
  shipping_address TEXT,
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status          ENUM('Pending','Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  payment_method  VARCHAR(100)  DEFAULT NULL,
  payment_status  VARCHAR(32)   NOT NULL DEFAULT 'unpaid',
  card_type       VARCHAR(64)   DEFAULT NULL,
  bank_tran_id    VARCHAR(128)  DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validated_at    TIMESTAMP     NULL DEFAULT NULL,
  INDEX idx_customer_email (customer_email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Order Items
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(32)    NOT NULL,
  product_id  VARCHAR(32)    DEFAULT NULL,
  name        VARCHAR(255)   NOT NULL,
  price       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  quantity    INT            NOT NULL DEFAULT 1,
  image       VARCHAR(500)   DEFAULT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Customers (CRM)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  join_date     DATE         DEFAULT NULL,
  total_orders  INT          NOT NULL DEFAULT 0,
  total_spent   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Seed data
-- -----------------------------------------------------------
INSERT INTO products (id, name, description, price, category, image, images, inventory, rating, featured, status) VALUES
('prod-1', 'Aero Wireless Headphones', 'Experience pure sonic bliss with active noise cancellation, custom-tuned high-fidelity audio, and up to 45 hours of comfortable playback.', 249.00, 'Technology', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80"]', 15, 4.8, 1, 'Active'),
('prod-2', 'Vanguard Leather Backpack', 'Handcrafted from full-grain vegetable-tanned leather. Features a protective 16-inch laptop compartment and hidden quick-access travel pockets.', 189.00, 'Accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=600&q=80"]', 8, 4.9, 1, 'Active'),
('prod-3', 'Horology Minimalist Watch', 'A masterpiece of understatement. Features a Swiss quartz movement, surgical-grade stainless steel case, and an interchangeable genuine leather strap.', 145.00, 'Accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', '["https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80"]', 22, 4.7, 1, 'Active'),
('prod-4', 'Tactile Mechanical Keyboard', 'A 75% layout keyboard with hot-swappable brown switches, dual-shot PBT keycaps, and a solid aluminum chassis for the ultimate typing feel.', 120.00, 'Technology', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', NULL, 12, 4.6, 0, 'Active'),
('prod-5', 'Ceramic Coffee Dripper Set', 'A premium V60 ceramic dripper paired with a matching double-walled glass server. Engineered for steady thermal insulation and precise extraction.', 48.00, 'Lifestyle', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', NULL, 30, 4.5, 0, 'Active'),
('prod-6', 'Solid Brass Desk Organizer', 'Hefty, beautiful, and functional. Holds pens, stationery, and cards while adding a timeless architectural accent to your workspace.', 65.00, 'Lifestyle', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80', NULL, 5, 4.4, 0, 'Active'),
('prod-7', 'Merino Wool Beanie', 'Knit from ultra-soft, ethically-sourced extrafine merino wool. Offers incredible warmth, natural breathability, and an adaptable cuffed fit.', 35.00, 'Apparel', 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=600&q=80', NULL, 40, 4.8, 0, 'Active'),
('prod-8', 'Saddle Leather Wallet', 'A slim, front-pocket cardholder with 4 slots and a central cash pocket. Ages beautifully, developing a deep, unique patina over time.', 55.00, 'Accessories', 'https://images.unsplash.com/photo-1627124118123-24d4b78b004c?auto=format&fit=crop&w=600&q=80', NULL, 18, 4.7, 0, 'Active'),
('prod-9', 'Heritage Cotton Overshirt', 'Tailored from heavy 100% organic cotton twill. Designed to work as a versatile layer between seasons with double chest patch utility pockets.', 85.00, 'Apparel', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80', NULL, 14, 4.6, 1, 'Active');

INSERT INTO customers (id, name, email, join_date, total_orders, total_spent, status) VALUES
('cust-1', 'Sarah Jenkins', 'sarah.j@example.com', '2026-02-14', 3, 493.00, 'Active'),
('cust-2', 'Marcus Chen', 'marcus.chen@example.com', '2026-03-01', 1, 145.00, 'Active'),
('cust-3', 'Elena Rostova', 'elena.r@example.com', '2026-04-10', 2, 103.00, 'Active'),
('cust-4', 'Devon Carter', 'devon.c@example.com', '2026-05-20', 1, 189.00, 'Active'),
('cust-5', 'Aisha Bello', 'aisha.b@example.com', '2026-06-15', 0, 0.00, 'Active');

-- -----------------------------------------------------------
-- Promo Codes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(50)    NOT NULL,
  type             ENUM('percentage','flat') NOT NULL DEFAULT 'percentage',
  value            DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  min_order_amount DECIMAL(10,2)  DEFAULT NULL,
  usage_limit      INT            DEFAULT NULL,
  used_count       INT            NOT NULL DEFAULT 0,
  is_active        TINYINT(1)     NOT NULL DEFAULT 1,
  expires_at       DATE           DEFAULT NULL,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO promo_codes (code, type, value, min_order_amount, usage_limit, is_active) VALUES
('WELCOME10', 'percentage', 10.00, NULL, 100, 1),
('AURA20',    'percentage', 20.00, NULL, 50,  1),
('FREESHIP',  'flat',       5.00,  NULL, NULL, 1);

-- -----------------------------------------------------------
-- Shipping Settings (single-row config)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_settings (
  id                     INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipping_fee           DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  free_shipping_threshold DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  is_active              TINYINT(1)    NOT NULL DEFAULT 1,
  updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO shipping_settings (shipping_fee, free_shipping_threshold) VALUES (10.00, 150.00);
