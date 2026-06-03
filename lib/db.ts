import { Pool, type QueryResultRow } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  values: Array<string | number | boolean | null> = [],
) {
  const result = await pool.query<T>(text, values);
  return result;
}
