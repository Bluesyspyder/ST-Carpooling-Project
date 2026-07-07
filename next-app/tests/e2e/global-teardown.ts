import fs from 'fs';
import { teardownE2eFixtures } from './seed';
import { FIXTURES_PATH } from './global-setup';

export default async function globalTeardown() {
  await teardownE2eFixtures();
  if (fs.existsSync(FIXTURES_PATH)) fs.unlinkSync(FIXTURES_PATH);
}
