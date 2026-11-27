import fs from 'node:fs';

const inventoryPath = process.env.HARGLIM_INVENTORY_PATH || 'test-suite-results/handover-inventory.json';
const contractPath = process.env.HARGLIM_OPENAPI_PATH || 'test-suite-results/handover-openapi-live.json';
const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const spec = read(contractPath);
const source = read(inventoryPath);
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const clean = (value) => value.replace(/\{[^}]+\}/g, '{id}');
const operationKey = (method, path) => `${method} ${clean(path)}`;
const screenRoute = (file) => '/' + file.slice(4, -8).replace(/\([^/]+\)\//g, '').replace(/\/$/, '');
const byOperation = new Map();
const tests = new Map(Object.entries({
  'GET /health/ready': ['Passed', 'Production HTTP 200, READY, connected', 'Public readiness observation'],
  'GET /api/content': ['Passed', 'Production HTTP 200, termsSectionsJson contained an empty array', 'CMS write verification requires staging'],
  'GET /api/publishing-terms': ['Passed', 'Production HTTP 200, exact version 2026-11-26, enforcement disabled', 'Public configuration read'],
  'GET /api/authors/me/publishing-terms': ['Passed', 'Author HTTP 200, no-store, accepted false and requiresAcceptance false', 'Authenticated read only'],
  'POST /api/authors/me/publishing-terms/accept': ['Blocked', 'Contract documented. Unit and browser fixtures are separate from deployed evidence', 'Acceptance persistence requires staging with published terms'],
  'GET /api/admin/shipments/couriers': ['Blocked', 'Production 401 without a session and 403 with an author session', 'Admin response shape and provider selection require authenticated staging'],
  'GET /api/admin/operations/runtime-metrics': ['Blocked', 'Production 401 without a session and 403 with an author session', 'Admin response shape requires an authorized admin session'],
  'GET /api/admin/manual-royalties': ['Blocked', 'Both anonymous queries returned 401. Author access to the filtered variant returned 403', 'Admin author filter and pagination require staging'],
  'POST /api/admin/manual-royalties': ['Blocked', 'Website preflight allowed Idempotency-Key. Swagger still requires bookTitle on each line', 'Verify the handover’s book-ID-only request, same-key replay and replacement after the index migration'],
  'GET /api/authors/me/manual-royalties': ['Passed', 'Configured author read returned 200 and no-store with owner-matched records', 'Cross-author and new-statement visibility require staging'],
  'GET /api/authors/me/analytics': ['Passed', 'Preset and custom UTC reads returned 200 and no-store with the new summary fields. The custom response echoed inclusive UTC bounds', 'Reconcile known royalty and unresolved lines against staged historical data'],
  'GET /api/books/{id}': ['Pending', 'Production Saiyara returned 200 without legacy language and with an empty author photo', 'Verify the stored fields and save/readback in staging'],
  'POST /api/admin/shipments/{id}/assign-courier': ['Blocked', 'Swagger describes in-transit tracking corrections; frontend checks fresh shipment state', 'Admin and reader staging readback required'],
}));

function targets(call) {
  if (call.schemaPath) return [call.schemaPath];
  switch (call.file) {
    case 'app/admin/manuscripts/page.tsx':
      return (call.method === 'POST' ? ['approve', 'reject', 'request-changes'] : ['status'])
        .map((action) => '/api/admin/publish-requests/{id}/' + action);
    case 'app/admin/spotlights/page.tsx': return ['/api/admin/spotlights/{id}'];
    case 'app/sitemap.ts': return ['/api/books', '/api/authors'];
    case 'components/books/book-detail-view.tsx': return ['/api/books/{slug}' + (call.path.endsWith('/related') ? '/related' : '')];
    case 'lib/author-royalties.ts': return ['/api/authors/me/manual-royalties', '/api/authors/me/royalty-settlements'];
    case 'lib/fetch-record.ts': return ['/api/books/{slug}', '/api/authors/{id}', '/api/content'];
    case 'lib/image-upload.ts': return ['/api/uploads/image', '/api/authors/me/uploads/image'];
    case 'lib/public-collection.ts': return ['/api/authors'];
    case 'lib/runtime-metrics.ts': return ['/health/ready'];
    default: return [];
  }
}

const unmatched = [];
for (const call of source.calls) {
  const endpoints = targets(call);
  if (!endpoints.length) unmatched.push(call);
  for (const endpoint of endpoints) {
    const key = operationKey(call.method, endpoint);
    const item = byOperation.get(key) ?? [];
    item.push(call);
    byOperation.set(key, item);
  }
}

const schema = (value) => value?.$ref?.split('/').at(-1) ?? value?.type ?? 'generic';
const entries = Object.entries(spec.paths).flatMap(([path, operations]) => Object.entries(operations)
  .filter(([method]) => methods.has(method))
  .map(([method, operation]) => {
    const verb = method.toUpperCase();
    const key = operationKey(verb, path);
    const calls = byOperation.get(key) ?? [];
    const detail = operation.description ?? '';
    const authentication = detail.match(/Authentication: (.*?)\. API routes/)?.[1] ?? (operation.security?.length ? 'Bearer' : 'Public');
    const controller = detail.match(/Controller: (.*?)\. Authentication:/)?.[1] ?? 'Unspecified';
    const input = Object.values(operation.requestBody?.content ?? {}).map((value) => schema(value.schema)).join(', ');
    const parameters = operation.parameters?.map((value) => `${value.name} (${value.in})`).join(', ');
    const output = Object.values(operation.responses?.['200']?.content ?? {}).map((value) => schema(value.schema)).join(', ');
    const errors = Object.keys(operation.responses ?? {}).filter((code) => /^[45]/.test(code)).join(', ');
    const screens = source.screens.filter((screen) => calls.some((call) => screen.file === call.file ||
      screen.potentialSharedServiceCalls.some((shared) => shared.file === call.file && shared.line === call.line)))
      .map((screen) => screenRoute(screen.file));
    const [state, evidence, remaining] = tests.get(key) ?? ['Pending', 'Swagger only for this handover', verb === 'GET'
      ? 'Fresh live read and authorization verification' : 'Staged mutation, persistence and cross-role readback'];
    return { verb, path, calls, screens, contract: [controller, parameters, input, output].filter(Boolean).join(' / '),
      authentication, errors, state, evidence, remaining };
  }));

const parts = (entry) => [`${entry.verb} ${entry.path}`, entry.contract, entry.authentication,
  entry.calls.map((call) => `${call.file}:${call.line} (${call.owner})`).join(', ') || 'No caller detected',
  entry.screens.join(', ') || 'Shared, unreferenced or server transport', entry.state,
  entry.evidence, entry.errors || 'Unspecified', entry.remaining];
const headings = ['Operation', 'Contract', 'Authentication', 'Frontend caller', 'Connected screens',
  'Status', 'Verification', 'Contract error codes', 'Persistence and outstanding issues'];
const matched = entries.filter((entry) => entry.calls.length).length;
const summary = `The live document has ${Object.keys(spec.paths).length} paths and ${entries.length} operations. The source scanner detected ${source.calls.length} call sites across ${source.screens.length} page files. ${matched} operations have a directly detected or resolved frontend caller.`;
const md = (value) => String(value).replaceAll('|', '&#124;').replace(/\r?\n/g, ' ');
const row = (values) => '| ' + values.map(md).join(' | ') + ' |';
fs.writeFileSync('api-audit/FRONTEND_API_ALIGNMENT_REPORT.md', [
  '# Frontend API alignment report', '', summary, '',
  'Passed means a specifically scoped check succeeded. Failed records an observed mismatch. Pending means runtime verification remains. Blocked requires an authorized session, staging or backend work.',
  '', 'Swagger names and generic envelopes are contract evidence. Inspect callers for exact serialized inputs. Shared envelope rejection, read cooldowns and one safe-read refresh retry apply through Axios. For operation-specific caveats, see the last column. [Deployed OpenAPI](https://harglimpublish-backend.onrender.com/api/docs.json)',
  '', row(headings), row(headings.map(() => '---')), ...entries.map((entry) => row(parts(entry))),
  '', '## Local and shared transport call sites', '',
  ...unmatched.map((call) => `- \`${call.file}:${call.line}\` runs \`${call.method} ${call.path}\`. ${call.path === '/api/content/revalidate' ? 'Next.js CMS cache invalidation handler.' : 'Shared transport. Its calling service determines the backend path.'}`),
  '', '[Cross-role readbacks](CROSS_ROLE_PIPELINE_REPORT.md) · [Backend requests](BACKEND_REQUIRED_CHANGES.md)',
].join('\n') + '\n');

const html = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const counts = Object.fromEntries(['Passed', 'Failed', 'Pending', 'Blocked'].map((state) => [state, entries.filter((entry) => entry.state === state).length]));
fs.writeFileSync('api-audit/handover-integration-dashboard.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Harglim backend handover</title><style>
body{margin:0;background:#f5f6f2;color:#0f3d3e;font:15px/1.55 system-ui,sans-serif}header{background:#0f3d3e;color:white;padding:2rem max(1.25rem,5vw)}h1{font:700 clamp(1.8rem,4vw,3rem) Georgia,serif;margin:0}main{padding:1.5rem max(1.25rem,5vw)}a{color:#0f3d3e}header p{border-left:3px solid #d4af37;padding-left:1rem;max-width:55rem}.stats,.filters{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1rem}.stats span{background:white;border:1px solid #d6ded6;border-radius:.5rem;padding:.55rem 1rem}.filters label{display:grid;gap:.25rem}input,select{padding:.6rem;border:1px solid #8b9f97;border-radius:.4rem;background:white;font:inherit}input{width:min(24rem,70vw)}.table{overflow:auto;border:1px solid #d6ded6;border-radius:.5rem;background:white}table{border-collapse:collapse;width:100%;min-width:85rem}td,th{text-align:left;vertical-align:top;padding:.65rem;border-bottom:1px solid #e1e6df}th{background:#e6ede7}td:first-child{font-family:monospace;min-width:15rem}td:nth-child(5){min-width:11rem}td:nth-child(6){font-weight:bold}td:nth-child(9){min-width:13rem}[hidden]{display:none!important}
</style></head><body><header><h1>Harglim backend handover</h1><p>${html(summary)}</p></header><main>
<div class="stats">${Object.entries(counts).map(([state, count]) => `<span><strong>${count}</strong> ${state}</span>`).join('')}</div>
<p>Production promotion is on hold. Live reads, browser fixtures and blocked transactional checks are recorded in the <a href="FINAL_RELEASE_REPORT.md">release report</a>.</p>
<div class="filters"><label>Search endpoints and screens<input id="q" type="search"></label><label>Status<select id="state"><option value="">All statuses</option>${Object.keys(counts).map((state) => `<option>${state}</option>`).join('')}</select></label></div>
<p id="count" aria-live="polite">${entries.length} operations</p>
<div class="table" tabindex="0" aria-label="API alignment results"><table><thead><tr>${headings.map((name) => `<th scope="col">${html(name)}</th>`).join('')}</tr></thead><tbody>
${entries.map((entry) => `<tr data-state="${entry.state}">${parts(entry).map((value) => `<td>${html(value)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></div></main><script>
const q=document.getElementById('q'), state=document.getElementById('state'), count=document.getElementById('count'), rows=[...document.querySelectorAll('tbody tr')];
function filter(){const query=q.value.trim().toLowerCase();for(const row of rows)row.hidden=Boolean((state.value&&row.dataset.state!==state.value)||!row.textContent.toLowerCase().includes(query));count.textContent=rows.filter(row=>!row.hidden).length+' operations';}
q.addEventListener('input',filter);state.addEventListener('change',filter);
</script></body></html>\n`);
console.log(JSON.stringify({ paths: Object.keys(spec.paths).length, operations: entries.length, matched, calls: source.calls.length, screens: source.screens.length, counts }));
