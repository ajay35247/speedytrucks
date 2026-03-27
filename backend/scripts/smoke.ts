import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..');
const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

function addCheck(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}

function fileContainsSafeContent(relativePath: string, forbidden: RegExp[]) {
  const value = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const match = forbidden.find((pattern) => pattern.test(value));
  return { ok: !match, detail: match ? `Matched forbidden pattern ${match}` : undefined };
}

addCheck('dist/server.js exists', fs.existsSync(path.join(rootDir, 'dist/server.js')));
addCheck('dist/worker.js exists', fs.existsSync(path.join(rootDir, 'dist/worker.js')));

const envCheck = fileContainsSafeContent('src/config/env.ts', [/default\('change-me/i, /default\('postgresql:\/\/postgres:postgres@localhost/i]);
addCheck('backend env config has no unsafe hardcoded production defaults', envCheck.ok, envCheck.detail);

const appCheck = fileContainsSafeContent('src/app.ts', [/cors\(\{ origin: env\.corsOrigin === '\*' \? true/i]);
addCheck('backend app does not silently allow wildcard CORS in production-only path', appCheck.ok, appCheck.detail);

const failures = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} - ${item.name}${item.detail ? ` (${item.detail})` : ''}`);
}

if (failures.length) {
  process.exitCode = 1;
  throw new Error(`Smoke test failed with ${failures.length} issue(s).`);
}

console.log('Smoke checks passed.');
