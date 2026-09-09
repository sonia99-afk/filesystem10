import assert from "node:assert/strict";
import test from "node:test";

import { createClassicScriptRuntime } from "./helpers/load-classic-script.mjs";

async function loadClipboardRuntime() {
  const runtime = createClassicScriptRuntime({
    render: () => {},
  });

  await runtime.load("data/project_document.js");
  await runtime.load("app_core.js");
  await runtime.load("clipboard_ops.js");

  return runtime.window;
}

test("копирование ветки сохраняет все данные и создаёт новые ID", async () => {
  const app = await loadClipboardRuntime();

  app.addChild(app.root.id);
  const source = app.root.children[0];
  app.addChild(source.id);
  const sourceChild = source.children[0];

  source.captionsBgColor = "#ffeeaa";
  source.tableProps = {
    status: "в работе",
    customProperty: {
      text: "Значение",
      html: '<span class="rt-b">Значение</span>',
    },
  };
  source.customFutureField = { enabled: true };
  sourceChild.tableProps = { priority: "высокий" };

  app.__fmtMap = { [source.id]: { bold: true } };
  app.__colorFmtMap = { [source.id]: { color: "#123456" } };
  app.__blockBgMap = { [source.id]: "#abcdef" };
  app.__markMap = { [source.id]: true, [sourceChild.id]: true };

  app.selectedId = source.id;
  assert.equal(app.treeClipboardOps.copy(), true);
  assert.equal(app.treeClipboardOps.paste(), true);

  assert.equal(app.root.children.length, 2);

  const clone = app.root.children[1];
  const cloneChild = clone.children[0];

  assert.notEqual(clone.id, source.id);
  assert.notEqual(cloneChild.id, sourceChild.id);
  assert.deepEqual(
    JSON.parse(JSON.stringify(clone.tableProps)),
    JSON.parse(JSON.stringify(source.tableProps)),
  );
  assert.equal(clone.captionsBgColor, source.captionsBgColor);
  assert.deepEqual(
    JSON.parse(JSON.stringify(clone.customFutureField)),
    { enabled: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(cloneChild.tableProps)),
    { priority: "высокий" },
  );
  assert.equal(app.__fmtMap[clone.id].bold, true);
  assert.equal(app.__colorFmtMap[clone.id].color, "#123456");
  assert.equal(app.__blockBgMap[clone.id], "#abcdef");
  assert.equal(app.__markMap[clone.id], true);
  assert.equal(app.__markMap[cloneChild.id], true);
});

test("вырезание ветки очищает метаданные всех её узлов", async () => {
  const app = await loadClipboardRuntime();

  app.addChild(app.root.id);
  const source = app.root.children[0];
  app.addChild(source.id);
  const sourceChild = source.children[0];
  const ids = [source.id, sourceChild.id];

  app.__fmtMap = Object.fromEntries(ids.map((id) => [id, { bold: true }]));
  app.__colorFmtMap = Object.fromEntries(ids.map((id) => [id, { color: "#000" }]));
  app.__blockBgMap = Object.fromEntries(ids.map((id) => [id, "#fff"]));
  app.__markMap = Object.fromEntries(ids.map((id) => [id, true]));

  app.selectedId = source.id;
  assert.equal(app.treeClipboardOps.cut(), true);
  assert.equal(app.root.children.length, 0);

  for (const id of ids) {
    assert.equal(app.__fmtMap[id], undefined);
    assert.equal(app.__colorFmtMap[id], undefined);
    assert.equal(app.__blockBgMap[id], undefined);
    assert.equal(app.__markMap[id], undefined);
  }
});
