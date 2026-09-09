import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = path.resolve(import.meta.dirname, '..');

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

test('snapshot и restore не переопределяются отдельными модулями', async () => {
  const offenders = [];

  for (const filePath of await collectJavaScriptFiles(projectRoot)) {
    const source = await readFile(filePath, 'utf8');
    if (/window\.(?:snapshot|restore)\s*=/.test(source)) {
      offenders.push(path.relative(projectRoot, filePath));
    }
  }

  assert.deepEqual(offenders, []);
});

test('формат проекта загружается до ядра приложения', async () => {
  const html = await readFile(path.join(projectRoot, 'редактор_оргструктуры.html'), 'utf8');
  const projectDocumentIndex = html.indexOf('data/project_document.js');
  const projectRepositoryIndex = html.indexOf('data/project_repository.js');
  const appCoreIndex = html.indexOf('app_core.js');
  const autosaveIndex = html.indexOf('autosave.js');

  assert.notEqual(projectDocumentIndex, -1);
  assert.notEqual(projectRepositoryIndex, -1);
  assert.notEqual(appCoreIndex, -1);
  assert.notEqual(autosaveIndex, -1);
  assert.ok(projectDocumentIndex < appCoreIndex);
  assert.ok(projectRepositoryIndex < autosaveIndex);
});

test('autosave не зависит от браузерного хранилища напрямую', async () => {
  const source = await readFile(path.join(projectRoot, 'autosave.js'), 'utf8');

  assert.doesNotMatch(source, /\blocalStorage\b/);
  assert.doesNotMatch(source, /org_structure_project/);
});

test('ядро сохраняет данные в разделах project и ui', async () => {
  const source = await readFile(path.join(projectRoot, 'app_core.js'), 'utf8');
  const snapshotStart = source.indexOf('function snapshot()');
  const snapshotEnd = source.indexOf('function replaceRootData', snapshotStart);
  const snapshotSource = source.slice(snapshotStart, snapshotEnd);

  assert.match(snapshotSource, /project:\s*\{/);
  assert.match(snapshotSource, /ui:\s*\{/);
});
