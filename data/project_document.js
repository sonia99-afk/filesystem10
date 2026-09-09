// Единый формат сохранения проекта.
//
// Этот модуль не знает о localStorage или будущем API. Он отвечает только за:
// - версию документа;
// - миграцию старых snapshot;
// - нормализацию данных;
// - проверку входящего проекта;
// - создание безопасной копии для сохранения.

(function () {
  if (typeof window === "undefined") return;

  const CURRENT_SCHEMA_VERSION = 2;
  const MAX_NODE_COUNT = 100000;

  class ProjectDocumentError extends Error {
    constructor(message, code = "INVALID_PROJECT_DOCUMENT", details = {}) {
      super(message);
      this.name = "ProjectDocumentError";
      this.code = code;
      this.details = details;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fail(message, code, details) {
    throw new ProjectDocumentError(message, code, details);
  }

  function parseInput(input) {
    if (typeof input === "string") {
      try {
        return JSON.parse(input);
      } catch (error) {
        fail("Проект содержит некорректный JSON.", "INVALID_JSON", {
          cause: String(error?.message || error),
        });
      }
    }

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("Проект должен быть объектом.", "INVALID_DOCUMENT_TYPE");
    }

    return clone(input);
  }

  function getSourceVersion(document) {
    if (typeof document.schemaVersion === "undefined") {
      return 0;
    }

    const version = Number(document.schemaVersion);

    if (!Number.isInteger(version) || version < 0) {
      fail("Некорректная версия формата проекта.", "INVALID_SCHEMA_VERSION", {
        schemaVersion: document.schemaVersion,
      });
    }

    if (version > CURRENT_SCHEMA_VERSION) {
      fail(
        "Проект создан в более новой версии приложения.",
        "UNSUPPORTED_SCHEMA_VERSION",
        {
          schemaVersion: version,
          supportedVersion: CURRENT_SCHEMA_VERSION,
        }
      );
    }

    return version;
  }

  function migrateV0ToV1(document) {
    return {
      ...document,
      schemaVersion: 1,
    };
  }

  function migrateV1ToV2(document) {
    const {
      schemaVersion: _schemaVersion,
      root,
      viewTabsState,
      projectPropertiesState,
      __fmtMap,
      __colorFmtMap,
      __blockBgMap,
      __markMap,
      __levelHeaderNames,
      __hiddenNodeIds,
      selectedId,
      treeHasFocus,
      tableSelectedCell,
      currentView,
      viewOrientation,
      showOrdinals,
      showCaptions,
      ...unknownTopLevelFields
    } = document;

    return {
      ...unknownTopLevelFields,
      schemaVersion: 2,
      project: {
        root,
        views: viewTabsState ?? null,
        properties: projectPropertiesState ?? null,
        formatting: {
          text: __fmtMap || {},
          textColor: __colorFmtMap || {},
          blockBackground: __blockBgMap || {},
          marks: __markMap || {},
        },
        levelHeaderNames: __levelHeaderNames || {},
        hiddenNodeIds: Array.isArray(__hiddenNodeIds) ? __hiddenNodeIds : [],
      },
      ui: {
        selectedId,
        treeHasFocus,
        tableSelectedCell: tableSelectedCell ?? null,
        currentView,
        viewOrientation,
        showOrdinals,
        showCaptions,
      },
    };
  }

  const migrations = new Map([
    [0, migrateV0ToV1],
    [1, migrateV1ToV2],
  ]);

  function migrate(input) {
    let document = parseInput(input);
    let version = getSourceVersion(document);

    while (version < CURRENT_SCHEMA_VERSION) {
      const migration = migrations.get(version);

      if (typeof migration !== "function") {
        fail("Для проекта не найдена необходимая миграция.", "MIGRATION_NOT_FOUND", {
          schemaVersion: version,
        });
      }

      document = migration(document);
      version = getSourceVersion(document);
    }

    return document;
  }

  function normalizeRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return clone(value);
  }

  function normalizeNullableRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return clone(value);
  }

  function normalizeCaption(rawCaption, context, path) {
    if (!rawCaption || typeof rawCaption !== "object" || Array.isArray(rawCaption)) {
      fail("Описание объекта имеет некорректный формат.", "INVALID_CAPTION", { path });
    }

    const id = String(rawCaption.id || "").trim();

    if (!id) {
      fail("У описания отсутствует ID.", "MISSING_CAPTION_ID", { path });
    }

    if (context.captionIds.has(id)) {
      fail("В проекте обнаружены повторяющиеся ID описаний.", "DUPLICATE_CAPTION_ID", {
        id,
        path,
      });
    }

    context.captionIds.add(id);

    return {
      ...rawCaption,
      id,
      text: typeof rawCaption.text === "string" ? rawCaption.text : "",
      textHtml: typeof rawCaption.textHtml === "string" ? rawCaption.textHtml : "",
    };
  }

  function normalizeNode(rawNode, context, path) {
    if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) {
      fail("Узел проекта имеет некорректный формат.", "INVALID_NODE", { path });
    }

    context.nodeCount += 1;

    if (context.nodeCount > MAX_NODE_COUNT) {
      fail("В проекте превышено допустимое количество объектов.", "NODE_LIMIT_EXCEEDED", {
        limit: MAX_NODE_COUNT,
      });
    }

    const id = String(rawNode.id || "").trim();

    if (!id) {
      fail("У объекта отсутствует ID.", "MISSING_NODE_ID", { path });
    }

    if (context.nodeIds.has(id)) {
      fail("В проекте обнаружены повторяющиеся ID объектов.", "DUPLICATE_NODE_ID", {
        id,
        path,
      });
    }

    context.nodeIds.add(id);

    const level = Number(rawNode.level);

    if (!Number.isInteger(level) || level < 0 || level > 20) {
      fail("У объекта указан некорректный уровень.", "INVALID_NODE_LEVEL", {
        id,
        level: rawNode.level,
        path,
      });
    }

    if (!Array.isArray(rawNode.children)) {
      fail("Поле children объекта должно быть массивом.", "INVALID_NODE_CHILDREN", {
        id,
        path,
      });
    }

    const rawCaptions = Array.isArray(rawNode.captions) ? rawNode.captions : [];

    const captions = rawCaptions.map((caption, index) => {
      return normalizeCaption(caption, context, `${path}.captions[${index}]`);
    });

    const children = rawNode.children.map((child, index) => {
      return normalizeNode(child, context, `${path}.children[${index}]`);
    });

    return {
      ...rawNode,
      id,
      level,
      name: typeof rawNode.name === "string" ? rawNode.name : `Уровень ${level}`,
      nameHtml: typeof rawNode.nameHtml === "string" ? rawNode.nameHtml : "",
      captionsBgColor:
        typeof rawNode.captionsBgColor === "string" ? rawNode.captionsBgColor : "",
      captions,
      children,
      tableProps: normalizeRecord(rawNode.tableProps),
    };
  }

  function normalize(input) {
    const document = migrate(input);
    const project = document.project;
    const ui = document.ui;

    if (!project || typeof project !== "object" || Array.isArray(project)) {
      fail("В проекте отсутствует раздел project.", "MISSING_PROJECT_DATA");
    }

    if (!project.root) {
      fail("В проекте отсутствует корневой объект.", "MISSING_ROOT");
    }

    if (!ui || typeof ui !== "object" || Array.isArray(ui)) {
      fail("В проекте отсутствует раздел ui.", "MISSING_UI_STATE");
    }

    const context = {
      nodeCount: 0,
      nodeIds: new Set(),
      captionIds: new Set(),
    };
    const root = normalizeNode(project.root, context, "project.root");
    const selectedId = context.nodeIds.has(ui.selectedId)
      ? ui.selectedId
      : root.id;
    const hiddenNodeIds = Array.isArray(project.hiddenNodeIds)
      ? Array.from(
          new Set(
            project.hiddenNodeIds
              .map((id) => String(id || "").trim())
              .filter((id) => id && id !== root.id && context.nodeIds.has(id))
          )
        )
      : [];
    const formatting = normalizeRecord(project.formatting);

    return {
      ...document,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      project: {
        ...project,
        root,
        views: normalizeNullableRecord(project.views),
        properties: normalizeNullableRecord(project.properties),
        formatting: {
          ...formatting,
          text: normalizeRecord(formatting.text),
          textColor: normalizeRecord(formatting.textColor),
          blockBackground: normalizeRecord(formatting.blockBackground),
          marks: normalizeRecord(formatting.marks),
        },
        levelHeaderNames: normalizeRecord(project.levelHeaderNames),
        hiddenNodeIds,
      },
      ui: {
        ...ui,
        selectedId,
        treeHasFocus:
          typeof ui.treeHasFocus === "boolean" ? ui.treeHasFocus : true,
        tableSelectedCell:
          ui.tableSelectedCell &&
          typeof ui.tableSelectedCell === "object" &&
          !Array.isArray(ui.tableSelectedCell)
            ? clone(ui.tableSelectedCell)
            : null,
        currentView: typeof ui.currentView === "string" ? ui.currentView : null,
        viewOrientation:
          typeof ui.viewOrientation === "string" ? ui.viewOrientation : null,
        showOrdinals:
          typeof ui.showOrdinals === "boolean" ? ui.showOrdinals : null,
        showCaptions:
          typeof ui.showCaptions === "boolean" ? ui.showCaptions : null,
      },
    };
  }

  function serialize(state) {
    return normalize(state);
  }

  function hydrate(input) {
    return normalize(input);
  }

  function validate(input) {
    try {
      const document = hydrate(input);

      return {
        ok: true,
        document,
        errors: [],
      };
    } catch (error) {
      if (!(error instanceof ProjectDocumentError)) {
        throw error;
      }

      return {
        ok: false,
        document: null,
        errors: [
          {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        ],
      };
    }
  }

  window.PROJECT_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
  window.ProjectDocumentError = ProjectDocumentError;
  window.projectDocument = {
    CURRENT_SCHEMA_VERSION,
    hydrate,
    migrate,
    serialize,
    validate,
  };
})();
