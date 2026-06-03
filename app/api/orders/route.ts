import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireRole, jsonError } from "@/lib/server";
import { convertToBaseUnit, type Unit } from "@/lib/units";

type OrderBody = {
  productId?: string;
  requestedQty?: number;
  requestedUnit?: Unit;
  buyerName?: string;
  notes?: string;
};

function parseOrder(row: {
  id: string;
  user_id: string;
  buyer_name: string;
  seller_name: string;
  product_name: string;
  buyer_quantity: string;
  buyer_unit: Unit;
  converted_quantity: string;
  base_unit: Unit;
  rate_per_base_unit: string;
  total_price: string;
  status: string;
}) {
  return {
    id: row.id,
    buyerId: row.user_id,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
    productName: row.product_name,
    buyerQuantity: Number(row.buyer_quantity),
    buyerUnit: row.buyer_unit,
    convertedQuantity: Number(row.converted_quantity),
    baseUnit: row.base_unit,
    ratePerBaseUnit: Number(row.rate_per_base_unit),
    totalPrice: Number(row.total_price),
    status: row.status,
  };
}

export async function GET() {
  const user = await requireRole(["buyer", "seller", "admin"]);

  const baseQuery = `
    select
      o.id,
      o.user_id,
      buyer.name as buyer_name,
      seller.name as seller_name,
      p.name as product_name,
      oi.requested_qty as buyer_quantity,
      oi.requested_unit as buyer_unit,
      oi.base_qty as converted_quantity,
      oi.base_unit,
      oi.unit_price_inr as rate_per_base_unit,
      o.total_inr as total_price,
      o.status
    from orders o
    join users buyer on buyer.id = o.user_id
    join order_items oi on oi.order_id = o.id
    join products p on p.id = oi.product_id
    join users seller on seller.id = p.seller_id
  `;

  const result =
    user.role === "buyer"
      ? await query<{
          id: string;
          user_id: string;
          buyer_name: string;
          seller_name: string;
          product_name: string;
          buyer_quantity: string;
          buyer_unit: Unit;
          converted_quantity: string;
          base_unit: Unit;
          rate_per_base_unit: string;
          total_price: string;
          status: string;
        }>(`${baseQuery} where o.user_id = $1 order by o.created_at desc`, [user.id])
      : user.role === "seller"
        ? await query<{
            id: string;
            user_id: string;
            buyer_name: string;
            seller_name: string;
            product_name: string;
            buyer_quantity: string;
            buyer_unit: Unit;
            converted_quantity: string;
            base_unit: Unit;
            rate_per_base_unit: string;
            total_price: string;
            status: string;
          }>(
            `${baseQuery}
             where p.seller_id = $1
             order by o.created_at desc`,
            [user.id],
          )
        : await query<{
            id: string;
            user_id: string;
            buyer_name: string;
            seller_name: string;
            product_name: string;
            buyer_quantity: string;
            buyer_unit: Unit;
            converted_quantity: string;
            base_unit: Unit;
            rate_per_base_unit: string;
            total_price: string;
            status: string;
          }>(`${baseQuery} order by o.created_at desc`);

  return NextResponse.json({
    orders: result.rows.map(parseOrder),
  });
}

export async function POST(request: Request) {
  const user = await requireRole(["buyer", "admin"]);
  const body = (await request.json().catch(() => null)) as OrderBody | null;

  if (!body?.productId || body.requestedQty === undefined || !body.requestedUnit) {
    return jsonError("Missing order fields.");
  }

  const productResult = await query<{
    id: string;
    seller_id: string;
    name: string;
    base_unit: Unit;
    dimension: "weight" | "volume" | "count";
    inventory_base_qty: string;
    price_per_base_unit_inr: string;
    is_active: boolean;
    seller_name: string;
  }>(
    `
      select
        p.id,
        p.seller_id,
        p.name,
        p.base_unit,
        p.dimension,
        p.inventory_base_qty,
        p.price_per_base_unit_inr,
        p.is_active,
        seller.name as seller_name
      from products p
      join users seller on seller.id = p.seller_id
      where p.id = $1
      limit 1
    `,
    [body.productId],
  );

  const product = productResult.rows[0];
  if (!product || !product.is_active) {
    return jsonError("Product not available.", 404);
  }

  const baseQty = convertToBaseUnit(body.requestedQty, body.requestedUnit, product.base_unit);
  const currentStock = Number(product.inventory_base_qty);

  if (baseQty <= 0 || baseQty > currentStock) {
    return jsonError("Requested quantity exceeds available stock.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const orderResult = await client.query<{
      id: string;
    }>(
      `
        insert into orders (user_id, status, total_inr, notes)
        values ($1, 'pending', $2, $3)
        returning id
      `,
      [user.id, baseQty * Number(product.price_per_base_unit_inr), body.notes ?? null],
    );

    const orderId = orderResult.rows[0].id;
    const lineTotal = baseQty * Number(product.price_per_base_unit_inr);

    await client.query(
      `
        insert into order_items (
          order_id,
          product_id,
          requested_qty,
          requested_unit,
          base_qty,
          base_unit,
          unit_price_inr,
          line_total_inr
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        orderId,
        product.id,
        body.requestedQty,
        body.requestedUnit,
        baseQty,
        product.base_unit,
        Number(product.price_per_base_unit_inr),
        lineTotal,
      ],
    );

    await client.query(
      "update products set inventory_base_qty = inventory_base_qty - $1, updated_at = now() where id = $2",
      [baseQty, product.id],
    );

    await client.query("commit");

    return NextResponse.json({
      orderId,
      productId: product.id,
      sellerName: product.seller_name,
      convertedQuantity: baseQty,
      totalPrice: lineTotal,
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
