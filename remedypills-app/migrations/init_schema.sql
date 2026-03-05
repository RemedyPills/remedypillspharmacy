-- RemedyPills Pharmacy Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  dob TEXT,
  role TEXT NOT NULL DEFAULT 'patient',
  provider TEXT DEFAULT 'local',
  provider_id TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TEXT,
  last_login_at TEXT,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  strength TEXT NOT NULL,
  directions TEXT NOT NULL,
  rx_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_fill_date TEXT NOT NULL,
  refillable BOOLEAN NOT NULL DEFAULT true,
  refill_count INTEGER NOT NULL DEFAULT 0,
  auto_refill BOOLEAN NOT NULL DEFAULT false,
  pickup_time TEXT,
  family_member_name TEXT
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  medication_name TEXT NOT NULL,
  time TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  taken BOOLEAN NOT NULL DEFAULT false,
  snoozed BOOLEAN NOT NULL DEFAULT false,
  category TEXT DEFAULT 'general'
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  notes TEXT,
  patient_notes TEXT
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  category TEXT
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL,
  metadata TEXT
);

-- Health Logs table
CREATE TABLE IF NOT EXISTS health_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  secondary_value REAL,
  unit TEXT NOT NULL,
  notes TEXT,
  logged_at TEXT NOT NULL
);

-- Calorie Logs table
CREATE TABLE IF NOT EXISTS calorie_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
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

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  timestamp TEXT NOT NULL
);

-- Promo Banners table
CREATE TABLE IF NOT EXISTS promo_banners (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL
);

-- Session table (for express-session with connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR PRIMARY KEY,
  sess TEXT NOT NULL,
  expire TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index on session expire for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_user ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_calorie_logs_user ON calorie_logs(user_id);

-- Grant permissions (Supabase handles this automatically, but good for reference)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
