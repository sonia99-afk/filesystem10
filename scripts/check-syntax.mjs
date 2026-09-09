import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules"]);
const supportedExtensions = new Set([".js", ".mjs", ".cjs"]);

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(absolutePath)));
      continue;
    }

    if (supportedExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

const files = await collectJavaScriptFiles(rootDir);
const failures = [];

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failures.push({
      file: path.relative(rootDir, file),
      error: result.stderr || result.stdout || "Неизвестная ошибка синтаксиса",
    });
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`\n${failure.file}\n${failure.error.trim()}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Синтаксис проверен: ${files.length} JS-файлов.`);
}
