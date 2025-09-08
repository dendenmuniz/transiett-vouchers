import 'dotenv/config';
import { buildApp } from './app/app';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
} else {
  // Secure connection log (user/host/db only)
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`[db] user=${u.username} host=${u.hostname} db=${u.pathname.slice(1)}`);
  } catch {
    console.warn('[db] DATABASE_URL is set but could not be parsed as URL');
  }
}

const app = buildApp(); 
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
