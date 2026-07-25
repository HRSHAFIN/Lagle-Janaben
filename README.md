# Lagle Janaben

> Gifts that connect Hearts — A full-featured e-commerce web application for a Bangladeshi gift shop.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS v4, Lucide React icons, Motion (Framer Motion v12) |
| **Backend API** | PHP 8+ with PDO (MySQL) |
| **Database** | MySQL / MariaDB (via XAMPP) |
| **Payment Gateway** | SSLCommerz (Bangladesh) |
| **Authentication** | Local (bcrypt) + Google Sign-In |
| **Dev Server** | Express.js 5 with Vite middleware |

## Project Structure

```
Lagle-Janaben/
├── api/                          # PHP REST API backend
│   ├── config/database.php       # PDO MySQL connection + .env loader
│   ├── auth.php                  # Registration, login, logout, Google Sign-In
│   ├── customers.php             # Customer CRM — GET all, PUT status
│   ├── hero_slides.php           # Hero slider CRUD + file upload
│   ├── orders.php                # Order CRUD + items + inventory + customer upsert
│   ├── products.php              # Product CRUD
│   ├── promo_codes.php           # Promo codes CRUD + validation
│   ├── shipping_settings.php     # Shipping fee/threshold config
│   └── sslcommerz/               # SSLCommerz payment handlers
│       ├── initiate.php          # Initiate payment session
│       ├── success.php           # Payment success callback + validation
│       ├── fail.php              # Payment failed page
│       ├── cancel.php            # Payment cancelled page
│       └── order.php             # Fetch order by tran_id
├── assets/.aistudio/             # AI Studio managed assets
├── database/schema.sql           # Full MySQL schema + seed data (7 tables)
├── dist/                         # Vite production build output
├── src/                          # React + TypeScript frontend
│   ├── main.tsx                  # React root mount
│   ├── App.tsx                   # Main app — routing, state, auth, cart, admin
│   ├── types.ts                  # TypeScript interfaces
│   ├── data.ts                   # Initial seed data
│   ├── index.css                 # Tailwind v4 + fonts
│   └── components/
│       ├── AdminDashboard.tsx    # Admin panel (7 tabs: overview, products, orders, customers, promos, shipping, hero)
│       ├── CartDrawer.tsx        # Slide-over cart with promo code support
│       ├── CatalogView.tsx       # Product grid — hero slider, search, filters, pagination
│       ├── CheckoutView.tsx      # Multi-step checkout — COD & SSLCommerz
│       ├── GoogleAuthButton.tsx  # Google one-tap sign-in button
│       ├── Login.tsx             # Login form (email/phone + password)
│       ├── Logo.tsx              # SVG logo component
│       ├── Navbar.tsx            # Sticky header with cart badge, user menu
│       ├── ProductDetailView.tsx # Product detail with gallery, add-to-cart
│       └── Register.tsx          # Registration with BD phone & password validation
├── uploads/                      # Uploaded hero slider images
├── .env.example                  # Environment variables template
├── .htaccess                     # Apache rewrite rules for PHP API + SPA fallback
├── index.html                    # SPA entry point
├── package.json                  # npm dependencies & scripts
├── server.ts                     # Express + Vite SSR server
├── tsconfig.json                 # TypeScript config
└── vite.config.ts                # Vite build config (React + Tailwind + API proxy)
```

## Features

- **Product Catalog** — Search, category filter, price range, sort, pagination, hero slider
- **Product Detail** — Image gallery, quantity selector, add-to-cart, instant checkout, related products
- **Shopping Cart** — Slide-over drawer, quantity controls, promo codes, real-time totals
- **Checkout** — Multi-step form (Shipping → Payment → Confirmation), COD & SSLCommerz
- **SSLCommerz** — Full payment lifecycle: initiate → gateway → validation → status update
- **Authentication** — Local (BCrypt, BD phone validation) & Google Sign-In, 30-day sessions
- **Admin Dashboard** — 7-tab panel: Overview, Products, Orders, Customers, Promo Codes, Shipping, Hero Slider
- **CRM** — Auto-created customer profiles with order count & total spent
- **Inventory** — Auto-decrement on order, "Out of Stock" status
- **LocalStorage** — Cart & data persistence when API is offline

## Database Schema (7 tables)

`products` | `orders` | `order_items` | `customers` | `users` | `promo_codes` | `hero_slides` | `shipping_settings`

## Getting Started

### Prerequisites

- Node.js 22+
- XAMPP (Apache + MySQL)
- SSLCommerz sandbox account (optional)

### Setup

1. Clone the repo and install dependencies: `npm install`
2. Import `database/schema.sql` into MySQL (create database `lagle_janaben`)
3. Copy `.env.example` to `.env` and fill in your config:
   - MySQL credentials (DB_HOST, DB_USER, DB_PASS, DB_NAME)
   - SSLCommerz credentials (optional for sandbox)
   - Google Sign-In OAuth client ID (optional)
4. Start XAMPP Apache & MySQL
5. Run `npm run dev` for development (Vite + Express on port 3000)
6. Build for production: `npm run build` then `npm start`

The Vite dev server proxies `/api/*` requests to `http://localhost/Lagle-Janaben/api/` (XAMPP/Apache).
