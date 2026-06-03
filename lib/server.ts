import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import type { Role } from "./units";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
