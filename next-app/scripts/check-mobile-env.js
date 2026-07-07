// Guards against shipping a mobile build with no backend URL baked in.
// NEXT_PUBLIC_* vars are inlined at build time, so a build run without
// NEXT_PUBLIC_PROD_API_URL set (e.g. a fresh clone/CI without .env.local)
// would silently produce an APK that can never reach the backend.
const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) vars[match[1]] = (match[2] || '').trim();
  }
  return vars;
}

const envFromFile = readEnvFile(path.join(__dirname, '..', '.env.local'));
const apiUrl = process.env.NEXT_PUBLIC_PROD_API_URL || envFromFile.NEXT_PUBLIC_PROD_API_URL;

if (!apiUrl) {
  console.error(
    '\n[check-mobile-env] NEXT_PUBLIC_PROD_API_URL is not set.\n' +
    'This is required for mobile (Capacitor) builds — without it, the app has no ' +
    'way to reach the backend once packaged, since native builds cannot use relative /api URLs.\n' +
    'Set it in .env.local (or the build environment) before running build:mobile.\n'
  );
  process.exit(1);
}

console.log(`[check-mobile-env] Using backend URL: ${apiUrl}`);
