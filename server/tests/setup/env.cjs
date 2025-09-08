const { config } = require('dotenv');
const { resolve } = require('path');
const { existsSync, readFileSync } = require('fs');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const candidates = [
  resolve(__dirname, '../../.env.test'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env.test'),
  resolve(__dirname, '../../../.env'),
];

for (const file of candidates) {
  if (existsSync(file)) {
    config({ path: file, override: true });
    if (process.env.DEBUG_ENV === '1') {
      console.log('[env] loaded:', file);
    }
    break;
  }
}

try {
  const schemaFile = resolve(__dirname, './.tmp/schema_name');
  if (existsSync(schemaFile) && process.env.DATABASE_URL) {
    const schema = readFileSync(schemaFile, 'utf-8').trim();
    const base = process.env.DATABASE_URL;
    const sep = base.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${base}${sep}schema=${schema}`;
    if (process.env.DEBUG_ENV === '1') {
      console.log('[env] schema:', schema);
      console.log('[env] DATABASE_URL:', process.env.DATABASE_URL);
    }
  }
} catch {}
