import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/server";
import { isValidStrongPassword } from "@/lib/units";
import type { Role } from "@/lib/units";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
};

const allowedSignupRoles: Exclude<Role, "admin">[] = ["buyer", "seller"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignupBody | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const role = body?.role;

  if (!name) {
    return jsonError("Full name is required.");
  }

  if (!email) {
    return jsonError("Email is required.");
  }

  if (!password) {
    return jsonError("Password is required.");
  }

  if (!isValidStrongPassword(password)) {
    return jsonError(
      "Password must have upper case, lower case, a number, a special character, and at least 8 characters.",
    );
  }

  if (!role || !allowedSignupRoles.includes(role as Exclude<Role, "admin">)) {
    return jsonError("Only buyer and seller accounts can be created here.");
  }

  const existing = await query<{ id: string }>(
    "select id from users where lower(email) = lower($1) limit 1",
    [email],
  );

  if (existing.rows.length > 0) {
    return jsonError("An account with this email already exists.", 409);
  }

  const inserted = await query<{
    id: string;
    name: string;
    email: string;
    role: Role;
  }>(
    `
      insert into users (name, email, role, password_hash)
      values ($1, $2, $3, $4)
      returning id, name, email, role
    `,
    [name, email, role, hashPassword(password)],
  );

  const user = inserted.rows[0];

  await setSessionCookie(user);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
