-- Fix session table column types for connect-pg-simple
-- This migration ensures the session table has the correct column types
-- Run this if you see "operator does not exist: text >= timestamp with time zone"

-- Drop the session table if it exists (will be recreated by connect-pg-simple)
DROP TABLE IF EXISTS "session" CASCADE;

-- Create the session table with correct types
-- IMPORTANT: Use timestamp (without timezone) - NOT timestamptz
-- connect-pg-simple expects timestamp(6) without timezone
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" text NOT NULL COLLATE "default",
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);

-- Create index on expire for faster cleanup of expired sessions
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

