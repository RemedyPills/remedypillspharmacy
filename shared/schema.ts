import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull().default(""),
  email: text("email"),
  phone: text("phone"),
  dob: text("dob"),
  role: text("role").notNull().default("patient"),
  provider: text("provider").default("local"),
  providerId: text("provider_id"),
  consentGiven: boolean("consent_given").notNull().default(false),
  consentDate: text("consent_date"),
  lastLoginAt: text("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  strength: text("strength").notNull(),
  directions: text("directions").notNull(),
  rxNumber: text("rx_number").notNull(),
  status: text("status").notNull().default("active"),
  lastFillDate: text("last_fill_date").notNull(),
  refillable: boolean("refillable").notNull().default(true),
  refillCount: integer("refill_count").notNull().default(0),
  autoRefill: boolean("auto_refill").notNull().default(false),
  pickupTime: text("pickup_time"),
  familyMemberName: text("family_member_name"),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  medicationName: text("medication_name").notNull(),
  time: text("time").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  taken: boolean("taken").notNull().default(false),
  snoozed: boolean("snoozed").notNull().default(false),
  category: text("category").default("general"),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  service: text("service").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("upcoming"),
  notes: text("notes"),
  patientNotes: text("patient_notes"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  timestamp: text("timestamp").notNull(),
  category: text("category"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: text("created_at").notNull(),
  metadata: text("metadata"),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const healthLogs = pgTable("health_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  value: real("value").notNull(),
  secondaryValue: real("secondary_value"),
  unit: text("unit").notNull(),
  notes: text("notes"),
  loggedAt: text("logged_at").notNull(),
});

export const insertHealthLogSchema = createInsertSchema(healthLogs).omit({ id: true });
export type InsertHealthLog = z.infer<typeof insertHealthLogSchema>;
export type HealthLog = typeof healthLogs.$inferSelect;

export const calorieLogs = pgTable("calorie_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  mealType: text("meal_type").notNull(),
  foodItems: text("food_items").notNull(),
  totalCalories: real("total_calories").notNull(),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  fiber: real("fiber"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  loggedAt: text("logged_at").notNull(),
});

export const insertCalorieLogSchema = createInsertSchema(calorieLogs).omit({ id: true });
export type InsertCalorieLog = z.infer<typeof insertCalorieLogSchema>;
export type CalorieLog = typeof calorieLogs.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  timestamp: text("timestamp").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const promoBanners = pgTable("promo_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertPromoBannerSchema = createInsertSchema(promoBanners).omit({ id: true });
export type InsertPromoBanner = z.infer<typeof insertPromoBannerSchema>;
export type PromoBanner = typeof promoBanners.$inferSelect;
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true, mode: "date" }).notNull(),
});

export const insertSessionSchema = createInsertSchema(session);
export type SessionRow = typeof session.$inferSelect;