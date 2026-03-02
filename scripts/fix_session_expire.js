const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Export it before running this script.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Altering session.expire to timestamptz (if present)...');
    const sql = `ALTER TABLE IF EXISTS "session"\n  ALTER COLUMN "expire" TYPE timestamptz\n    USING "expire"::timestamptz;`;
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Done. Column converted (if it existed).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error running ALTER TABLE:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
