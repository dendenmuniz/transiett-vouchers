import { config } from 'dotenv';
import { Client } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

function loadEnvForTeardown() {
  const candidates = [
    resolve(__dirname, '../../.env.test'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env.test'),
    resolve(__dirname, '../../../.env')
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      config({ path: file, override: true });
      if (process.env.DEBUG_ENV === '1') {
        // eslint-disable-next-line no-console
        console.log('[globalTeardown] loaded env:', file);
      }
      break;
    }
  }
}

module.exports = async () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return;

  // Reads the saved schema
  const schema = readFileSync(join(__dirname, '.tmp/schema_name'), 'utf-8');

  // Connect to the base DB (without ?schema=)
  const baseConn = baseUrl.split('?')[0];
  const client = new Client({ connectionString: baseConn });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await client.end();
};
