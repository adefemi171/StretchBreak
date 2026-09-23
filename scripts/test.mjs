import { build } from 'esbuild';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

if (Number(process.versions.node.split('.')[0]) < 22) {
  throw new Error('Tests require Node.js 22 or newer.');
}
const root = resolve(import.meta.dirname, '..');
const tests = (await readdir(join(root, 'tests'))).filter(name => /\.test\.(?:ts|js|mjs)$/.test(name)).sort();
if (!tests.length) throw new Error('No regression tests found.');
// Keeping output under node_modules allows external package imports to resolve normally.
const cache = join(root, 'node_modules', '.cache');
await mkdir(cache, { recursive: true });
const output = await mkdtemp(join(cache, 'stretchbreak-tests-'));
try {
  await Promise.all(tests.map(name => build({
    entryPoints: [join(root, 'tests', name)], outfile: join(output, name.replace(/\.(ts|js)$/, '.mjs')),
    bundle: true, jsx: 'automatic', platform: 'node', format: 'esm', target: 'node22', packages: 'external', logLevel: 'warning',
    loader: { '.css': 'empty' },
    define: { 'import.meta.url': JSON.stringify(pathToFileURL(join(root, 'tests', name)).href) },
  })));
  const outputs = (await readdir(output)).filter(name => name.endsWith('.mjs')).map(name => join(output, name));
  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, ['--test', ...outputs], { cwd: root, stdio: 'inherit', env: { ...process.env, TZ: 'America/Chicago' } });
    child.once('error', reject);
    child.once('exit', code => resolveExit(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await rm(output, { recursive: true, force: true });
}
