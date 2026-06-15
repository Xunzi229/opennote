const { execSync } = require('child_process');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const shouldBumpVersion =
  args.includes('--bump-version') ||
  args.includes('-b') ||
  process.env.BUMP_VERSION === '1';

if (shouldBumpVersion) {
  require('./bump-version.cjs');
}

const run = (command) => {
  execSync(command, { stdio: 'inherit', cwd: ROOT });
};

run('tsc -b');
run('vite build');
run('vite build --config vite.extension.config.ts');
