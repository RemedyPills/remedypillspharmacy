-- Migration to adjust the session.expire column to a proper timestamptz type
-- and ensure that connect-pg-simple can compare it to the current timestamp.

-- If the session table already exists with a text column for expire, convert it.
ALTER TABLE IF EXISTS "session"
  ALTER COLUMN "expire" TYPE timestamptz
    USING "expire"::timestamptz;

-- For new installs, the following statement will create the table with the correct
-- types. (connect-pg-simple typically does this automatically, but we control it
-- through migrations to avoid runtime errors during build/bundling.)

--
-- CREATE TABLE "session" (
--   "sid" varchar PRIMARY KEY,
--   "sess" text NOT NULL,
--   "expire" timestamptz NOT NULL
-- );
--

-- Additional date/time columns are left as-is; they can be migrated separately
-- if you want to convert them from text to timestamptz in the future.
