import assert from "node:assert/strict";
import test from "node:test";

import { loadClassicScript } from "./helpers/load-classic-script.mjs";

async function loadProjectDocument() {
  const app = await loadClassicScript("data/project_document.js");
  return app.projectDocument;
}

function makeLegacyProject() {
  return {
    root: {
      id: "root",
      level: 0,
      name: "Проект",
      captions: [],
      children: [
        {
          id: "child",
          level: 1,
          name: "Объект",
          captions: [
            {
              id: "caption",
              text: "Описание",
            },
          ],
          children: [],
          customFutureField: { enabled: true },
        },
      ],
    },
    selectedId: "child",
  };
}

test("legacy snapshot версии 0 мигрирует в текущий формат", async () => {
  const projectDocument = await loadProjectDocument();
  const legacy = makeLegacyProject();
  const hydrated = projectDocument.hydrate(legacy);

  assert.equal(hydrated.schemaVersion, 2);
  assert.equal(hydrated.ui.selectedId, "child");
  assert.deepEqual(
    JSON.parse(JSON.stringify(hydrated.project.root.children[0].customFutureField)),
    { enabled: true },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(hydrated.project.root.tableProps)), {});
  assert.equal(hydrated.project.root.nameHtml, "");
  assert.equal(hydrated.project.root.children[0].captions[0].textHtml, "");

  assert.equal(legacy.schemaVersion, undefined);
  assert.equal(legacy.root.tableProps, undefined);
});

test("snapshot версии 1 разделяется на project и ui", async () => {
  const projectDocument = await loadProjectDocument();
  const versionOne = {
    ...makeLegacyProject(),
    schemaVersion: 1,
    currentView: "table",
    viewOrientation: "vertical",
    tableSelectedCell: { rowId: "child", colId: "status" },
    viewTabsState: { activeId: "view_1", items: [] },
    projectPropertiesState: { order: ["status"] },
    __fmtMap: { child: { bold: true } },
    __colorFmtMap: { child: { color: "#123456" } },
    __blockBgMap: { child: "#ffffff" },
    __markMap: { child: true },
    __levelHeaderNames: { 1: "Отдел" },
    __hiddenNodeIds: ["child"],
  };

  const hydrated = projectDocument.hydrate(versionOne);

  assert.equal(hydrated.schemaVersion, 2);
  assert.equal(hydrated.project.root.id, "root");
  assert.equal(hydrated.project.views.activeId, "view_1");
  assert.deepEqual(
    JSON.parse(JSON.stringify(hydrated.project.properties)),
    { order: ["status"] },
  );
  assert.equal(hydrated.project.formatting.text.child.bold, true);
  assert.equal(hydrated.project.formatting.textColor.child.color, "#123456");
  assert.equal(hydrated.project.formatting.blockBackground.child, "#ffffff");
  assert.equal(hydrated.project.formatting.marks.child, true);
  assert.equal(hydrated.project.levelHeaderNames[1], "Отдел");
  assert.deepEqual(
    JSON.parse(JSON.stringify(hydrated.project.hiddenNodeIds)),
    ["child"],
  );
  assert.equal(hydrated.ui.selectedId, "child");
  assert.equal(hydrated.ui.currentView, "table");
  assert.equal(hydrated.ui.tableSelectedCell.rowId, "child");
  assert.equal("root" in hydrated, false);
  assert.equal("selectedId" in hydrated, false);
});

test("скрытые узлы нормализуются и ограничиваются текущим деревом", async () => {
  const projectDocument = await loadProjectDocument();
  const project = makeLegacyProject();
  project.__hiddenNodeIds = ["child", "child", "missing", "root", ""];

  const hydrated = projectDocument.hydrate(project);

  assert.deepEqual(
    JSON.parse(JSON.stringify(hydrated.project.hiddenNodeIds)),
    ["child"],
  );
});

test("serialize создаёт независимую нормализованную копию", async () => {
  const projectDocument = await loadProjectDocument();
  const source = makeLegacyProject();
  const serialized = projectDocument.serialize(source);

  serialized.project.root.name = "Изменено";
  serialized.project.root.children[0].customFutureField.enabled = false;

  assert.equal(source.root.name, "Проект");
  assert.equal(source.root.children[0].customFutureField.enabled, true);
});

test("неизвестные поля сохраняются на своём уровне документа", async () => {
  const projectDocument = await loadProjectDocument();
  const source = projectDocument.serialize(makeLegacyProject());
  source.syncMetadata = { revision: 3 };
  source.project.customProjectField = { enabled: true };
  source.project.formatting.customFormatting = { value: 1 };
  source.ui.customUiField = "keep";

  const hydrated = projectDocument.hydrate(source);

  assert.equal(hydrated.syncMetadata.revision, 3);
  assert.equal(hydrated.project.customProjectField.enabled, true);
  assert.equal(hydrated.project.formatting.customFormatting.value, 1);
  assert.equal(hydrated.ui.customUiField, "keep");
});

test("неизвестная будущая версия отклоняется с понятной ошибкой", async () => {
  const projectDocument = await loadProjectDocument();
  const project = makeLegacyProject();
  project.schemaVersion = 999;

  const result = projectDocument.validate(project);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "UNSUPPORTED_SCHEMA_VERSION");
});

test("повторяющиеся ID объектов отклоняются", async () => {
  const projectDocument = await loadProjectDocument();
  const project = makeLegacyProject();
  project.root.children.push({
    id: "child",
    level: 1,
    name: "Дубликат",
    captions: [],
    children: [],
  });

  const result = projectDocument.validate(project);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "DUPLICATE_NODE_ID");
});

test("некорректный JSON отклоняется", async () => {
  const projectDocument = await loadProjectDocument();
  const result = projectDocument.validate("{broken json");

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "INVALID_JSON");
});
