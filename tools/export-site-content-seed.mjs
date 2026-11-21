// Historical command name retained; exports the real backend document without seeding any content.
import { existsSync, writeFileSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const base = process.env.NEXT_PUBLIC_API_URL;
if (!base) throw new Error('Configure NEXT_PUBLIC_API_URL before exporting backend content.');
const response = await fetch(`${base}/content`, { signal: AbortSignal.timeout(45_000) });
if (!response.ok) throw new Error(`Backend content export returned HTTP ${response.status}`);
const payload = await response.json();
writeFileSync(new URL('../api-audit/site-content-export.json', import.meta.url), JSON.stringify(payload.data ?? payload, null, 2) + '\n');
console.log('Exported the live backend document to api-audit/site-content-export.json.');
