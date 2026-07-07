// Mobile (Capacitor) builds use `output: 'export'`, which produces a purely
// static bundle with no server runtime. The src/app/api/** Route Handlers
// depend on runtime request data (query params, auth headers, DB access) and
// can never be statically prerendered — Next.js now hard-fails the export
// build unless every route opts into force-static, which isn't meaningful
// here since the mobile app never calls these routes anyway (it calls the
// deployed backend via NEXT_PUBLIC_PROD_API_URL, see src/services/api.js).
// So: exclude src/app/api from the tree for the duration of the export build.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const apiDirBackup = path.join(__dirname, '..', '.mobile-build-api-backup');

function restore() {
  if (fs.existsSync(apiDirBackup) && !fs.existsSync(apiDir)) {
    fs.renameSync(apiDirBackup, apiDir);
  }
}

// Defensive: a previous run may have crashed mid-way and left the backup in place.
restore();

if (!fs.existsSync(apiDir)) {
  console.error('[build-mobile] src/app/api not found — nothing to exclude, aborting.');
  process.exit(1);
}

fs.renameSync(apiDir, apiDirBackup);

try {
  execSync('cross-env BUILD_MODE=export next build', { stdio: 'inherit' });
} finally {
  restore();
}
