import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole, jsonError } from "@/lib/server";
import { unitsByDimension, type ProductDimension, type Unit } from "@/lib/units";

function parseProduct(row: {
  id: string;
  seller_id: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  dimension: ProductDimension;
  base_unit: Unit;
  inventory_base_qty: string;
  price_per_base_unit_inr: string;
  is_active: boolean;
  seller_name?: string;
}) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name ?? "",
    sku: row.sku,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
    listedBy: row.seller_name ?? "",
    dimension: row.dimension,
    baseUnit: row.base_unit,
    availableQuantity: Number(row.inventory_base_qty),
    pricePerBaseUnit: Number(row.price_per_base_unit_inr),
    isActive: row.is_active,
  };
}

export async function GET() {
  const user = await requireRole(["buyer", "seller", "admin"]);

  const baseQuery = `
    select
      p.id,
      p.seller_id,
      p.sku,
      p.name,
      p.category,
      p.description,
      p.dimension,
      p.base_unit,
      p.inventory_base_qty,
      p.price_per_base_unit_inr,
      p.is_active,
      u.name as seller_name
    from products p
    join users u on u.id = p.seller_id
  `;

  const result =
    user.role === "buyer"
      ? await query<{
          id: string;
          seller_id: string;
          sku: string;
          name: string;
          category: string;
          description: string | null;
          dimension: ProductDimension;
          base_unit: Unit;
          inventory_base_qty: string;
          price_per_base_unit_inr: string;
          is_active: boolean;
          seller_name?: string;
        }>(
          `${baseQuery}
           where p.is_active = true
           order by p.created_at desc`,
        )
      : user.role === "seller"
        ? await query<{
            id: string;
            seller_id: string;
            sku: string;
            name: string;
            category: string;
            description: string | null;
            dimension: ProductDimension;
            base_unit: Unit;
            inventory_base_qty: string;
            price_per_base_unit_inr: string;
            is_active: boolean;
            seller_name?: string;
          }>(
            `${baseQuery}
             where p.seller_id = $1
             order by p.created_at desc`,
            [user.id],
          )
        : await query<{
            id: string;
            seller_id: string;
            sku: string;
            name: string;
            category: string;
            description: string | null;
            dimension: ProductDimension;
            base_unit: Unit;
            inventory_base_qty: string;
            price_per_base_unit_inr: string;
            is_active: boolean;
            seller_name?: string;
          }>(`${baseQuery} order by p.created_at desc`);

  return NextResponse.json({
    products: result.rows.map(parseProduct),
  });
}

type CreateProductBody = {
  sellerEmail?: string;
  sku?: string;
  name?: string;
  category?: string;
  description?: string;
  dimension?: ProductDimension;
  baseUnit?: Unit;
  availableQuantity?: number;
  pricePerBaseUnit?: number;
  isActive?: boolean;
};

export async function POST(request: Request) {
  const user = await requireRole(["seller", "admin"]);
  const body = (await request.json().catch(() => null)) as CreateProductBody | null;

  if (!body?.name || !body.sku || !body.category || !body.dimension || !body.baseUnit) {
    return jsonError("Missing product fields.");
  }

  if (!unitsByDimension[body.dimension].includes(body.baseUnit)) {
    return jsonError("Base unit does not match the selected dimension.");
  }

  const sellerId =
    user.role === "admin" && body.sellerEmail
      ? (
          await query<{ id: string }>(
            "select id from users where lower(email)=lower($1) and role in ('seller','admin') limit 1",
            [body.sellerEmail],
          )
        ).rows[0]?.id ?? user.id
      : user.id;

  const result = await query(
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
      returning id
    `,
    [
      sellerId,
      body.sku,
      body.name,
      body.category,
      body.description ?? "",
      body.dimension,
      body.baseUnit,
      body.availableQuantity ?? 0,
      body.pricePerBaseUnit ?? 0,
      body.isActive ?? true,
    ],
  );

  return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
}
