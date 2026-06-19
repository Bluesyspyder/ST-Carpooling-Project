import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

const envPaths = [
  fileURLToPath(new URL('../../.env', import.meta.url)),
  fileURLToPath(new URL('../../../server/.env', import.meta.url)),
];

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) continue;

  const parsed = dotenv.parse(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]?.trim() && value?.trim()) {
      process.env[key] = value;
    }
  }
}
