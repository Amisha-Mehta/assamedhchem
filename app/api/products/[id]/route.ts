import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole, jsonError } from "@/lib/server";
import { unitsByDimension, type ProductDimension, type Unit } from "@/lib/units";

type UpdateProductBody = Partial<{
  sku: string;
  name: string;
  category: string;
  description: string;
  dimension: ProductDimension;
  baseUnit: Unit;
  availableQuantity: number;
  pricePerBaseUnit: number;
  isActive: boolean;
}>;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireRole(["seller", "admin"]);
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as UpdateProductBody | null;

  if (!body) {
    return jsonError("Invalid request body.");
  }

  const existing = await query<{
    seller_id: string;
    dimension: ProductDimension;
  }>("select seller_id, dimension from products where id = $1 limit 1", [id]);

  const product = existing.rows[0];
  if (!product) {
    return jsonError("Product not found.", 404);
  }

  if (user.role === "seller" && product.seller_id !== user.id) {
    return jsonError("You can only edit your own products.", 403);
  }

  if (body.dimension && body.baseUnit && !unitsByDimension[body.dimension].includes(body.baseUnit)) {
    return jsonError("Base unit does not match the selected dimension.");
  }

  const updates: string[] = [];
  const values: Array<string | number | boolean> = [];

  function push(field: string, value: string | number | boolean) {
    values.push(value);
    updates.push(`${field} = $${values.length}`);
  }

  if (body.sku) push("sku", body.sku);
  if (body.name) push("name", body.name);
  if (body.category) push("category", body.category);
  if (body.description !== undefined) push("description", body.description);
  if (body.dimension) push("dimension", body.dimension);
  if (body.baseUnit) push("base_unit", body.baseUnit);
  if (body.availableQuantity !== undefined) push("inventory_base_qty", body.availableQuantity);
  if (body.pricePerBaseUnit !== undefined) push("price_per_base_unit_inr", body.pricePerBaseUnit);
  if (body.isActive !== undefined) push("is_active", body.isActive);

  if (!updates.length) {
    return jsonError("No changes provided.");
  }

  updates.push("updated_at = now()");
  values.push(id);

  await query(
    `update products set ${updates.join(", ")} where id = $${values.length}`,
    values,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireRole(["admin"]);
  void user;
  const { id } = await params;

  await query("delete from products where id = $1", [id]);
  return NextResponse.json({ ok: true });
}
