import assert from "node:assert/strict";
import test from "node:test";

import { createClassicScriptRuntime } from "./helpers/load-classic-script.mjs";

async function loadCore() {
  const runtime = createClassicScriptRuntime();
  await runtime.load("data/project_document.js");
  await runtime.load("app_core.js");
  return runtime.window;
}

test("новый узел получает обязательные поля и уникальный ID", async () => {
  const app = await loadCore();
  const first = app.makeNode(1, "Первый");
  const second = app.makeNode(1, "Второй");

  assert.notEqual(first.id, second.id);
  assert.equal(first.level, 1);
  assert.equal(first.name, "Первый");
  assert.equal(first.nameHtml, "");
  assert.equal(first.captionsBgColor, "");
  assert.deepEqual(JSON.parse(JSON.stringify(first.captions)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(first.children)), []);
});

test("добавление узла, undo и redo восстанавливают дерево", async () => {
  const app = await loadCore();
  const rootId = app.root.id;

  app.addChild(rootId);
  assert.equal(app.root.children.length, 1);

  const childId = app.root.children[0].id;
  assert.equal(app.selectedId, childId);

  app.undo();
  assert.equal(app.root.children.length, 0);
  assert.equal(app.selectedId, rootId);

  app.redo();
  assert.equal(app.root.children.length, 1);
  assert.equal(app.root.children[0].id, childId);
});

test("snapshot и restore сохраняют основные данные проекта", async () => {
  const app = await loadCore();

  app.root.tableProps = {
    status: "в работе",
    text: { text: "Значение", html: "" },
  };
  app.root.nameHtml = '<span class="rt-b">Проект</span>';
  app.__fmtMap = { [app.root.id]: { bold: true } };
  app.__colorFmtMap = { [app.root.id]: { color: "#000000" } };
  app.__blockBgMap = { [app.root.id]: "#ffffff" };
  app.__markMap = { [app.root.id]: true };
  app.__levelHeaderNames = { 0: "Компания" };

  const saved = app.snapshot();
  const parsed = JSON.parse(saved);

  assert.equal(parsed.schemaVersion, app.PROJECT_SCHEMA_VERSION);
  assert.equal(parsed.ui.currentView, app.VIEW.SCHEMA);
  assert.equal(parsed.ui.viewOrientation, app.VIEW_ORIENTATION.VERTICAL);
  assert.equal(parsed.project.root.id, app.root.id);
  assert.equal(parsed.project.formatting.marks[app.root.id], true);
  assert.equal("root" in parsed, false);
  assert.equal("selectedId" in parsed, false);

  app.root.name = "Повреждено";
  app.root.tableProps.status = "";
  app.__markMap = {};

  app.restore(saved, { shouldRender: false });

  assert.equal(app.root.name, "Уровень 0");
  assert.equal(app.root.tableProps.status, "в работе");
  assert.equal(app.root.nameHtml, '<span class="rt-b">Проект</span>');
  assert.equal(app.__fmtMap[app.root.id].bold, true);
  assert.equal(app.__colorFmtMap[app.root.id].color, "#000000");
  assert.equal(app.__blockBgMap[app.root.id], "#ffffff");
  assert.equal(app.__markMap[app.root.id], true);
  assert.equal(app.__levelHeaderNames[0], "Компания");
});

test("restore мигрирует snapshot версии 1", async () => {
  const app = await loadCore();
  const legacyRoot = app.makeNode(app.LEVEL.COMPANY, "Старый проект");
  const legacy = {
    schemaVersion: 1,
    root: legacyRoot,
    selectedId: legacyRoot.id,
    treeHasFocus: false,
    currentView: app.VIEW.SCHEMA,
    __fmtMap: { [legacyRoot.id]: { bold: true } },
    __levelHeaderNames: { 0: "Организация" },
  };

  app.restore(JSON.stringify(legacy), { shouldRender: false });

  assert.equal(app.root.name, "Старый проект");
  assert.equal(app.selectedId, legacyRoot.id);
  assert.equal(app.treeHasFocus, false);
  assert.equal(app.__fmtMap[legacyRoot.id].bold, true);
  assert.equal(app.__levelHeaderNames[0], "Организация");
});

test("корневой объект нельзя удалить", async () => {
  const app = await loadCore();
  const rootId = app.root.id;

  app.selectedId = rootId;
  app.removeSelected();

  assert.equal(app.root.id, rootId);
  assert.equal(app.root.children.length, 0);
  assert.equal(app.undoStack.length, 0);
});

test("удаление ветки очищает метаданные всех потомков", async () => {
  const app = await loadCore();

  app.addChild(app.root.id);
  const parent = app.root.children[0];
  app.addChild(parent.id);
  const child = parent.children[0];

  const ids = [parent.id, child.id];
  app.__fmtMap = Object.fromEntries(ids.map((id) => [id, { bold: true }]));
  app.__colorFmtMap = Object.fromEntries(ids.map((id) => [id, { color: "#000" }]));
  app.__blockBgMap = Object.fromEntries(ids.map((id) => [id, "#fff"]));
  app.__markMap = Object.fromEntries(ids.map((id) => [id, true]));
  app.__markHiddenMap = Object.fromEntries(ids.map((id) => [id, true]));

  app.selectedId = parent.id;
  app.removeSelected();

  assert.equal(app.root.children.length, 0);

  for (const id of ids) {
    assert.equal(app.__fmtMap[id], undefined);
    assert.equal(app.__colorFmtMap[id], undefined);
    assert.equal(app.__blockBgMap[id], undefined);
    assert.equal(app.__markMap[id], undefined);
    assert.equal(app.__markHiddenMap[id], undefined);
  }
});

test("snapshot и restore централизованно сохраняют скрытые узлы", async () => {
  const app = await loadCore();

  app.addChild(app.root.id);
  const childId = app.root.children[0].id;
  let hiddenIds = [childId];

  app.hideNodes = {
    getAll: () => hiddenIds.slice(),
    replaceAll: (ids) => {
      hiddenIds = ids.slice();
    },
  };

  const saved = app.snapshot();
  hiddenIds = [];

  app.restore(saved, { shouldRender: false });

  assert.deepEqual(JSON.parse(JSON.stringify(hiddenIds)), [childId]);
  assert.deepEqual(JSON.parse(saved).project.hiddenNodeIds, [childId]);
});
