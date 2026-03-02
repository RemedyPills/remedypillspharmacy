import "dotenv/config";
import pg from "pg";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import * as schema from "../shared/schema";
import type { InsertUser, User, InsertAuditLog } from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Set it in Render Environment Variables (or .env locally).",
  );
}

const isProd = process.env.NODE_ENV === "production";

// Render Postgres usually needs SSL; local Postgres usually doesn't.
export const pool = new Pool({
  connectionString,
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

// Drizzle DB
export const db = drizzle(pool, { schema });

// Session store (Postgres-backed)
// IMPORTANT FIX:
// - createTableIfMissing MUST be false in production builds on Render,
//   because connect-pg-simple tries to read a table.sql file at runtime,
//   which breaks after bundling (esbuild) and causes ENOENT.
const PgSession = connectPg(session);

export const sessionStore = new PgSession({
  pool,
  tableName: "session",
  createTableIfMissing: false,
});

// What the rest of your app imports:
export const storage = {
  sessionStore,

  // -------- Users --------
  async getUser(id: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async getUserById(id: string): Promise<User | null> {
    return this.getUser(id);
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return rows[0] ?? null;
  },

  async getUserByProvider(provider: string, providerId: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.provider, provider), eq(schema.users.providerId, providerId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async createUser(data: InsertUser): Promise<User> {
    const rows = await db.insert(schema.users).values(data).returning();
    return rows[0];
  },

  async updateUser(id: string, patch: Partial<User>): Promise<User | null> {
    const rows = await db
      .update(schema.users)
      .set(patch)
      .where(eq(schema.users.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async updateUserLoginTracking(
    id: string,
    patch: Partial<Pick<User, "failedLoginAttempts" | "lockedUntil" | "lastLoginAt">>,
  ): Promise<User | null> {
    return this.updateUser(id, patch as any);
  },

  async updateUserConsent(id: string, consentGiven: boolean): Promise<User | null> {
    const patch: Partial<User> = {
      consentGiven,
      consentDate: consentGiven ? new Date().toISOString() : null,
    };
    return this.updateUser(id, patch);
  },

  // -------- Audit Logs --------
  async createAuditLog(data: InsertAuditLog) {
    const rows = await db.insert(schema.auditLogs).values(data).returning();
    return rows[0];
  },
};