// Репозиторий проектов.
//
// Остальные модули приложения не должны знать ключи localStorage.
// При подключении API этот адаптер можно будет заменить другой реализацией,
// сохранив публичный контракт репозитория.

(function () {
  if (typeof window === "undefined") return;

  const STORAGE_KEYS = Object.freeze({
    index: "org_structure_projects_index_v1",
    projectDataPrefix: "org_structure_project_data_",
    legacyMulti: "org_structure_projects_v1",
    legacySingle: "org_structure_project_autosave_v1",
  });

  class ProjectRepositoryError extends Error {
    constructor(message, operation, cause) {
      super(message);
      this.name = "ProjectRepositoryError";
      this.code = "PROJECT_STORAGE_ERROR";
      this.operation = operation;
      this.cause = cause;
    }
  }

  class ProjectRepository {
    loadIndex() {
      throw new Error("ProjectRepository.loadIndex() не реализован.");
    }

    saveIndex() {
      throw new Error("ProjectRepository.saveIndex() не реализован.");
    }

    loadProject() {
      throw new Error("ProjectRepository.loadProject() не реализован.");
    }

    saveProject() {
      throw new Error("ProjectRepository.saveProject() не реализован.");
    }

    deleteProject() {
      throw new Error("ProjectRepository.deleteProject() не реализован.");
    }

    loadLegacyMultiStore() {
      return null;
    }

    loadLegacySingleProject() {
      return null;
    }

    clear() {
      throw new Error("ProjectRepository.clear() не реализован.");
    }
  }

  class LocalStorageProjectRepository extends ProjectRepository {
    constructor(storage, keys = STORAGE_KEYS) {
      super();

      if (!storage || typeof storage.getItem !== "function") {
        throw new ProjectRepositoryError(
          "Локальное хранилище проектов недоступно.",
          "initialize"
        );
      }

      this.storage = storage;
      this.keys = { ...STORAGE_KEYS, ...keys };
    }

    run(operation, action) {
      try {
        return action();
      } catch (cause) {
        throw new ProjectRepositoryError(
          "Не удалось выполнить операцию с хранилищем проектов.",
          operation,
          cause
        );
      }
    }

    parseStoredJson(raw) {
      if (typeof raw !== "string" || !raw.trim()) {
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    }

    projectDataKey(projectId) {
      const id = String(projectId || "");

      if (!id) {
        throw new ProjectRepositoryError(
          "Для операции с проектом требуется ID.",
          "projectDataKey"
        );
      }

      return this.keys.projectDataPrefix + id;
    }

    loadIndex() {
      return this.run("loadIndex", () => {
        return this.parseStoredJson(this.storage.getItem(this.keys.index));
      });
    }

    saveIndex(index) {
      return this.run("saveIndex", () => {
        this.storage.setItem(this.keys.index, JSON.stringify(index));
        return true;
      });
    }

    loadProject(projectId) {
      const key = this.projectDataKey(projectId);
      return this.run("loadProject", () => this.storage.getItem(key));
    }

    saveProject(projectId, serializedDocument) {
      const key = this.projectDataKey(projectId);

      if (typeof serializedDocument !== "string" || !serializedDocument) {
        throw new ProjectRepositoryError(
          "Проект должен быть передан как непустая JSON-строка.",
          "saveProject"
        );
      }

      return this.run("saveProject", () => {
        this.storage.setItem(key, serializedDocument);
        return true;
      });
    }

    deleteProject(projectId) {
      const key = this.projectDataKey(projectId);
      return this.run("deleteProject", () => {
        this.storage.removeItem(key);
        return true;
      });
    }

    loadLegacyMultiStore() {
      return this.run("loadLegacyMultiStore", () => {
        return this.parseStoredJson(this.storage.getItem(this.keys.legacyMulti));
      });
    }

    loadLegacySingleProject() {
      return this.run("loadLegacySingleProject", () => {
        return this.storage.getItem(this.keys.legacySingle);
      });
    }

    clear(projectIds = []) {
      return this.run("clear", () => {
        this.storage.removeItem(this.keys.index);
        this.storage.removeItem(this.keys.legacyMulti);
        this.storage.removeItem(this.keys.legacySingle);

        Array.from(new Set(projectIds || []))
          .filter(Boolean)
          .forEach((projectId) => {
            this.storage.removeItem(this.projectDataKey(projectId));
          });

        return true;
      });
    }
  }

  function createDefaultRepository() {
    try {
      return new LocalStorageProjectRepository(window.localStorage);
    } catch (error) {
      console.error("Не удалось инициализировать хранилище проектов", error);
      return null;
    }
  }

  window.PROJECT_STORAGE_KEYS = STORAGE_KEYS;
  window.ProjectRepositoryError = ProjectRepositoryError;
  window.ProjectRepository = ProjectRepository;
  window.LocalStorageProjectRepository = LocalStorageProjectRepository;
  window.projectRepository =
    window.projectRepository || createDefaultRepository();
})();
