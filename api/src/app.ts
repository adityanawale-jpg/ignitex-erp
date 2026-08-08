import dotenv from 'dotenv';
dotenv.config();

import { loadSecretsFromGCP } from './utils/secrets';

// Secrets (DB_PASSWORD, JWT_SECRET) can optionally come from GCP Secret
// Manager instead of the plain-text .env file — see utils/secrets.ts.
// This has to happen, and finish, before anything else is imported: the
// Postgres pool (database/connection.ts, database/prisma.ts) and the
// JWT_SECRET fail-fast check (server.ts) both read process.env at module
// load time, so a static top-level `import './server'` here would run
// before the secret fetch ever got a chance to overwrite those values.
// The dynamic import below is what defers it.
(async () => {
  await loadSecretsFromGCP();
  await import('./server');
})();
