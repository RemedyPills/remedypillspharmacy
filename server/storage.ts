import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "../shared/schema";

const { Pool } = pg;

// Render provides DATABASE_URL in the environment.
// Locally you use .env (which you already have).
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Set it in Render Environment Variables (or .env locally).",
  );
}

const isProd = process.env.NODE_ENV === "production";

// NOTE: Render Postgres often requires SSL.
// This config works for Render + local Postgres.
export const pool = new Pool({
  connectionString,
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

// ✅ This is what seed-admin.ts wants:
export const db = drizzle(pool, { schema });

// If you had other exports/classes in your old storage.ts,
// paste them below this line and refactor them to use `db` above.