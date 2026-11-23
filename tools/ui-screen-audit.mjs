import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const pages = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'page.tsx') pages.push(file);
  }
}
walk('app');
const screens = pages.map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let buttons = 0, forms = 0;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(ast);
      if (name === 'button' || name === 'Button') buttons++;
      if (name === 'form') forms++;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const route = '/' + file.replace(/^app\//, '').replace(/\/page\.tsx$/, '').split('/').filter((part) => !part.startsWith('(')).join('/');
  const role = route.startsWith('/admin') ? 'admin' : route.startsWith('/author/') || route === '/author' ? 'author' : route.startsWith('/dashboard') || route.startsWith('/checkout') ? 'authenticated reader' : 'public';
  const layouts = [];
  let directory = path.posix.dirname(file);
  while (directory === 'app' || directory.startsWith('app/')) {
    const candidate = path.posix.join(directory, 'layout.tsx');
    if (fs.existsSync(candidate)) layouts.unshift(candidate.replaceAll('\\', '/'));
    if (directory === 'app') break;
    directory = path.posix.dirname(directory);
  }
  return { file, route: route === '/page.tsx' ? '/' : route, role, forms, directButtons: buttons, layouts, status: role === 'admin' ? 'Shared layout/source reviewed; successful admin UI and mutations require staging/admin credentials.' : 'Shared responsive controls applied. See browser logs for route-specific execution; static inventory alone is not runtime proof.' };
});
const report = { generatedAt: new Date().toISOString(), scope: 'Every page enumerated from source. Public mobile matrix and targeted author checks use real backend reads. No admin or transactional certification is claimed.', sharedRepairs: ['Responsive book covers and visible touch actions', 'No fabricated book prices/formats/counts or author-name suppression', 'Complete real collection paging before local filtering/sorting', 'Single main landmark and skip link', 'Reduced-motion-aware transitions', 'Scrollable dialog/table behavior and mobile form sizing', 'Fresh author profile/payout load and save-readback states', 'Route-specific public canonical/Open Graph/Twitter metadata and paginated sitemap'], screens };
const readEvidence = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
report.verification = readEvidence('test-suite-results/summary.json');
report.publicMobile = readEvidence('test-suite-results/public-mobile-screen-results.json');
report.authorMobile = readEvidence('test-suite-results/author-mobile-screen-results.json');
report.adminMobile = readEvidence('test-suite-results/admin-mobile-screen-results.json');
report.mobileCardComparison = { before: readEvidence('test-suite-results/mobile-catalog-before.json'), after: readEvidence('test-suite-results/mobile-catalog-after.json'), scope: 'First visible card at 390px before/after; not a controlled speed benchmark.' };
report.backendGates = ['Admin success paths and transactional tests need authorized staging/admin access.', 'The 17 missing CMS section values still require approved content and backend storage/readback verification.', 'Frontend catalog filtering now uses complete real query pages; backend global filtering remains necessary for efficient large catalogs.', 'Bank/profile writes use server readback checks but were not executed against the live account.'];
for (const screen of screens) {
  const evidence = screen.role === 'author' ? report.authorMobile : screen.role === 'admin' ? report.adminMobile : report.publicMobile;
  const mobile = evidence?.screens?.find((item) => item.route === screen.route);
  if (evidence?.status === 'passed' && mobile) screen.mobileVerification = mobile;
}
fs.writeFileSync('api-audit/ui-screen-audit.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('api-audit/ui-screen-audit.txt', [
  'Harglim Publishers — UI/UX screen audit',
  `Generated: ${report.generatedAt}`,
  report.scope,
  '', 'Validation:', JSON.stringify(report.verification, null, 2),
  '', 'Mobile card measurements:', JSON.stringify(report.mobileCardComparison, null, 2),
  '', 'Backend/staging gates:', ...report.backendGates.map((item) => '- ' + item),
  '', 'Shared changes:', ...report.sharedRepairs.map((item) => '- ' + item),
  '', 'Screen-by-screen scope:',
  ...screens.flatMap((screen) => [`${screen.route} | ${screen.role}`, `Source: ${screen.file}`, `Layouts: ${screen.layouts.join(', ')}`, screen.status, screen.mobileVerification ? 'Runtime: 320px layout/landmark/controls check passed; public routes also check canonical metadata.' : 'Runtime: see suite logs; no per-screen mobile certification is inferred.', '']),
].join('\n') + '\n');
console.log(JSON.stringify({ screens: screens.length, byRole: Object.fromEntries([...new Set(screens.map((screen) => screen.role))].map((role) => [role, screens.filter((screen) => screen.role === role).length])) }));
