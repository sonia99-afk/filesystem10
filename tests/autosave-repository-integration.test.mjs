import assert from "node:assert/strict";
import test from "node:test";

import { createClassicScriptRuntime } from "./helpers/load-classic-script.mjs";

class FakeStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function makeDocument(name) {
  return {
    schemaVersion: 2,
    project: {
      root: {
        id: "root",
        level: 0,
        name,
        nameHtml: "",
        captions: [],
        children: [],
      },
      views: null,
      properties: null,
      formatting: {},
      levelHeaderNames: {},
      hiddenNodeIds: [],
    },
    ui: {
      selectedId: "root",
      treeHasFocus: true,
    },
  };
}

test("autosave загружает и сохраняет проект только через репозиторий", async () => {
  const savedDocument = makeDocument("Сохранённый проект");
  const storage = new FakeStorage({
    org_structure_projects_index_v1: JSON.stringify({
      version: 1,
      activeId: "project_a",
      projects: [
        {
          id: "project_a",
          title: "Сохранённый проект",
          updatedAt: 1,
        },
      ],
    }),
    org_structure_project_data_project_a: JSON.stringify(savedDocument),
  });
  const browserDocument = {
    readyState: "complete",
    activeElement: null,
    createElement: () => ({ innerHTML: "", textContent: "" }),
    querySelector: () => null,
    addEventListener: () => {},
  };
  const runtime = createClassicScriptRuntime({
    localStorage: storage,
    document: browserDocument,
    location: {
      href: "https://example.test/редактор_оргструктуры.html",
      pathname: "/редактор_оргструктуры.html",
      search: "",
      hash: "",
    },
    history: {
      replaceState: () => {},
      pushState: () => {},
    },
    LEVEL: { COMPANY: 0 },
    VIEW: { SCHEMA: "schema" },
    currentView: "schema",
    root: makeDocument("Начальный проект").project.root,
    selectedId: "root",
    treeHasFocus: true,
    cssEscape: (value) => String(value),
    findWithParent: (root, id) => (root?.id === id ? { node: root } : null),
    makeNode: (level, name) => ({
      id: "new_root",
      level,
      name,
      nameHtml: "",
      captions: [],
      children: [],
    }),
    pushHistory: () => {},
    render: () => {},
  });

  runtime.window.snapshot = () => {
    const document = makeDocument(runtime.window.root.name);
    document.project.root = runtime.window.root;
    return JSON.stringify(document);
  };
  runtime.window.restore = (serialized) => {
    const data = JSON.parse(serialized);
    runtime.window.root = data.project?.root || data.root;
    runtime.window.selectedId = data.ui?.selectedId || data.selectedId;
  };

  await runtime.load("data/project_repository.js");

  runtime.window.localStorage = {
    getItem: () => {
      throw new Error("autosave не должен читать localStorage напрямую");
    },
    setItem: () => {
      throw new Error("autosave не должен записывать localStorage напрямую");
    },
    removeItem: () => {
      throw new Error("autosave не должен удалять localStorage напрямую");
    },
  };

  await runtime.load("autosave.js");

  assert.equal(runtime.window.root.name, "Сохранённый проект");

  runtime.window.root.name = "Изменённый проект";
  runtime.window.projectAutosave.saveNow();

  const storedProject = JSON.parse(
    storage.getItem("org_structure_project_data_project_a")
  );
  const storedIndex = JSON.parse(
    storage.getItem("org_structure_projects_index_v1")
  );

  assert.equal(storedProject.project.root.name, "Изменённый проект");
  assert.equal(storedIndex.projects[0].title, "Изменённый проект");
  assert.equal(runtime.window.projectAutosave.getLastStorageError(), null);
});
