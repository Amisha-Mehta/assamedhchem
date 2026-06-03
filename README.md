# AasaMedChem Inventory Assignment

This project is being built as a small inventory and order management system for the AasaMedChem assignment.

The current working step focuses on the most important part of the assignment: how a seller lists products, how a buyer selects a product, and how the website clearly converts units before calculating the INR price.

## Current Step

- Seller side sample product listing.
- Seller form for adding a new product from the website.
- Buyer side order preview.
- Supported units: `g`, `kg`, `mL`, `L`, and `unit`.
- Visible conversion before price calculation.
- INR price formatting.
- Stock availability check after conversion.

## How Step 2 Works

The seller can enter:

- Product name.
- Category.
- Product type: weight, volume, or count.
- Stock quantity.
- Base unit.
- Price per base unit in INR.
- Seller name.

After submitting the form, the product is added to the seller listing and also becomes available in the buyer order preview. This keeps the flow clear: the seller lists the product first, then the buyer can select it and see the conversion-based price.

## Unit Strategy

For this first version, the conversion rule is intentionally simple and easy to verify:

- Weight products are calculated in grams.
- Volume products are calculated in milliliters.
- Count products are calculated in units.
- `1 kg = 1000 g`
- `1 L = 1000 mL`

Example:

If Sodium Chloride is priced at `INR 1.85 / g` and the buyer enters `2 kg`, the system converts the order to `2000 g` and calculates `2000 * 1.85`.

## How To Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open this URL in Chrome or Edge:

```text
http://localhost:3000
```

## Suggested Commit Message

```text
Add seller product listing form
```

## Next Step

The next step should be saving products and orders in PostgreSQL on Neon instead of keeping them only in browser state.
