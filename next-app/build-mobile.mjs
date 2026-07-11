import fs from 'fs';
import { execSync } from 'child_process';

const apiPath = './src/app/api';
const tempApiPath = './src/app/_api';

try {
  // 1. Hide API routes from static export (they belong on the server, not in the mobile app)
  if (fs.existsSync(apiPath)) {
    fs.renameSync(apiPath, tempApiPath);
    console.log('Temporarily hiding API routes for mobile export...');
  }
  
  // Clear the Next.js cache so it doesn't crash looking for the old API routes
  if (fs.existsSync('./.next')) {
    fs.rmSync('./.next', { recursive: true, force: true });
    console.log('Cleared Next.js cache.');
  }

  // 2. Run the static export build
  execSync('npx cross-env BUILD_MODE=export next build', { stdio: 'inherit' });
  
} catch (error) {
  console.error('Mobile build failed!', error.message);
} finally {
  // 3. Always restore API routes, even if the build fails
  if (fs.existsSync(tempApiPath)) {
    fs.renameSync(tempApiPath, apiPath);
    console.log('Restored API routes.');
  }
}
