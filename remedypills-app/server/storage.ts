import "dotenv/config";
import Database from "better-sqlite3";
import session from "express-session";
import { randomUUID } from "crypto";
import type { User, Prescription, Reminder, Appointment, Message, HealthLog, CalorieLog, PromoBanner, AuditLog } from "../shared/schema";

// SQLite database for local development
const dbPath = process.env.SQLITE_DB_PATH || "./remedypills-local.db";
const sqliteDb = new Database(dbPath);
sqliteDb.pragma("journal_mode = WAL");

// Initialize tables
sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    email TEXT,
    phone TEXT,
    dob TEXT,
    role TEXT NOT NULL DEFAULT 'patient',
    provider TEXT DEFAULT 'local',
    provider_id TEXT,
    consent_given INTEGER NOT NULL DEFAULT 0,
    consent_date TEXT,
    last_login_at TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    strength TEXT NOT NULL,
    directions TEXT NOT NULL,
    rx_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    last_fill_date TEXT NOT NULL,
    refillable INTEGER NOT NULL DEFAULT 1,
    refill_count INTEGER NOT NULL DEFAULT 0,
    auto_refill INTEGER NOT NULL DEFAULT 0,
    pickup_time TEXT,
    family_member_name TEXT
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    time TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily',
    taken INTEGER NOT NULL DEFAULT 0,
    snoozed INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'general'
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    patient_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS health_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    secondary_value REAL,
    unit TEXT NOT NULL,
    notes TEXT,
    logged_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calorie_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    food_items TEXT NOT NULL,
    total_calories REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL,
    fiber REAL,
    image_url TEXT,
    notes TEXT,
    logged_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promo_banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
  );
`);

// Helper functions
function toUser(row: any): User | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    email: row.email,
    phone: row.phone,
    dob: row.dob,
    role: row.role,
    provider: row.provider,
    providerId: row.provider_id,
    consentGiven: !!row.consent_given,
    consentDate: row.consent_date,
    lastLoginAt: row.last_login_at,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
  } as User;
}

function toPrescription(row: any): Prescription | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    strength: row.strength,
    directions: row.directions,
    rxNumber: row.rx_number,
    status: row.status,
    lastFillDate: row.last_fill_date,
    refillable: !!row.refillable,
    refillCount: row.refill_count,
    autoRefill: !!row.auto_refill,
    pickupTime: row.pickup_time,
    familyMemberName: row.family_member_name,
  } as Prescription;
}

function toReminder(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    medicationName: row.medication_name,
    time: row.time,
    frequency: row.frequency,
    taken: !!row.taken,
    snoozed: !!row.snoozed,
    category: row.category,
  };
}

function toAppointment(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    service: row.service,
    date: row.date,
    time: row.time,
    status: row.status,
    notes: row.notes,
    patientNotes: row.patient_notes,
  };
}

function toMessage(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    sender: row.sender,
    text: row.text,
    timestamp: row.timestamp,
    category: row.category,
  };
}

function toNotification(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: !!row.read,
    createdAt: row.created_at,
    metadata: row.metadata,
  };
}

function toHealthLog(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    value: row.value,
    secondaryValue: row.secondary_value,
    unit: row.unit,
    notes: row.notes,
    loggedAt: row.logged_at,
  };
}

function toCalorieLog(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    mealType: row.meal_type,
    foodItems: row.food_items,
    totalCalories: row.total_calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    imageUrl: row.image_url,
    notes: row.notes,
    loggedAt: row.logged_at,
  };
}

function toPromoBanner(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

function toAuditLog(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    details: row.details,
    ipAddress: row.ip_address,
    timestamp: row.timestamp,
  };
}

// SQLite session store
class SQLiteSessionStore extends session.Store {
  get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const row = sqliteDb.prepare("SELECT sess FROM sessions WHERE sid = ? AND expire > ?").get(sid, Date.now());
      if (row) {
        callback(null, JSON.parse((row as any).sess));
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      const maxAge = session.cookie?.maxAge || 86400000;
      const expire = Date.now() + maxAge;
      sqliteDb.prepare("INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)").run(sid, JSON.stringify(session), expire);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    try {
      sqliteDb.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, session: any, callback?: (err?: any) => void) {
    this.set(sid, session, callback);
  }
}

export const sessionStore = new SQLiteSessionStore();

export const storage = {
  sessionStore,

  // -------- Users --------
  async getUser(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return toUser(row);
  },

  async getUserById(id: string) {
    return this.getUser(id);
  },

  async getUserByUsername(username: string) {
    const row = sqliteDb.prepare("SELECT * FROM users WHERE username = ?").get(username);
    return toUser(row);
  },

  async getUserByProvider(provider: string, providerId: string) {
    const row = sqliteDb.prepare("SELECT * FROM users WHERE provider = ? AND provider_id = ?").get(provider, providerId);
    return toUser(row);
  },

  async createUser(data: any): Promise<User> {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO users (id, username, password, name, email, phone, dob, role, provider, provider_id, consent_given, consent_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.username, data.password, data.name || '', data.email, data.phone, data.dob,
      data.role || 'patient', data.provider || 'local', data.providerId, data.consentGiven ? 1 : 0, data.consentDate
    );
    const user = await this.getUser(id);
    if (!user) throw new Error("Failed to create user");
    return user;
  },

  async updateUser(id: string, patch: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (patch.name !== undefined) { fields.push("name = ?"); values.push(patch.name); }
    if (patch.email !== undefined) { fields.push("email = ?"); values.push(patch.email); }
    if (patch.phone !== undefined) { fields.push("phone = ?"); values.push(patch.phone); }
    if (patch.dob !== undefined) { fields.push("dob = ?"); values.push(patch.dob); }
    if (patch.consentGiven !== undefined) { fields.push("consent_given = ?"); values.push(patch.consentGiven ? 1 : 0); }
    if (patch.consentDate !== undefined) { fields.push("consent_date = ?"); values.push(patch.consentDate); }
    if (patch.lastLoginAt !== undefined) { fields.push("last_login_at = ?"); values.push(patch.lastLoginAt); }
    if (patch.failedLoginAttempts !== undefined) { fields.push("failed_login_attempts = ?"); values.push(patch.failedLoginAttempts); }
    if (patch.lockedUntil !== undefined) { fields.push("locked_until = ?"); values.push(patch.lockedUntil); }
    
    if (fields.length > 0) {
      values.push(id);
      sqliteDb.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getUser(id);
  },

  async updateUserLoginTracking(id: string, patch: any) {
    return this.updateUser(id, patch);
  },

  async updateUserConsent(id: string, consentGiven: boolean) {
    return this.updateUser(id, {
      consentGiven,
      consentDate: consentGiven ? new Date().toISOString() : null,
    });
  },

  // -------- Audit Logs --------
  async createAuditLog(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.action, data.details, data.ipAddress, data.timestamp);
    const row = sqliteDb.prepare("SELECT * FROM audit_logs WHERE id = ?").get(id);
    return toAuditLog(row);
  },

  async getAllAuditLogs() {
    const rows = sqliteDb.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC").all();
    return rows.map(toAuditLog);
  },

  // -------- Prescriptions --------
  async getPrescriptionsByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM prescriptions WHERE user_id = ?").all(userId);
    return rows.map(toPrescription);
  },

  async getPrescription(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM prescriptions WHERE id = ?").get(id);
    return toPrescription(row);
  },

  async createPrescription(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO prescriptions (id, user_id, name, strength, directions, rx_number, status, last_fill_date, refillable, refill_count, auto_refill, pickup_time, family_member_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.userId, data.name, data.strength, data.directions, data.rxNumber,
      data.status || 'active', data.lastFillDate, data.refillable ? 1 : 0, data.refillCount || 0,
      data.autoRefill ? 1 : 0, data.pickupTime, data.familyMemberName
    );
    return this.getPrescription(id);
  },

  async updatePrescriptionStatus(id: string, status: string) {
    sqliteDb.prepare("UPDATE prescriptions SET status = ? WHERE id = ?").run(status, id);
    return this.getPrescription(id);
  },

  async updatePrescription(id: string, patch: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (patch.status !== undefined) { fields.push("status = ?"); values.push(patch.status); }
    if (patch.autoRefill !== undefined) { fields.push("auto_refill = ?"); values.push(patch.autoRefill ? 1 : 0); }
    if (patch.pickupTime !== undefined) { fields.push("pickup_time = ?"); values.push(patch.pickupTime); }
    if (patch.familyMemberName !== undefined) { fields.push("family_member_name = ?"); values.push(patch.familyMemberName); }
    if (patch.name !== undefined) { fields.push("name = ?"); values.push(patch.name); }
    if (patch.strength !== undefined) { fields.push("strength = ?"); values.push(patch.strength); }
    if (patch.directions !== undefined) { fields.push("directions = ?"); values.push(patch.directions); }
    if (patch.rxNumber !== undefined) { fields.push("rx_number = ?"); values.push(patch.rxNumber); }
    if (patch.lastFillDate !== undefined) { fields.push("last_fill_date = ?"); values.push(patch.lastFillDate); }
    if (patch.refillCount !== undefined) { fields.push("refill_count = ?"); values.push(patch.refillCount); }
    if (patch.refillable !== undefined) { fields.push("refillable = ?"); values.push(patch.refillable ? 1 : 0); }
    
    if (fields.length > 0) {
      values.push(id);
      sqliteDb.prepare(`UPDATE prescriptions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getPrescription(id);
  },

  async deletePrescription(id: string) {
    sqliteDb.prepare("DELETE FROM prescriptions WHERE id = ?").run(id);
    return true;
  },

  async getAllPrescriptions() {
    const rows = sqliteDb.prepare("SELECT * FROM prescriptions").all();
    return rows.map(toPrescription);
  },

  // -------- Reminders --------
  async getRemindersByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM reminders WHERE user_id = ?").all(userId);
    return rows.map(toReminder);
  },

  async getReminder(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
    return toReminder(row);
  },

  async createReminder(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO reminders (id, user_id, medication_name, time, frequency, taken, snoozed, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.medicationName, data.time, data.frequency || 'daily', data.taken ? 1 : 0, data.snoozed ? 1 : 0, data.category || 'general');
    return this.getReminder(id);
  },

  async updateReminder(id: string, patch: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (patch.medicationName !== undefined) { fields.push("medication_name = ?"); values.push(patch.medicationName); }
    if (patch.time !== undefined) { fields.push("time = ?"); values.push(patch.time); }
    if (patch.frequency !== undefined) { fields.push("frequency = ?"); values.push(patch.frequency); }
    if (patch.taken !== undefined) { fields.push("taken = ?"); values.push(patch.taken ? 1 : 0); }
    if (patch.snoozed !== undefined) { fields.push("snoozed = ?"); values.push(patch.snoozed ? 1 : 0); }
    if (patch.category !== undefined) { fields.push("category = ?"); values.push(patch.category); }
    
    if (fields.length > 0) {
      values.push(id);
      sqliteDb.prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getReminder(id);
  },

  async deleteReminder(id: string) {
    sqliteDb.prepare("DELETE FROM reminders WHERE id = ?").run(id);
    return true;
  },

  // -------- Appointments --------
  async getAppointmentsByDate(date: string) {
    const rows = sqliteDb.prepare("SELECT * FROM appointments WHERE date = ?").all(date);
    return rows.map(toAppointment);
  },

  async getAppointmentsByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM appointments WHERE user_id = ?").all(userId);
    return rows.map(toAppointment);
  },

  async getAppointment(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    return toAppointment(row);
  },

  async createAppointment(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO appointments (id, user_id, service, date, time, status, notes, patient_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.service, data.date, data.time, data.status || 'upcoming', data.notes, data.patientNotes);
    return this.getAppointment(id);
  },

  async updateAppointmentStatus(id: string, status: string) {
    sqliteDb.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    return this.getAppointment(id);
  },

  async updateAppointment(id: string, patch: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (patch.service !== undefined) { fields.push("service = ?"); values.push(patch.service); }
    if (patch.date !== undefined) { fields.push("date = ?"); values.push(patch.date); }
    if (patch.time !== undefined) { fields.push("time = ?"); values.push(patch.time); }
    if (patch.status !== undefined) { fields.push("status = ?"); values.push(patch.status); }
    if (patch.notes !== undefined) { fields.push("notes = ?"); values.push(patch.notes); }
    if (patch.patientNotes !== undefined) { fields.push("patient_notes = ?"); values.push(patch.patientNotes); }
    
    if (fields.length > 0) {
      values.push(id);
      sqliteDb.prepare(`UPDATE appointments SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getAppointment(id);
  },

  async getAllAppointments() {
    const rows = sqliteDb.prepare("SELECT * FROM appointments").all();
    return rows.map(toAppointment);
  },

  // -------- Messages --------
  async getMessagesByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp DESC").all(userId);
    return rows.map(toMessage);
  },

  async createMessage(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO messages (id, user_id, sender, text, timestamp, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.sender, data.text, data.timestamp, data.category);
    return { id, ...data };
  },

  async getAllMessages() {
    const rows = sqliteDb.prepare("SELECT * FROM messages").all();
    return rows.map(toMessage);
  },

  // -------- Notifications --------
  async getNotificationsByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    return rows.map(toNotification);
  },

  async getNotification(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
    return toNotification(row);
  },

  async createNotification(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, read, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.type, data.title, data.body, data.read ? 1 : 0, data.createdAt, data.metadata);
    return this.getNotification(id);
  },

  async markNotificationRead(id: string) {
    sqliteDb.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
    return this.getNotification(id);
  },

  async markAllNotificationsRead(userId: string) {
    sqliteDb.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
    return true;
  },

  // -------- Health Logs --------
  async getHealthLogsByUser(userId: string, type?: string) {
    let rows;
    if (type) {
      rows = sqliteDb.prepare("SELECT * FROM health_logs WHERE user_id = ? AND type = ? ORDER BY logged_at DESC").all(userId, type);
    } else {
      rows = sqliteDb.prepare("SELECT * FROM health_logs WHERE user_id = ? ORDER BY logged_at DESC").all(userId);
    }
    return rows.map(toHealthLog);
  },

  async getHealthLog(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM health_logs WHERE id = ?").get(id);
    return toHealthLog(row);
  },

  async createHealthLog(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO health_logs (id, user_id, type, value, secondary_value, unit, notes, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.type, data.value, data.secondaryValue, data.unit, data.notes, data.loggedAt);
    return this.getHealthLog(id);
  },

  async deleteHealthLog(id: string) {
    sqliteDb.prepare("DELETE FROM health_logs WHERE id = ?").run(id);
    return true;
  },

  // -------- Calorie Logs --------
  async getCalorieLogsByUser(userId: string) {
    const rows = sqliteDb.prepare("SELECT * FROM calorie_logs WHERE user_id = ? ORDER BY logged_at DESC").all(userId);
    return rows.map(toCalorieLog);
  },

  async getCalorieLog(id: string) {
    const row = sqliteDb.prepare("SELECT * FROM calorie_logs WHERE id = ?").get(id);
    return toCalorieLog(row);
  },

  async createCalorieLog(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO calorie_logs (id, user_id, meal_type, food_items, total_calories, protein, carbs, fat, fiber, image_url, notes, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.userId, data.mealType, data.foodItems, data.totalCalories, data.protein, data.carbs, data.fat, data.fiber, data.imageUrl, data.notes, data.loggedAt);
    return this.getCalorieLog(id);
  },

  async deleteCalorieLog(id: string) {
    sqliteDb.prepare("DELETE FROM calorie_logs WHERE id = ?").run(id);
    return true;
  },

  // -------- Promo Banners --------
  async getActivePromoBanner() {
    const row = sqliteDb.prepare("SELECT * FROM promo_banners WHERE active = 1 ORDER BY created_at DESC LIMIT 1").get();
    return toPromoBanner(row);
  },

  async getAllPromoBanners() {
    const rows = sqliteDb.prepare("SELECT * FROM promo_banners ORDER BY created_at DESC").all();
    return rows.map(toPromoBanner);
  },

  async createPromoBanner(data: any) {
    const id = randomUUID();
    sqliteDb.prepare(`
      INSERT INTO promo_banners (id, title, description, active, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.title, data.description, data.active ? 1 : 0, data.createdAt);
    const row = sqliteDb.prepare("SELECT * FROM promo_banners WHERE id = ?").get(id);
    return toPromoBanner(row);
  },

  async updatePromoBanner(id: string, patch: any) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (patch.title !== undefined) { fields.push("title = ?"); values.push(patch.title); }
    if (patch.description !== undefined) { fields.push("description = ?"); values.push(patch.description); }
    if (patch.active !== undefined) { fields.push("active = ?"); values.push(patch.active ? 1 : 0); }
    
    if (fields.length > 0) {
      values.push(id);
      sqliteDb.prepare(`UPDATE promo_banners SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    const row = sqliteDb.prepare("SELECT * FROM promo_banners WHERE id = ?").get(id);
    return toPromoBanner(row);
  },

  async deletePromoBanner(id: string) {
    sqliteDb.prepare("DELETE FROM promo_banners WHERE id = ?").run(id);
    return true;
  },

  // -------- Admin helpers --------
  async getAllUsers() {
    const rows = sqliteDb.prepare("SELECT * FROM users").all();
    return rows.map(toUser);
  },

  async deleteUser(id: string) {
    sqliteDb.prepare("DELETE FROM users WHERE id = ?").run(id);
    return true;
  },

  // -------- Bulk deletion --------
  async deleteAllPrescriptionsByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM prescriptions WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllRemindersByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM reminders WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllAppointmentsByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM appointments WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllMessagesByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM messages WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllNotificationsByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllHealthLogsByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM health_logs WHERE user_id = ?").run(userId);
    return true;
  },

  async deleteAllCalorieLogsByUser(userId: string) {
    sqliteDb.prepare("DELETE FROM calorie_logs WHERE user_id = ?").run(userId);
    return true;
  },
};

// For compatibility with existing code
export const db = sqliteDb;
export const pool = null;
