import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole, jsonError } from "@/lib/server";
import type { Role } from "@/lib/units";

type UpdateOrderBody = {
  status?: "pending" | "approved" | "rejected" | "fulfilled";
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireRole(["seller", "admin"]);
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as UpdateOrderBody | null;

  if (!body?.status) {
    return jsonError("Status is required.");
  }

  if (user.role === "seller") {
    const ownership = await query<{ seller_id: string }>(
      `
        select p.seller_id
        from orders o
        join order_items oi on oi.order_id = o.id
        join products p on p.id = oi.product_id
        where o.id = $1
        limit 1
      `,
      [id],
    );

    if (!ownership.rows[0] || ownership.rows[0].seller_id !== user.id) {
      return jsonError("You can only update your own sales.", 403);
    }
  }

  await query("update orders set status = $1 where id = $2", [body.status, id]);
  return NextResponse.json({ ok: true });
}
