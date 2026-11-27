import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: '.env.test',
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing from the test environment.',
  );
}

const envPath = resolve(process.cwd(), '.env.test');

if (existsSync(envPath)) {
    config({ path: envPath });
}
