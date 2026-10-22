// Writes the frontend's built-in Site Content defaults to api-audit/site-content-seed.json, the
// document the backend seeds GET /content with (BACKEND_ALIGNMENT_REPORT.md §3).
// Run: node tools/export-site-content-seed.mjs
import { createJiti } from "jiti";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": root }, jsx: true });
const { defaultSiteContent } = await jiti.import("../context/site-content-context.tsx");

// adminProfileImage is admin-only, not site content.
const seed = { ...defaultSiteContent };
delete seed.adminProfileImage;
writeFileSync(new URL("../api-audit/site-content-seed.json", import.meta.url), JSON.stringify(seed, null, 2) + "\n");
console.log(`Wrote ${Object.keys(seed).length} keys to api-audit/site-content-seed.json`);
