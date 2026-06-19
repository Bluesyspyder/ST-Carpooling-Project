/**
 * Migration: Grandfather existing users as email-verified
 *
 * Run once after deploying the isEmailVerified field:
 *   node server/scripts/migrate-verify-existing-users.js
 *
 * Sets isEmailVerified = true for all users where it is null/undefined (existing accounts).
 * New users registered after this migration will start with isEmailVerified = false
 * and must verify via email link.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/carpool';

const run = async () => {
  console.log('[MIGRATION] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('[MIGRATION] Connected.');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Update all users where isEmailVerified is not explicitly set to true/false
  const result = await users.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  console.log(`[MIGRATION] Done. Grandfathered ${result.modifiedCount} existing user(s) as email-verified.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[MIGRATION] Error:', err);
  process.exit(1);
});
