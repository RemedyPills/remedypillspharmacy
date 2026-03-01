import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import * as schema from "../shared/schema";

// IMPORTANT: adjust this import name if your schema exports are different.
// Most templates export `users` table from shared/schema.ts
const { users } = schema as any;

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Set it in Render Environment Variables (or .env locally).",
  );
}

const isProd = process.env.NODE_ENV === "production";

// Render Postgres typically requires SSL.
// Locally, SSL is usually not required.
export const pool = new Pool({
  connectionString,
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

/**
 * Storage layer used by auth.ts/routes.ts
 * (they import: `import { storage } from "./storage";`)
 *
 * If later you add more tables (meds, appointments, etc),
 * add more methods here.
 */
class DatabaseStorage {
  async getUserByUsername(username: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return rows[0] ?? null;
  }

  async getUserById(id: number) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async createUser(userData: any) {
    // userData should match your schema (username, passwordHash, email, etc)
    const rows = await db.insert(users).values(userData).returning();
    return rows[0];
  }

  async updateUser(id: number, patch: any) {
    const rows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return rows[0] ?? null;
  }
}

// ✅ THIS is what auth.ts/routes.ts expect:
export const storage = new DatabaseStorage();
export type { DatabaseStorage };