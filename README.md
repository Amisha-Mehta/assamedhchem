# AasaMedChem Inventory System

A small inventory, seller listing, buyer ordering, and admin oversight app built with Next.js, Neon PostgreSQL, and Vercel deployment in mind.

## Features

- Role-based authentication for buyer, seller, and admin.
- Buyer signup and login, with admin accounts issued only from the backend.
- Buyer panel to search and filter products in real time, then place quotations or orders.
- Buyer request flow when no product matches, so admins can see which buyer requested which product.
- Seller panel to list products with name, SKU, quantity, unit dimension, stock, and INR pricing.
- Seller panel to view their own published listings immediately after saving them.
- Seller sales panel to view buyer orders for their own products.
- Admin panel to search all products and sellers, create listings for any seller, edit or deactivate listings, review all orders, and review buyer product requests.
- Flexible quantities in `g`, `kg`, `mL`, `L`, and `unit`.
- Signed HTTP-only session cookie and PBKDF2 password hashes.
- Neon-backed API routes for auth, products, orders, and product requests.

## Tech Stack And Design

- Frontend and backend: Next.js App Router with React Server Components and route handlers.
- Database: Neon-hosted PostgreSQL via `@neondatabase/serverless`.
- Auth: email/password login, PBKDF2 password hashes, signed cookie sessions.
- Deployment: Vercel with `DATABASE_URL` and `AUTH_SECRET` environment variables.
- API route handlers validate roles, normalize units, calculate prices, and persist orders, listings, and product requests in PostgreSQL.
- Buyer requests are stored in a dedicated `product_requests` table and displayed in the admin dashboard.

## Database Schema

### `users`

- `id` UUID primary key
- `name` text
- `email` text unique
- `role` text check (`admin`, `seller`, `buyer`)
- `password_hash` text

### `products`

- `id` UUID primary key
- `seller_id` UUID references `users(id)`
- `sku` text unique
- `name` text
- `category` text
- `description` text
- `dimension` text check (`weight`, `volume`, `count`)
- `base_unit` text check (`g`, `mL`, `unit`)
- `inventory_base_qty` numeric(30,12)
- `price_per_base_unit_inr` numeric(30,12)
- `is_active` boolean

### `orders`

- `id` UUID primary key
- `user_id` UUID references `users(id)` as the buyer
- `status` text check (`pending`, `approved`, `rejected`, `fulfilled`)
- `total_inr` numeric(30,12)
- `notes` text

### `product_requests`

- `id` UUID primary key
- `buyer_id` UUID references `users(id)`
- `buyer_name` text
- `buyer_email` text
- `requested_product_name` text
- `requested_category` text
- `notes` text
- `status` text check (`open`, `reviewed`, `fulfilled`, `dismissed`)

### `order_items`

- `product_id` UUID references `products(id)`
- `requested_qty` numeric(30,12)
- `requested_unit` text check (`g`, `kg`, `mL`, `L`, `unit`)
- `base_qty` numeric(30,12)
- `base_unit` text check (`g`, `mL`, `unit`)
- `unit_price_inr` numeric(30,12)
- `line_total_inr` numeric(30,12)

`numeric(30,12)` is used for quantities and prices to support large values and high decimal precision without floating-point storage errors.

## Unit Storage And Conversion Strategy

Internal storage uses one base unit per dimension:

- Weight: grams (`g`)
- Volume: milliliters (`mL`)
- Count: items (`unit`)

Conversion factors:

- `1 kg = 1000 g`
- `1 L = 1000 mL`
- `1 unit = 1 unit`

Prices are stored as INR per base unit:

- Weight products: price per `g`
- Volume products: price per `mL`
- Count products: price per `unit`

Conversions happen in `app/api/orders/route.ts` during order placement:

- Buyer enters `requestedQty` and `requestedUnit`.
- The route validates the unit against the product dimension.
- Quantity converts to `base_qty`.
- `line_total_inr = base_qty * price_per_base_unit_inr`.
- Requested and base values are both stored for seller/admin audit.

In the current UI, the same conversion logic is applied during order preview and again when an order is submitted so the displayed total matches the stored data.

## Local Setup

```bash
npm install
copy .env.example .env
```

Before `npm run db:seed`, put your Neon connection string and secret in `.env`:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
AUTH_SECRET="a-long-random-secret"
```

Then initialize the database and start the app:

```bash
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Demo Credentials

- Admin: `admin@aasamedchem.test` / `Admin@123`
- Seller: `seller@aasamedchem.test` / `Seller@123`
- Buyer: `buyer@aasamedchem.test` / `Buyer@123`

## Login Policy

- The login page now supports both login and signup.
- Signup is available only for buyer and seller.
- Admin access is backend-seeded only and cannot be selected in the signup form.
- Passwords must include uppercase, lowercase, a number, a special character, and at least 8 characters.

## Role Flows

- Buyer: Login with a buyer email and land directly on the Buyer Dashboard to search products, choose quantities and units, and place a quotation or order.
- Seller: Login with a seller email and land directly on the Seller Dashboard to create product listings, manage active stock, view their published listings, and view sales requests.
- Admin: Login with an admin email and land directly on the Admin Dashboard to search all products and sellers, create or edit any seller listing, deactivate listings, and review all orders and statuses.
- Buyer product requests that do not match any result are sent to admin with the buyer name and requested product.
- Buyers can enter smaller divisible quantities like `100 g` for a `1 kg` rate and the app will convert to the internal base unit before pricing.

Example: ordering `2 kg` of a weight product converts to `2000 g`; if the product rate is `INR 0.85/g`, the line total is `INR 1,700.00`.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
4. Deploy.
5. Run `npm run db:seed` locally against the same Neon database, or visit the deployed app once to let schema initialization run.

## Current Build

The current app is wired to Neon-backed endpoints for login, signup, product listings, order placement, product requests, and admin edits. The browser UI is still the same polished dashboard experience, but the data now comes from the database instead of in-memory placeholders.
