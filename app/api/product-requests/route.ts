import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { jsonError, requireRole } from "@/lib/server";

type ProductRequestBody = {
  requestedProductName?: string;
  requestedCategory?: string;
  notes?: string;
};

type ProductRequestRow = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  requested_product_name: string;
  requested_category: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

async function ensureTable() {
  await query(`
    create table if not exists product_requests (
      id uuid primary key default gen_random_uuid(),
      buyer_id uuid not null references users(id) on delete cascade,
      buyer_name text not null,
      buyer_email text not null,
      requested_product_name text not null,
      requested_category text,
      notes text,
      status text not null default 'open' check (status in ('open', 'reviewed', 'fulfilled', 'dismissed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

export async function GET() {
  const user = await requireRole(["buyer", "seller", "admin"]);
  await ensureTable();

  const result =
    user.role === "buyer"
      ? await query<ProductRequestRow>(
          `
            select
              id,
              buyer_id,
              buyer_name,
              buyer_email,
              requested_product_name,
              requested_category,
              notes,
              status,
              created_at,
              updated_at
            from product_requests
            where buyer_id = $1
            order by created_at desc
          `,
          [user.id],
        )
      : user.role === "admin"
        ? await query<ProductRequestRow>(
            `
              select
                id,
                buyer_id,
                buyer_name,
                buyer_email,
                requested_product_name,
                requested_category,
                notes,
                status,
                created_at,
                updated_at
              from product_requests
              order by created_at desc
            `,
          )
        : await query<ProductRequestRow>(
            `
              select
                id,
                buyer_id,
                buyer_name,
                buyer_email,
                requested_product_name,
                requested_category,
                notes,
                status,
                created_at,
                updated_at
              from product_requests
              where false
            `,
          );

  return NextResponse.json({
    requests: result.rows.map((row) => ({
      id: row.id,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      requestedProductName: row.requested_product_name,
      requestedCategory: row.requested_category ?? "",
      notes: row.notes ?? "",
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireRole(["buyer"]);
  await ensureTable();

  const body = (await request.json().catch(() => null)) as ProductRequestBody | null;
  const requestedProductName = body?.requestedProductName?.trim();
  const requestedCategory = body?.requestedCategory?.trim() ?? "";
  const notes = body?.notes?.trim() ?? "";

  if (!requestedProductName) {
    return jsonError("Product name is required.");
  }

  const result = await query<ProductRequestRow>(
    `
      insert into product_requests (
        buyer_id,
        buyer_name,
        buyer_email,
        requested_product_name,
        requested_category,
        notes,
        status
      )
      values ($1, $2, $3, $4, $5, $6, 'open')
      returning id, buyer_id, buyer_name, buyer_email, requested_product_name, requested_category, notes, status, created_at, updated_at
    `,
    [user.id, user.name, user.email, requestedProductName, requestedCategory || null, notes || null],
  );

  const row = result.rows[0];

  return NextResponse.json(
    {
      request: {
        id: row.id,
        buyerId: row.buyer_id,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        requestedProductName: row.requested_product_name,
        requestedCategory: row.requested_category ?? "",
        notes: row.notes ?? "",
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    },
    { status: 201 },
  );
}
