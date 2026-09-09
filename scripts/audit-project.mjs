import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const htmlPath = path.join(rootDir, "редактор_оргструктуры.html");
const routerPath = path.join(rootDir, "spa_router.js");

function stripHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, "");
}

function collectHtmlAssets(source) {
  const html = stripHtmlComments(source);
  const assets = [];
  const pattern = /\b(?:src|href)\s*=\s*["']([^"']+\.(?:js|css))["']/gi;

  for (const match of html.matchAll(pattern)) {
    assets.push(match[1]);
  }

  return assets;
}

function collectRouterAssets(source) {
  const assets = [];
  const pattern = /["']([^"'\n]+\.(?:js|css))["']/g;

  for (const match of source.matchAll(pattern)) {
    assets.push(match[1]);
  }

  return assets;
}

async function inspectAsset(relativePath) {
  const cleanPath = relativePath.replace(/^\.\//, "");
  const absolutePath = path.join(rootDir, cleanPath);

  try {
    const info = await stat(absolutePath);

    return {
      path: cleanPath,
      exists: info.isFile(),
      size: info.size,
    };
  } catch {
    return {
      path: cleanPath,
      exists: false,
      size: 0,
    };
  }
}

async function collectSourceAssets(directory = rootDir) {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = [];

  for (const entry of entries) {
    if ([".git", "node_modules", "scripts", "tests"].includes(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      assets.push(...(await collectSourceAssets(absolutePath)));
      continue;
    }

    if (entry.name.endsWith(".js") || entry.name.endsWith(".css")) {
      assets.push(path.relative(rootDir, absolutePath).replaceAll(path.sep, "/"));
    }
  }

  return assets;
}

const [html, router, sourceAssets] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(routerPath, "utf8"),
  collectSourceAssets(),
]);

const htmlAssets = collectHtmlAssets(html);
const routerAssets = collectRouterAssets(router);
const uniqueAssets = [...new Set([...htmlAssets, ...routerAssets])].sort();
const inspectedAssets = await Promise.all(uniqueAssets.map(inspectAsset));

const missingAssets = inspectedAssets.filter((asset) => !asset.exists);
const emptyAssets = inspectedAssets.filter((asset) => asset.exists && asset.size === 0);
const duplicateHtmlAssets = [...new Set(
  htmlAssets.filter((asset, index) => htmlAssets.indexOf(asset) !== index),
)];
const referencedAssets = new Set(uniqueAssets.map((asset) => asset.replace(/^\.\//, "")));
const unreferencedAssets = sourceAssets
  .filter((asset) => !referencedAssets.has(asset))
  .sort();
const activeHtml = stripHtmlComments(html);
const inlineStyleCount = (activeHtml.match(/\bstyle\s*=/gi) || []).length;
const inlineHandlerCount = (activeHtml.match(/\bon[a-z]+\s*=/gi) || []).length;

console.log(`HTML-ресурсов: ${htmlAssets.length}.`);
console.log(`Ленивых ресурсов роутера: ${routerAssets.length}.`);
console.log(`Уникальных проверенных ресурсов: ${uniqueAssets.length}.`);
console.log(`Inline style: ${inlineStyleCount}. Inline handlers: ${inlineHandlerCount}.`);

if (unreferencedAssets.length) {
  console.warn("Неподключённые исходные ресурсы, требующие разбора:");
  unreferencedAssets.forEach((asset) => console.warn(`- ${asset}`));
}

if (duplicateHtmlAssets.length) {
  console.warn(`Повторные подключения в HTML: ${duplicateHtmlAssets.join(", ")}`);
}

if (missingAssets.length) {
  console.error("Отсутствующие подключённые ресурсы:");
  missingAssets.forEach((asset) => console.error(`- ${asset.path}`));
}

if (emptyAssets.length) {
  console.error("Пустые подключённые ресурсы:");
  emptyAssets.forEach((asset) => console.error(`- ${asset.path}`));
}

if (missingAssets.length || emptyAssets.length) {
  process.exitCode = 1;
} else {
  console.log("Все подключённые JS/CSS существуют и не пусты.");
}
