import {
  type User, type InsertUser,
  type Prescription, type InsertPrescription,
  type Reminder, type InsertReminder,
  type Appointment, type InsertAppointment,
  type Message, type InsertMessage,
  type Notification, type InsertNotification,
  type HealthLog, type InsertHealthLog,
  type CalorieLog, type InsertCalorieLog,
  type AuditLog, type InsertAuditLog,
  type PromoBanner, type InsertPromoBanner,
  users, prescriptions, reminders, appointments, messages, notifications, healthLogs, calorieLogs, auditLogs, promoBanners,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import session from "express-session";
import connectPg from "connect-pg-simple";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phone" | "dob">>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  getPrescriptionsByUser(userId: string): Promise<Prescription[]>;
  getAllPrescriptions(): Promise<Prescription[]>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  createPrescription(p: InsertPrescription): Promise<Prescription>;
  updatePrescriptionStatus(id: string, status: string): Promise<Prescription | undefined>;
  updatePrescription(id: string, data: Partial<Omit<Prescription, "id" | "userId">>): Promise<Prescription | undefined>;
  deletePrescription(id: string): Promise<void>;

  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(r: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, data: Partial<Pick<Reminder, "taken" | "snoozed" | "medicationName" | "time" | "frequency" | "category">>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(a: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined>;
  updateAppointment(id: string, data: Partial<{ service: string; date: string; time: string; notes: string; patientNotes: string }>): Promise<Appointment | undefined>;

  getMessagesByUser(userId: string): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
  createMessage(m: InsertMessage): Promise<Message>;

  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getHealthLogsByUser(userId: string, type?: string): Promise<HealthLog[]>;
  getHealthLog(id: string): Promise<HealthLog | undefined>;
  createHealthLog(h: InsertHealthLog): Promise<HealthLog>;
  deleteHealthLog(id: string): Promise<boolean>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getAllAuditLogs(): Promise<AuditLog[]>;
  updateUserConsent(id: string, consent: boolean): Promise<User | undefined>;
  updateUserLoginTracking(id: string, data: Partial<Pick<User, "lastLoginAt" | "failedLoginAttempts" | "lockedUntil">>): Promise<User | undefined>;

  getActivePromoBanner(): Promise<PromoBanner | undefined>;
  getAllPromoBanners(): Promise<PromoBanner[]>;
  createPromoBanner(b: InsertPromoBanner): Promise<PromoBanner>;
  updatePromoBanner(id: string, data: Partial<Pick<PromoBanner, "title" | "description" | "active">>): Promise<PromoBanner | undefined>;
  deletePromoBanner(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phone" | "dob">>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    return !!deleted;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getPrescriptionsByUser(userId: string): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.userId, userId));
  }

  async getAllPrescriptions(): Promise<Prescription[]> {
    return db.select().from(prescriptions);
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [p] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return p;
  }

  async createPrescription(p: InsertPrescription): Promise<Prescription> {
    const [created] = await db.insert(prescriptions).values(p).returning();
    return created;
  }

  async updatePrescriptionStatus(id: string, status: string): Promise<Prescription | undefined> {
    const [updated] = await db.update(prescriptions).set({ status }).where(eq(prescriptions.id, id)).returning();
    return updated;
  }

  async updatePrescription(id: string, data: Partial<Omit<Prescription, "id" | "userId">>): Promise<Prescription | undefined> {
    const [updated] = await db.update(prescriptions).set(data).where(eq(prescriptions.id, id)).returning();
    return updated;
  }

  async deletePrescription(id: string): Promise<void> {
    await db.delete(prescriptions).where(eq(prescriptions.id, id));
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.userId, userId));
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [r] = await db.select().from(reminders).where(eq(reminders.id, id));
    return r;
  }

  async createReminder(r: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(r).returning();
    return created;
  }

  async updateReminder(id: string, data: Partial<Pick<Reminder, "taken" | "snoozed" | "medicationName" | "time" | "frequency" | "category">>): Promise<Reminder | undefined> {
    const [updated] = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await db.delete(reminders).where(eq(reminders.id, id)).returning();
    return result.length > 0;
  }

  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.userId, userId));
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments);
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.date, date));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, id));
    return a;
  }

  async createAppointment(a: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(a).returning();
    return created;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set({ status }).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async updateAppointment(id: string, data: Partial<{ service: string; date: string; time: string; notes: string; patientNotes: string }>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.userId, userId));
  }

  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages);
  }

  async createMessage(m: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(m).returning();
    return created;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [n] = await db.select().from(notifications).where(eq(notifications.id, id));
    return n;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(n).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getHealthLog(id: string): Promise<HealthLog | undefined> {
    const [l] = await db.select().from(healthLogs).where(eq(healthLogs.id, id));
    return l;
  }

  async getHealthLogsByUser(userId: string, type?: string): Promise<HealthLog[]> {
    if (type) {
      return db.select().from(healthLogs)
        .where(and(eq(healthLogs.userId, userId), eq(healthLogs.type, type)))
        .orderBy(desc(healthLogs.loggedAt));
    }
    return db.select().from(healthLogs)
      .where(eq(healthLogs.userId, userId))
      .orderBy(desc(healthLogs.loggedAt));
  }

  async createHealthLog(h: InsertHealthLog): Promise<HealthLog> {
    const [created] = await db.insert(healthLogs).values(h).returning();
    return created;
  }

  async deleteHealthLog(id: string): Promise<boolean> {
    const result = await db.delete(healthLogs).where(eq(healthLogs.id, id)).returning();
    return result.length > 0;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp));
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  async updateUserConsent(id: string, consent: boolean): Promise<User | undefined> {
    const [updated] = await db.update(users).set({
      consentGiven: consent,
      consentDate: consent ? new Date().toISOString() : null,
    }).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserLoginTracking(id: string, data: Partial<Pick<User, "lastLoginAt" | "failedLoginAttempts" | "lockedUntil">>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getCalorieLogsByUser(userId: string): Promise<CalorieLog[]> {
    return db.select().from(calorieLogs).where(eq(calorieLogs.userId, userId)).orderBy(desc(calorieLogs.loggedAt));
  }

  async createCalorieLog(log: InsertCalorieLog): Promise<CalorieLog> {
    const [created] = await db.insert(calorieLogs).values(log).returning();
    return created;
  }

  async deleteCalorieLog(id: string): Promise<boolean> {
    const result = await db.delete(calorieLogs).where(eq(calorieLogs.id, id)).returning();
    return result.length > 0;
  }

  async getActivePromoBanner(): Promise<PromoBanner | undefined> {
    const [banner] = await db.select().from(promoBanners).where(eq(promoBanners.active, true)).orderBy(desc(promoBanners.createdAt)).limit(1);
    return banner;
  }

  async getAllPromoBanners(): Promise<PromoBanner[]> {
    return db.select().from(promoBanners).orderBy(desc(promoBanners.createdAt));
  }

  async createPromoBanner(b: InsertPromoBanner): Promise<PromoBanner> {
    const [created] = await db.insert(promoBanners).values(b).returning();
    return created;
  }

  async updatePromoBanner(id: string, data: Partial<Pick<PromoBanner, "title" | "description" | "active">>): Promise<PromoBanner | undefined> {
    const [updated] = await db.update(promoBanners).set(data).where(eq(promoBanners.id, id)).returning();
    return updated;
  }

  async deletePromoBanner(id: string): Promise<boolean> {
    const result = await db.delete(promoBanners).where(eq(promoBanners.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
