import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const envPath = path.join(rootDir, ".env");
const envFile = await fs.readFile(envPath, "utf8").catch(() => "");

for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
    continue;
  }

  const [key, ...rest] = trimmed.split("=");
  if (!process.env[key]) {
    process.env[key] = rest.join("=");
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

function hashPassword(password, salt) {
  const iterations = 120000;
  const passwordSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .pbkdf2Sync(password, passwordSalt, iterations, 64, "sha512")
    .toString("hex");

  return `${iterations}:${passwordSalt}:${derived}`;
}

async function main() {
  const schemaPath = path.join(rootDir, "db", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  const users = [
    {
      name: "Admin",
      email: "admin@aasamedchem.test",
      role: "admin",
      password: "Admin@123",
    },
    {
      name: "Seller",
      email: "seller@aasamedchem.test",
      role: "seller",
      password: "Seller@123",
    },
    {
      name: "Buyer",
      email: "buyer@aasamedchem.test",
      role: "buyer",
      password: "Buyer@123",
    },
  ];

  const upsertedUsers = new Map();

  for (const user of users) {
    const result = await pool.query(
      `
        insert into users (name, email, role, password_hash)
        values ($1, $2, $3, $4)
        on conflict (email)
        do update set
          name = excluded.name,
          role = excluded.role,
          password_hash = excluded.password_hash
        returning id, email
      `,
      [user.name, user.email, user.role, hashPassword(user.password)],
    );

    upsertedUsers.set(user.email, result.rows[0].id);
  }

  const sellerId = upsertedUsers.get("seller@aasamedchem.test");

  const starterProducts = [
    {
      sku: "CHEM-SODIUM-CHLORIDE-001",
      name: "Sodium Chloride",
      category: "Laboratory Chemical",
      description: "High purity laboratory grade salt.",
      dimension: "weight",
      base_unit: "g",
      inventory_base_qty: "25000",
      price_per_base_unit_inr: "1.85",
      is_active: true,
    },
    {
      sku: "SOLV-ETHANOL-0999-001",
      name: "Ethanol 99.9%",
      category: "Solvent",
      description: "General purpose solvent for lab use.",
      dimension: "volume",
      base_unit: "mL",
      inventory_base_qty: "18000",
      price_per_base_unit_inr: "0.72",
      is_active: true,
    },
    {
      sku: "PACK-VIAL-001",
      name: "Glass Vial Pack",
      category: "Consumable",
      description: "Pack of laboratory glass vials.",
      dimension: "count",
      base_unit: "unit",
      inventory_base_qty: "420",
      price_per_base_unit_inr: "24",
      is_active: true,
    },
  ];

  for (const product of starterProducts) {
    await pool.query(
      `
        insert into products (
          seller_id,
          sku,
          name,
          category,
          description,
          dimension,
          base_unit,
          inventory_base_qty,
          price_per_base_unit_inr,
          is_active
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (sku)
        do update set
          seller_id = excluded.seller_id,
          name = excluded.name,
          category = excluded.category,
          description = excluded.description,
          dimension = excluded.dimension,
          base_unit = excluded.base_unit,
          inventory_base_qty = excluded.inventory_base_qty,
          price_per_base_unit_inr = excluded.price_per_base_unit_inr,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [
        sellerId,
        product.sku,
        product.name,
        product.category,
        product.description,
        product.dimension,
        product.base_unit,
        product.inventory_base_qty,
        product.price_per_base_unit_inr,
        product.is_active,
      ],
    );
  }

  console.log("Database schema ensured and seed data written.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
