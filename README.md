# AasaMedChem Inventory Assignment

This project is being built as a small inventory and order management system for the AasaMedChem assignment.

The first working step focuses on the most important part of the assignment: how a seller lists products, how a buyer selects a product, and how the website clearly converts units before calculating the INR price.

## Current Step

- Seller side sample product listing.
- Buyer side order preview.
- Supported units: `g`, `kg`, `mL`, `L`, and `unit`.
- Visible conversion before price calculation.
- INR price formatting.
- Stock availability check after conversion.

## Unit Strategy

For this first version, the conversion rule is intentionally simple and easy to verify:

- Weight products are calculated in grams.
- Volume products are calculated in milliliters.
- Count products are calculated in units.
- `1 kg = 1000 g`
- `1 L = 1000 mL`

Example:

If Sodium Chloride is priced at `₹1.85 / g` and the buyer enters `2 kg`, the system converts the order to `2000 g` and calculates `2000 * 1.85`.

## How To Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open this URL in the browser:

```text
http://localhost:3000
```

## Next Step

The next step should be adding real product creation for the seller/admin panel. After that, we can connect the product data to PostgreSQL on Neon.
