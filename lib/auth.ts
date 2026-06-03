import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "./units";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const COOKIE_NAME = "aasa_session";

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const payload = base64UrlEncode(JSON.stringify(user));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(payload)) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export function hashPassword(password: string, salt?: string) {
  const passwordSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const derived = crypto
    .pbkdf2Sync(password, passwordSalt, iterations, 64, "sha512")
    .toString("hex");

  return `${iterations}:${passwordSalt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [iterationsRaw, salt, expected] = storedHash.split(":");
  const iterations = Number(iterationsRaw);

  if (!iterations || !salt || !expected) {
    return false;
  }

  const actual = crypto
    .pbkdf2Sync(password, salt, iterations, 64, "sha512")
    .toString("hex");

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
