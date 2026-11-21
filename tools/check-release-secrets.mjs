import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Read credentials locally, compare in memory, and never print matched content.
for (const file of ['.env', '.env.production', '.env.local', '.env.test.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const changed = execFileSync('git', ['diff', '--cached', '--no-ext-diff', '--unified=0'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const added = changed.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++')).join('\n');
const matchedKeys = Object.entries(process.env).filter(([key, value]) => !key.startsWith('NEXT_PUBLIC_') && /PASSWORD|SECRET|TOKEN/.test(key) && value && value.length >= 8 && added.includes(value)).map(([key]) => key);
const tokenPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const hasToken = tokenPattern.test(added);
const names = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' }).trim().split('\n');
const unsafeFiles = names.filter((name) => /(?:^|\/)(?:\.env(?:\.(?!example$).*)?|test-suite-results\/|playwright-report\/|test-results\/)/.test(name) && name !== '.env.example');
const passed = !matchedKeys.length && !hasToken && !unsafeFiles.length;
console.log(JSON.stringify({ passed, credentialMatches: matchedKeys, jwtLikeValueFound: hasToken, excludedArtifactsStaged: unsafeFiles }));
if (!passed) process.exitCode = 1;
