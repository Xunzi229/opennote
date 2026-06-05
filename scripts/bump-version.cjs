const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const PKG_PATH = resolve(ROOT, 'package.json');
const MANIFEST_PATH = resolve(ROOT, 'public', 'manifest.json');

// Read package.json
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const oldVersion = pkg.version;

// Parse and bump version (patch level)
const parts = oldVersion.split('.').map(Number);
parts[2] = (parts[2] || 0) + 1;
if (parts[1] === undefined) parts[1] = 0;
if (parts[0] === undefined) parts[0] = 1;
const newVersion = parts.join('.');

// Update package.json
pkg.version = newVersion;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// Update manifest.json
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
manifest.version = newVersion;
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

console.log(`Version bumped: v${oldVersion} → v${newVersion}`);
