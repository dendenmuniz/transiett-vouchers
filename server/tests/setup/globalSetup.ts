import { config } from 'dotenv';
import { Client } from 'pg';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path';
import { execSync } from 'child_process';

function loadEnvForSetup() {
  const candidates = [
    resolve(__dirname, '../../.env.test'),     // server/.env.test (recomendado)
    resolve(__dirname, '../../.env'),          // server/.env
    resolve(__dirname, '../../../.env.test'),  // repo root (fallback)
    resolve(__dirname, '../../../.env')        // repo root (fallback)
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      config({ path: file, override: true });
      if (process.env.DEBUG_ENV === '1') {
        // eslint-disable-next-line no-console
        console.log('[globalSetup] loaded env:', file);
      }
      break;
    }
  }

  // Fallback: monta DATABASE_URL a partir das variáveis do docker-compose
  if (!process.env.DATABASE_URL) {
    const {
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
      POSTGRES_PORT = '5432'
    } = process.env;
    if (POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
      process.env.DATABASE_URL =
        `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`;
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definido');
  }
}

module.exports = async () => {

  loadEnvForSetup();

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL não definido');
  }

  const schema = `test_${Date.now()}_${randomUUID().slice(0,8)}`.replace(/-/g, '_');

  // Create the schema in the base DB (without ?schema=)
  const client = new Client({ connectionString: baseUrl.split('?')[0] });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
  await client.end();

  // Adjust DATABASE_URL to point to the test schema
  const urlWithSchema = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}schema=${schema}`;
  process.env.DATABASE_URL = urlWithSchema;

  process.env.PG_SCHEMA = schema;

  // Aplica o schema do Prisma dentro do schema de teste
  execSync('npx prisma db push', { stdio: 'inherit' });

  // Persists schema name for teardown
  mkdirSync(join(__dirname, '.tmp'), { recursive: true });
  writeFileSync(join(__dirname, '.tmp/schema_name'), schema, 'utf-8');
};
