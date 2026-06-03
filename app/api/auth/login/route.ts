import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/server";
import type { Role } from "@/lib/units";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null;

  if (!body?.email || !body.password) {
    return jsonError("Email and password are required.");
  }

  const result = await query<{
    id: string;
    name: string;
    email: string;
    role: Role;
    password_hash: string;
  }>(
    "select id, name, email, role, password_hash from users where lower(email) = lower($1) limit 1",
    [body.email],
  );

  const user = result.rows[0];

  if (!user || !verifyPassword(body.password, user.password_hash)) {
    return jsonError("Invalid email or password.", 401);
  }

  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
