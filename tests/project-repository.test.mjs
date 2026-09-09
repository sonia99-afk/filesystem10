import assert from "node:assert/strict";
import test from "node:test";

import { loadClassicScript } from "./helpers/load-classic-script.mjs";

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

async function loadRepository(storage = new FakeStorage()) {
  const app = await loadClassicScript("data/project_repository.js", {
    localStorage: storage,
  });

  return {
    app,
    repository: app.projectRepository,
    storage,
  };
}

test("репозиторий использует прежние ключи хранения", async () => {
  const { app, repository } = await loadRepository();

  assert.equal(repository instanceof app.ProjectRepository, true);

  assert.deepEqual(
    JSON.parse(JSON.stringify(app.PROJECT_STORAGE_KEYS)),
    {
      index: "org_structure_projects_index_v1",
      projectDataPrefix: "org_structure_project_data_",
      legacyMulti: "org_structure_projects_v1",
      legacySingle: "org_structure_project_autosave_v1",
    }
  );
});

test("индекс и документ проекта сохраняются раздельно", async () => {
  const { repository, storage } = await loadRepository();
  const index = {
    version: 1,
    activeId: "project_a",
    projects: [{ id: "project_a", title: "Проект" }],
  };
  const document = '{"schemaVersion":1,"root":{"id":"root"}}';

  repository.saveIndex(index);
  repository.saveProject("project_a", document);

  assert.deepEqual(
    JSON.parse(JSON.stringify(repository.loadIndex())),
    index
  );
  assert.equal(repository.loadProject("project_a"), document);
  assert.equal(
    storage.getItem("org_structure_project_data_project_a"),
    document
  );
});

test("повреждённый индекс не ломает запуск приложения", async () => {
  const { repository } = await loadRepository(
    new FakeStorage({
      org_structure_projects_index_v1: "{broken",
    })
  );

  assert.equal(repository.loadIndex(), null);
});

test("legacy-данные доступны миграции без изменения", async () => {
  const legacyMulti = {
    version: 1,
    activeId: "old",
    projects: [{ id: "old", data: "{}" }],
  };
  const { repository } = await loadRepository(
    new FakeStorage({
      org_structure_projects_v1: JSON.stringify(legacyMulti),
      org_structure_project_autosave_v1: '{"root":{"id":"root"}}',
    })
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(repository.loadLegacyMultiStore())),
    legacyMulti
  );
  assert.equal(
    repository.loadLegacySingleProject(),
    '{"root":{"id":"root"}}'
  );
});

test("clear удаляет только данные проектов", async () => {
  const storage = new FakeStorage({
    org_structure_projects_index_v1: "{}",
    org_structure_projects_v1: "{}",
    org_structure_project_autosave_v1: "{}",
    org_structure_project_data_a: "{}",
    org_structure_project_data_b: "{}",
    unrelated_setting: "keep",
  });
  const { repository } = await loadRepository(storage);

  repository.clear(["a", "a", "b"]);

  assert.equal(storage.getItem("org_structure_projects_index_v1"), null);
  assert.equal(storage.getItem("org_structure_project_data_a"), null);
  assert.equal(storage.getItem("org_structure_project_data_b"), null);
  assert.equal(storage.getItem("unrelated_setting"), "keep");
});

test("ошибка браузерного хранилища получает единый тип", async () => {
  const storage = new FakeStorage();
  storage.setItem = () => {
    throw new Error("quota exceeded");
  };
  const { app, repository } = await loadRepository(storage);

  assert.throws(
    () => repository.saveIndex({ projects: [] }),
    (error) => {
      assert.equal(error instanceof app.ProjectRepositoryError, true);
      assert.equal(error.code, "PROJECT_STORAGE_ERROR");
      assert.equal(error.operation, "saveIndex");
      return true;
    }
  );
});
