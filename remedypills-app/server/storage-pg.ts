import "dotenv/config";
import pg from "pg";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql } from "drizzle-orm";

import * as schema from "../shared/schema";
import type {
  InsertUser,
  User,
  InsertAuditLog,
  Prescription,
  Reminder,
  Appointment,
  Message,
  HealthLog,
  CalorieLog,
  PromoBanner,
  AuditLog,
} from "../shared/schema";

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
  // -------- Prescriptions --------
  async getPrescriptionsByUser(userId: string): Promise<Prescription[]> {
    const rows = await db.select().from(schema.prescriptions).where(eq(schema.prescriptions.userId, userId));
    return rows as any;
  },

  async getPrescription(id: string): Promise<Prescription | null> {
    const rows = await db.select().from(schema.prescriptions).where(eq(schema.prescriptions.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async createPrescription(data: any) {
    const rows = await db.insert(schema.prescriptions).values(data).returning();
    return rows[0] as any;
  },

  async updatePrescriptionStatus(id: string, status: string) {
    const rows = await db.update(schema.prescriptions).set({ status }).where(eq(schema.prescriptions.id, id)).returning();
    return rows[0] as any;
  },

  async updatePrescription(id: string, patch: Partial<any>) {
    const rows = await db.update(schema.prescriptions).set(patch).where(eq(schema.prescriptions.id, id)).returning();
    return rows[0] as any;
  },

  async deletePrescription(id: string) {
    await db.delete(schema.prescriptions).where(eq(schema.prescriptions.id, id));
    return true;
  },

  // -------- Reminders --------
  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    const rows = await db.select().from(schema.reminders).where(eq(schema.reminders.userId, userId));
    return rows as any;
  },

  async createReminder(data: any) {
    const rows = await db.insert(schema.reminders).values(data).returning();
    return rows[0] as any;
  },

  async getReminder(id: string) {
    const rows = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async updateReminder(id: string, patch: Partial<any>) {
    const rows = await db.update(schema.reminders).set(patch).where(eq(schema.reminders.id, id)).returning();
    return rows[0] as any;
  },

  async deleteReminder(id: string) {
    await db.delete(schema.reminders).where(eq(schema.reminders.id, id));
    return true;
  },

  // -------- Appointments --------
  async getAppointmentsByDate(date: string) {
    const rows = await db.select().from(schema.appointments).where(eq(schema.appointments.date, date));
    return rows as any;
  },

  async getAppointmentsByUser(userId: string) {
    const rows = await db.select().from(schema.appointments).where(eq(schema.appointments.userId, userId));
    return rows as any;
  },

  async createAppointment(data: any) {
    const rows = await db.insert(schema.appointments).values(data).returning();
    return rows[0] as any;
  },

  async getAppointment(id: string) {
    const rows = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async updateAppointmentStatus(id: string, status: string) {
    const rows = await db.update(schema.appointments).set({ status }).where(eq(schema.appointments.id, id)).returning();
    return rows[0] as any;
  },

  async updateAppointment(id: string, patch: Partial<any>) {
    const rows = await db.update(schema.appointments).set(patch).where(eq(schema.appointments.id, id)).returning();
    return rows[0] as any;
  },

  // -------- Messages --------
  async getMessagesByUser(userId: string) {
    const rows = await db.select().from(schema.messages).where(eq(schema.messages.userId, userId)).orderBy(sql`timestamp DESC`);
    return rows as any;
  },

  async createMessage(data: any) {
    const rows = await db.insert(schema.messages).values(data).returning();
    return rows[0] as any;
  },

  // -------- Notifications --------
  async getNotificationsByUser(userId: string) {
    const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(sql`created_at DESC`);
    return rows as any;
  },

  async getNotification(id: string) {
    const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async markNotificationRead(id: string) {
    const rows = await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.id, id)).returning();
    return rows[0] as any;
  },

  async markAllNotificationsRead(userId: string) {
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.userId, userId));
    return true;
  },

  // -------- Health Logs --------
  async getHealthLogsByUser(userId: string, type?: string) {
    const q = db.select().from(schema.healthLogs).where(eq(schema.healthLogs.userId, userId));
    // drizzle doesn't allow conditional where in a chain easily, so run filter in JS if needed
    let rows: any[] = await q;
    if (type) rows = rows.filter(r => r.type === type);
    return rows as any;
  },

  async createHealthLog(data: any) {
    const rows = await db.insert(schema.healthLogs).values(data).returning();
    return rows[0] as any;
  },

  async getHealthLog(id: string) {
    const rows = await db.select().from(schema.healthLogs).where(eq(schema.healthLogs.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async deleteHealthLog(id: string) {
    await db.delete(schema.healthLogs).where(eq(schema.healthLogs.id, id));
    return true;
  },

  // -------- Calorie Logs --------
  async getCalorieLogsByUser(userId: string) {
    const rows = await db.select().from(schema.calorieLogs).where(eq(schema.calorieLogs.userId, userId)).orderBy(sql`logged_at DESC`);
    return rows as any;
  },

  async createCalorieLog(data: any) {
    const rows = await db.insert(schema.calorieLogs).values(data).returning();
    return rows[0] as any;
  },

  async getCalorieLog(id: string) {
    const rows = await db.select().from(schema.calorieLogs).where(eq(schema.calorieLogs.id, id)).limit(1);
    return (rows[0] ?? null) as any;
  },

  async deleteCalorieLog(id: string) {
    await db.delete(schema.calorieLogs).where(eq(schema.calorieLogs.id, id));
    return true;
  },

  // -------- Promo Banners --------
  async createPromoBanner(data: any) {
    const rows = await db.insert(schema.promoBanners).values(data).returning();
    return rows[0] as any;
  },

  async getPromoBanners() {
    const rows = await db.select().from(schema.promoBanners).orderBy(sql`created_at DESC`);
    return rows as any;
  },

  async updatePromoBanner(id: string, patch: Partial<any>) {
    const rows = await db.update(schema.promoBanners).set(patch).where(eq(schema.promoBanners.id, id)).returning();
    return rows[0] as any;
  },

  async deletePromoBanner(id: string) {
    await db.delete(schema.promoBanners).where(eq(schema.promoBanners.id, id));
    return true;
  },

  // -------- Admin helpers --------
  async getAllUsers() {
    const rows = await db.select().from(schema.users);
    return rows as any;
  },

  async deleteUser(id: string) {
    await db.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  },

  async getAllPrescriptions() {
    const rows = await db.select().from(schema.prescriptions);
    return rows as any;
  },

  async getAllAppointments() {
    const rows = await db.select().from(schema.appointments);
    return rows as any;
  },

  async getAllMessages() {
    const rows = await db.select().from(schema.messages);
    return rows as any;
  },

  async createNotification(data: any) {
    const rows = await db.insert(schema.notifications).values(data).returning();
    return rows[0] as any;
  },

  async getAllAuditLogs() {
    const rows = await db.select().from(schema.auditLogs);
    return rows as any;
  },

  async getActivePromoBanner() {
    const rows = await db
      .select()
      .from(schema.promoBanners)
      .where(eq(schema.promoBanners.active, true))
      .orderBy(sql`created_at DESC`)
      .limit(1);
    return (rows[0] ?? null) as any;
  },

  async getAllPromoBanners() {
    const rows = await db.select().from(schema.promoBanners);
    return rows as any;
  },

  // -------- Bulk deletion (for EU data deletion requests) --------
  async deleteAllPrescriptionsByUser(userId: string) {
    await db.delete(schema.prescriptions).where(eq(schema.prescriptions.userId, userId));
    return true;
  },

  async deleteAllRemindersByUser(userId: string) {
    await db.delete(schema.reminders).where(eq(schema.reminders.userId, userId));
    return true;
  },

  async deleteAllAppointmentsByUser(userId: string) {
    await db.delete(schema.appointments).where(eq(schema.appointments.userId, userId));
    return true;
  },

  async deleteAllMessagesByUser(userId: string) {
    await db.delete(schema.messages).where(eq(schema.messages.userId, userId));
    return true;
  },

  async deleteAllNotificationsByUser(userId: string) {
    await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
    return true;
  },

  async deleteAllHealthLogsByUser(userId: string) {
    await db.delete(schema.healthLogs).where(eq(schema.healthLogs.userId, userId));
    return true;
  },

  async deleteAllCalorieLogsByUser(userId: string) {
    await db.delete(schema.calorieLogs).where(eq(schema.calorieLogs.userId, userId));
    return true;
  },
};
