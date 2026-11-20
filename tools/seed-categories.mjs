import { INITIAL_CATEGORY_NAMES, planCategorySeed } from "./category-seed-data.mjs";

// Read local credentials privately; never print request headers, sessions, or passwords.
try { process.loadEnvFile(".env.test.local"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const base = (process.env.NEXT_PUBLIC_API_URL || "https://harglimpublish-backend.onrender.com/api").replace(/\/$/, "");
const apply = process.argv.includes("--apply");
let token;
let refreshToken;
const pause = () => new Promise((resolve) => setTimeout(resolve, 1100));

async function request(path, method = "GET", body) {
  await pause();
  const response = await fetch(`${base}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    // Do not serialize error bodies, which can include request metadata.
    throw new Error(`${method} ${path.split("?")[0]} failed (HTTP ${response.status}). No automatic write retry was attempted.`);
  }
  return payload;
}

async function list(admin) {
  const all = new Map();
  for (const active of admin ? [true, false] : [true]) {
    for (let page = 1; ; page++) {
      const result = await request(`${admin ? "/admin" : ""}/categories?active=${active}&limit=100&page=${page}`);
      const rows = result.data?.categories ?? result.data;
      if (!Array.isArray(rows) || rows.some((row) => typeof row._id !== "string" || typeof row.name !== "string")) throw new Error("Invalid category response; seed aborted.");
      const size = all.size;
      for (const row of rows) all.set(row._id, row);
      const pages = result.pagination?.pages ?? result.data?.pagination?.pages;
      if (pages !== undefined ? page >= pages : rows.length < 100) break;
      if (page > 1000 || size === all.size) throw new Error("Invalid pagination; seed aborted.");
    }
  }
  return [...all.values()];
}

try {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (apply && (!email || !password)) throw new Error("Apply requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD. No categories were changed.");
  if (email && password) {
    const session = await request("/auth/login", "POST", { email, password });
    const data = session.data ?? session;
    token = data.token ?? data.accessToken;
    refreshToken = data.refreshToken;
    if (!token) throw new Error("Login returned no access token.");
    const context = await request("/users/me/context");
    if (context.data?.user?.role !== "admin" || context.data?.capabilities?.canAdminister !== true) throw new Error("An authorized admin session is required.");
  }
  const existing = await list(Boolean(token));
  const plan = planCategorySeed(existing);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", completeAdminInventory: Boolean(token), requested: INITIAL_CATEGORY_NAMES.length, existing: existing.length, ...plan }, null, 2));
  if (!token) console.log("Public-only preview: inactive categories are unverified. No writes performed.");
  if (apply) {
    if (plan.conflicts.length) throw new Error("Existing slug conflicts require admin review. No categories were changed.");
    for (const name of plan.missing) {
      // Re-read to avoid overwriting a category created by another administrator.
      const fresh = planCategorySeed(await list(true));
      if (fresh.conflicts.some((entry) => entry.name === name)) throw new Error("A slug conflict appeared. Seed stopped; previously created categories are preserved.");
      if (!fresh.missing.includes(name)) continue;
      await request("/admin/categories", "POST", { name, active: true });
      console.log(`Created: ${name}`);
    }
    const verified = planCategorySeed(await list(true));
    if (verified.missing.length || verified.conflicts.length) throw new Error("Seed verification is incomplete. Rerun dry-run to inspect remaining categories.");
    console.log("Verified coverage of all 63 requested categories, including approved existing names. Existing IDs and records were preserved; no updates or deletes were sent.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (token && refreshToken) {
    try { await request("/auth/logout", "POST", { refreshToken }); }
    catch { console.error("Seed session logout could not be confirmed."); process.exitCode = 1; }
  }
}
