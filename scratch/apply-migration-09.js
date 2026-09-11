const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function applyMigration() {
  // Try local postgres default connection
  const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/09_enforce_status_via_medical_reviews.sql'), 'utf8');

  // Connection options for local supabase
  const connectionStrings = [
    process.env.DATABASE_URL,
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  ].filter(Boolean);

  let applied = false;
  for (const conn of connectionStrings) {
    const client = new Client({ connectionString: conn });
    try {
      await client.connect();
      console.log(`Connected with ${conn}`);
      await client.query(sql);
      console.log('Migration 09 applied successfully!');
      applied = true;
      await client.end();
      break;
    } catch (e) {
      console.log(`Failed on ${conn}:`, e.message);
      try { await client.end(); } catch (_) {}
    }
  }

  if (!applied) {
    console.error('Could not connect to postgres directly.');
    process.exit(1);
  }
}

applyMigration();
