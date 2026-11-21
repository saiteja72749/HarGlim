import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const document = JSON.parse(fs.readFileSync('fulldetailedapi.md', 'utf8').replace(/^\uFEFF/, ''));
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(name);
    else if (/\.[jt]sx?$/.test(name) && !/\.test\./.test(name)) files.push(name);
  }
}
for (const directory of ['app', 'components', 'context', 'hooks', 'lib', 'store']) walk(directory);
const normalize = (value) => value.replace(/^\$\{\w+\}/, '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api(?=\/)/, '').split('?')[0].replace(/\$\{[^}]+\}|\{[^}]+\}/g, '{id}');
const routes = new Map();
for (const [url, methods] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    routes.set(`${method.toUpperCase()} ${normalize(url)}`, { url, method: method.toUpperCase(), operation });
  }
}
const calls = [];
const screens = [];
const modules = [];
function ownerOf(node, source) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isFunctionDeclaration(parent) && parent.name) return parent.name.getText(source);
    if (ts.isVariableDeclaration(parent) && parent.initializer && (ts.isArrowFunction(parent.initializer) || ts.isFunctionExpression(parent.initializer))) return parent.name.getText(source);
  }
  return 'module or anonymous callback';
}
function pathCandidates(node, source) {
  if (ts.isConditionalExpression(node)) return [...pathCandidates(node.whenTrue, source), ...pathCandidates(node.whenFalse, source)];
  const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node);
  return [{ literal, url: literal ? node.getText(source).slice(1, -1) : node.getText(source) }];
}
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = source.statements.filter(ts.isImportDeclaration).map((statement) => statement.moduleSpecifier.text).filter((specifier) => specifier.startsWith('@/') || specifier.startsWith('.')).map((specifier) => {
    const base = specifier.startsWith('@/') ? specifier.slice(2) : path.join(path.dirname(file), specifier);
    return ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((extension) => base + extension).find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())?.replaceAll('\\', '/') ?? specifier;
  });
  const screen = { file: file.replaceAll('\\', '/'), imports, forms: [], buttons: [], navigationLinks: [], endpoints: [] };
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const target = node.expression.getText(source);
      const match = target.match(/^(?:api|axios)\.(get|post|put|patch|delete)$/);
      const first = node.arguments[0];
      if ((match || target === 'fetch') && first) {
        const init = node.arguments[1]?.getText(source) || '';
        const method = (match?.[1] || init.match(/method:\s*['"](\w+)['"]/)?.[1] || 'get').toUpperCase();
        for (const { literal, url } of pathCandidates(first, source)) {
        const documented = literal ? routes.get(`${method} ${normalize(url)}`) : undefined;
        const call = {
          file: screen.file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          owner: ownerOf(node, source),
          method, path: url, dynamicPath: !literal,
          evidence: documented ? 'documented; runtime verification required' : 'contract review required',
          requestExpression: init,
          requestSchema: documented?.operation.requestBody?.content,
          parameters: documented?.operation.parameters,
          responses: documented ? Object.fromEntries(Object.entries(documented.operation.responses || {}).filter(([status]) => /^(?:[1-5]\d\d|default)$/.test(status)).map(([status, response]) => [status, { description: response.description, content: response.content, $ref: response.$ref }])) : undefined,
          schemaPath: documented?.url,
        };
        calls.push(call);
        screen.endpoints.push(`${method} ${url}`);
        }
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (['form', 'button', 'Button', 'Link', 'a'].includes(tag)) {
        const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map((attr) => [attr.name.getText(source), attr.initializer?.getText(source) || 'true']));
        const item = { line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, ...attrs };
        if (tag === 'Link' || tag === 'a') screen.navigationLinks.push(item);
        else if (tag === 'form') screen.forms.push(item);
        else screen.buttons.push(item);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  modules.push({ file: screen.file, imports, endpoints: screen.endpoints });
  if (file.endsWith('page.tsx')) screens.push(screen);
}
for (const screen of screens) {
  const visited = new Set();
  function traverse(file) {
    if (visited.has(file)) return;
    visited.add(file);
    for (const dependency of modules.find((module) => module.file === file)?.imports ?? []) traverse(dependency);
  }
  traverse(screen.file);
  screen.potentialSharedServiceCalls = calls.filter((call) => call.file !== screen.file && visited.has(call.file)).map(({ file, line, owner, method, path }) => ({ file, line, owner, method, path }));
}
fs.mkdirSync('api-audit', { recursive: true });
fs.writeFileSync('api-audit/release-workflow-inventory.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'Static inventory. Documented schemas do not prove deployed behavior, authorization, or successful transactional workflows. JSX button attributes require manual context review.',
  screens, calls, modules, schemas: document.components?.schemas,
}, null, 2) + '\n');
console.log(JSON.stringify({ screens: screens.length, callSites: calls.length, contractReview: calls.filter((call) => call.evidence === 'contract review required').map(({ file, line, method, path }) => ({ file, line, method, path })) }, null, 2));
