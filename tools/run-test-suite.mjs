import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'test-suite-results');
mkdirSync(outputDir, { recursive: true });
if (existsSync(resolve(root, '.env.test.local'))) process.loadEnvFile(resolve(root, '.env.test.local'));
const secrets = ['E2E_READER_PASSWORD', 'E2E_AUTHOR_PASSWORD', 'E2E_ADMIN_PASSWORD'].flatMap((key) => {
  const value = process.env[key];
  return value ? [value, JSON.stringify(value).slice(1, -1)] : [];
});

function redact(text) {
  for (const secret of secrets) text = text.replaceAll(secret, '[REDACTED]');
  return text.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]');
}

function redactArtifacts(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = resolve(directory, entry.name);
    // Saved release worktrees are not test artifacts. Do not scan or rewrite
    // dependency trees, build caches, Git data or a nested checkout's files.
    if (entry.isDirectory() && (['node_modules', '.next', '.netlify', '.git'].includes(entry.name) || existsSync(resolve(path, '.git')))) continue;
    if (entry.isDirectory()) redactArtifacts(path);
    else if (entry.isFile() && /\.(md|txt|json|log|html)$/.test(entry.name)) {
      const content = readFileSync(path, 'utf8');
      const safe = redact(content);
      if (safe !== content) writeFileSync(path, safe);
    }
  }
}

const steps = [
  { name: 'unit', cli: 'vitest/vitest.mjs', args: ['run', '--pool=threads', '--maxWorkers=1'] },
  { name: 'lint', cli: 'eslint/bin/eslint.js', args: ['.', '--format', 'json'] },
  { name: 'build', cli: 'next/dist/bin/next', args: ['build'] },
  {
    name: 'e2e', cli: '@playwright/test/cli.js',
    args: ['test', '--reporter=list,html,json'],
    env: { PLAYWRIGHT_SERVER_MODE: 'production', PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(outputDir, 'browser.json') },
  },
];
const retryFailed = process.argv.includes('--retry-failed');
const rerun = new Set((process.argv.find((arg) => arg.startsWith('--rerun='))?.slice('--rerun='.length) ?? '').split(',').filter(Boolean));
const previous = retryFailed ? JSON.parse(readFileSync(resolve(outputDir, 'summary.json'), 'utf8')) : [];
const results = [];

function saveResults() {
  const latest = steps.map(({ name }) =>
    results.find((result) => result.name === name) ?? previous.find((result) => result.name === name)
  ).filter(Boolean);
  writeFileSync(resolve(outputDir, 'summary.json'), JSON.stringify(latest, null, 2) + '\n');
}

saveResults();

for (const step of steps) {
  const passed = previous.find((result) => result.name === step.name && result.status === 'passed');
  if (passed && !rerun.has(step.name)) {
    console.log(`Keeping previous successful ${step.name} result (--retry-failed).`);
    results.push(passed);
    saveResults();
    continue;
  }
  if (step.name === 'e2e' && results.find((result) => result.name === 'build')?.status !== 'passed') {
    results.push({ name: step.name, status: 'skipped', reason: 'Production build failed.' });
    writeFileSync(resolve(outputDir, `${step.name}.log`), 'Skipped: production build failed.\n');
    continue;
  }
  console.log(`\nRunning ${step.name} checks...`);
  if (step.name === 'e2e') {
    rmSync(resolve(outputDir, 'browser.json'), { force: true });
    rmSync(resolve(outputDir, 'public-request-budget.json'), { force: true });
  }
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const log = createWriteStream(resolve(outputDir, `${step.name}.log`));
  const exitCode = await new Promise((done) => {
    const child = spawn(process.execPath, [resolve(root, 'node_modules', step.cli), ...step.args], {
      cwd: root,
      env: { ...process.env, ...step.env },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const buffers = { stdout: '', stderr: '' };
    const emit = (line, stream) => {
      const safe = redact(line);
      if (stream === 'stderr') process.stderr.write(safe);
      else if (step.name !== 'lint') process.stdout.write(safe);
      log.write(safe);
    };
    for (const stream of ['stdout', 'stderr']) {
      child[stream].setEncoding('utf8');
      child[stream].on('data', (chunk) => {
        buffers[stream] += chunk;
        const lines = buffers[stream].split('\n');
        buffers[stream] = lines.pop();
        for (const line of lines) emit(line + '\n', stream);
      });
    }
    child.on('error', (error) => { log.write(`${error.message}\n`); console.error(error.message); });
    child.on('close', (code) => {
      for (const stream of ['stdout', 'stderr']) if (buffers[stream]) emit(buffers[stream], stream);
      log.end(() => done(code ?? 1));
    });
  });
  if (step.name === 'e2e') {
    for (const directory of ['test-results', 'playwright-report', 'test-suite-results']) redactArtifacts(resolve(root, directory));
  }
  const result = { name: step.name, status: exitCode === 0 ? 'passed' : 'failed', exitCode, startedAt, durationMs: Date.now() - started };
  if (step.name === 'e2e') {
    try {
      const { stats } = JSON.parse(readFileSync(resolve(outputDir, 'browser.json'), 'utf8'));
      const { expected: passed, unexpected: failed, flaky, skipped } = stats;
      result.tests = { discovered: passed + failed + flaky + skipped, passed, failed, flaky, skipped };
    } catch {
      console.log('Browser execution did not produce a readable result. See test-suite-results/e2e.log.');
    }
  }
  if (step.name === 'lint') {
    try {
      const files = JSON.parse(readFileSync(resolve(outputDir, 'lint.log'), 'utf8'));
      result.errors = files.reduce((total, file) => total + file.errorCount, 0);
      result.warnings = files.reduce((total, file) => total + file.warningCount, 0);
      console.log(`Lint: ${result.errors} errors, ${result.warnings} warnings. Details: test-suite-results/lint.log`);
    } catch {
      console.log('Lint output: test-suite-results/lint.log');
    }
  }
  results.push(result);
  saveResults();
}

saveResults();
console.table(results.map(({ name, status, durationMs }) => ({ check: name, status, seconds: durationMs === undefined ? '' : Math.round(durationMs / 1000) })));
console.log('Logs and summary: test-suite-results/; browser report: playwright-report/');
process.exitCode = results.every((result) => result.status === 'passed') ? 0 : 1;
