// app_core.js
// Общее ядро проекта: состояние дерева, история, базовые операции и хоткеи.
// Загружается после data/project_document.js и до страничной логики app2.js.

(function () {
    if (typeof window === "undefined") return;
  
    const global = window;
  
    /* =========================
       View / project constants
       ========================= */
  
global.VIEW ||= {
  SCHEMA: "schema",
  HIERARCHY: "hierarchy",
  AICYCLE: "aicycle",
  TABLE: "table",
  STRUCTURE_TABLE: "structure-table",
  LIST: "list",
  TEXT: "text",
};

/*
  Обычная таблица и объединённый вид
  используют общую табличную механику.
*/

global.isTableLikeView ||= function isTableLikeView(view) {
  const value = view || global.currentView;

  return (
    value === global.VIEW.TABLE ||
    value === global.VIEW.STRUCTURE_TABLE ||
    value === "table" ||
    value === "structure-table"
  );
};

/*
  Проверяет, открыт ли объединённый вид.
*/

global.isStructureTableView ||= function isStructureTableView(view) {
  const value = view || global.currentView;

  return (
    value === global.VIEW.STRUCTURE_TABLE ||
    value === "structure-table"
  );
};

/*
  В объединённом виде определяет,
  находится ли фокус в левой части структуры.

  Это понадобится, чтобы слева работали
  хоткеи структуры, а справа — таблицы.
*/

global.isStructureTableSchemaTarget ||=
  function isStructureTableSchemaTarget(target) {
    if (!global.isStructureTableView()) {
      return false;
    }

    const element = target?.closest
      ? target
      : global.document?.activeElement;

    return !!element?.closest?.(
      ".structure-table-schema-pane"
    );
  };

global.VIEW_ORIENTATION ||= {
      HORIZONTAL: "horizontal",
      VERTICAL: "vertical",
    };
  
    global.LEVEL ||= {
      COMPANY: 0,
      PROJECT: 1,
      DEPT: 2,
      ROLE: 3,
      STEP: 20,
    };
  
    global.DEFAULT_NAME ||= {
      0: "Уровень 0",
      1: "Уровень 1",
      2: "Уровень 2",
      3: "Уровень 3",
      4: "Уровень 4",
      5: "Уровень 5",
      6: "Уровень 6",
      7: "Уровень 7",
      8: "Уровень 8",
      9: "Уровень 9",
      10: "Уровень 10",
      11: "Уровень 11",
      12: "Уровень 12",
      13: "Уровень 13",
      14: "Уровень 14",
      15: "Уровень 15",
      16: "Уровень 16",
      17: "Уровень 17",
      18: "Уровень 18",
      19: "Уровень 19",
      20: "Уровень 20",
    };
  
    if (typeof global.currentView === "undefined") {
      global.currentView = global.VIEW.SCHEMA;
    }
  
    if (typeof global.viewOrientation === "undefined") {
      global.viewOrientation = global.VIEW_ORIENTATION.VERTICAL;
    }
  
    if (typeof global.showOrdinals === "undefined") {
      global.showOrdinals = true;
    }
  
    if (typeof global.showCaptions === "undefined") {
      global.showCaptions = true;
    }
  
    /* =========================
       Basic helpers
       ========================= */
  
    function getDefaultNodeName(level) {
      return (
        global.levelHeaders?.getLevelTitle?.(level) ||
        global.DEFAULT_NAME?.[level] ||
        `Уровень ${level}`
      );
    }
  
    function uid() {
      return (
        Math.random().toString(36).slice(2, 9) +
        "_" +
        Date.now().toString(36)
      );
    }
  
    function makeNode(level, name) {
      return {
        id: uid(),
        level,
        name: name ?? getDefaultNodeName(level),
        nameHtml: "",
        captionsBgColor: "",
        captions: [],
        children: [],
      };
    }
  
    function makeCaption(text = "") {
      return {
        id: uid(),
        text,
        textHtml: "",
      };
    }
  
    function esc(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  
    function cssEscape(s) {
      const v = String(s);
      if (global.CSS && typeof CSS.escape === "function") return CSS.escape(v);
      return v.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
    }
  
    function htmlPlainText(html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html || "";
      return (tmp.textContent || "").trim();
    }
  
    function replaceTextInsideHtmlPreservingMarkup(html, nextText) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html || "";
  
      const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
      const textNodes = [];
  
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
  
      if (!textNodes.length) return "";
  
      textNodes[0].nodeValue = nextText;
  
      for (let i = 1; i < textNodes.length; i++) {
        const n = textNodes[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
  
      return tmp.innerHTML;
    }
  
    /* =========================
       Root state
       ========================= */
  
    if (!global.root) {
      global.root = makeNode(global.LEVEL.COMPANY, "Уровень 0");
    }
  
    if (typeof global.selectedId === "undefined") {
      global.selectedId = global.root.id;
    }

    if (typeof global.tableSelectedCell === "undefined") {
      global.tableSelectedCell = null;
    }

    if (
  typeof global.viewTabsState ===
  "undefined"
) {
  /*
    Для старых проектов будет null.

    После загрузки view_tabs.js
    автоматически создаст все
    восемь стандартных вкладок.
  */
  global.viewTabsState = null;
}
  
    if (typeof global.treeHasFocus === "undefined") {
      global.treeHasFocus = true;
    }
  
    global.undoStack ||= [];
    global.redoStack ||= [];
  
    /* =========================
       Tree search / traversal
       ========================= */
  
    function findWithParent(node, id, parent = null) {
      if (!node || !id) return null;
      if (node.id === id) return { node, parent };
  
      for (const ch of node.children || []) {
        const r = findWithParent(ch, id, node);
        if (r) return r;
      }
  
      return null;
    }
  
    function canHaveChild(node) {
      return !!node && node.level < global.LEVEL.STEP;
    }
  
    function flatten() {
      const out = [];
  
      (function walk(n) {
        if (!n) return;
        out.push(n.id);
        for (const ch of n.children || []) walk(ch);
      })(global.root);
  
      return out;
    }
  
    function flattenWithLevels() {
      const out = [];
  
      (function walk(n) {
        if (!n) return;
        out.push({ id: n.id, level: n.level });
        for (const ch of n.children || []) walk(ch);
      })(global.root);
  
      return out;
    }
  
    function parentOf(id) {
      const r = findWithParent(global.root, id);
      return r && r.parent ? r.parent.id : null;
    }
  
    function firstChildOf(id) {
      const r = findWithParent(global.root, id);
      if (!r) return null;
      return r.node.children && r.node.children.length ? r.node.children[0].id : null;
    }
  
    function firstDeeperAfter(id) {
      const flat = flattenWithLevels();
      const idx = flat.findIndex((x) => x.id === id);
      if (idx < 0) return null;
  
      const baseLevel = flat[idx].level;
  
      for (let i = idx + 1; i < flat.length; i++) {
        if (flat[i].level > baseLevel) return flat[i].id;
      }
  
      return null;
    }
  
    function collectSubtreeIds(node) {
      const out = [];
  
      (function walk(n) {
        if (!n) return;
        out.push(n.id);
        for (const ch of n.children || []) walk(ch);
      })(node);
  
      return out;
    }

    function clearNodeMetadata(ids) {
      const uniqueIds = Array.from(new Set(ids || [])).filter(Boolean);
      if (!uniqueIds.length) return false;

      const sideMapNames = [
        "__fmtMap",
        "__colorFmtMap",
        "__blockBgMap",
        "__markMap",
        "__markHiddenMap",
      ];

      for (const id of uniqueIds) {
        for (const mapName of sideMapNames) {
          const map = global[mapName];

          if (map && typeof map === "object") {
            delete map[id];
          }
        }
      }

      global.hideNodes?.forget?.(uniqueIds);

      return true;
    }
  
    function getMaxLevelInSubtree(node) {
      if (!node) return global.LEVEL.COMPANY;
  
      let max = node.level;
  
      for (const ch of node.children || []) {
        max = Math.max(max, getMaxLevelInSubtree(ch));
      }
  
      return max;
    }
  
    /* =========================
       Ordinal helpers
       ========================= */
  
    function ordinalPathToString(path) {
      return Array.isArray(path) ? path.join(".") : "";
    }
  
    function buildOrdinalBadge(path) {
      const s = ordinalPathToString(path);
      if (!s) return null;
  
      const wrap = document.createElement("span");
      wrap.className = "ordinal-badge";
  
      const left = document.createElement("span");
      left.textContent = "[";
      left.className = "ordinal-bracket";
  
      const num = document.createElement("span");
      num.textContent = s;
      num.className = "ordinal-number";
  
      const right = document.createElement("span");
      right.textContent = "]";
      right.className = "ordinal-bracket";
  
      wrap.appendChild(left);
      wrap.appendChild(num);
      wrap.appendChild(right);
  
      return wrap;
    }
  
    /* =========================
       Snapshot / restore / history
       ========================= */
  
    function snapshot() {
      const state = {
        schemaVersion:
          global.projectDocument?.CURRENT_SCHEMA_VERSION ||
          global.PROJECT_SCHEMA_VERSION ||
          2,

        project: {
          root: global.root,
          views: global.viewTabsState
            ? JSON.parse(JSON.stringify(global.viewTabsState))
            : null,
          properties:
            global.projectProperties?.exportState?.() ||
            (global.projectPropertiesState
              ? JSON.parse(JSON.stringify(global.projectPropertiesState))
              : null),
          formatting: {
            text: global.__fmtMap || {},
            textColor: global.__colorFmtMap || {},
            blockBackground: global.__blockBgMap || {},
            marks: global.__markMap || {},
          },
          levelHeaderNames: global.__levelHeaderNames || {},
          hiddenNodeIds: global.hideNodes?.getAll?.() || [],
        },

        ui: {
          selectedId: global.selectedId,
          treeHasFocus: global.treeHasFocus,
          tableSelectedCell: global.tableSelectedCell,
          currentView: global.currentView,
          viewOrientation: global.viewOrientation,
          showOrdinals: global.showOrdinals,
          showCaptions: global.showCaptions,
        },
      };

      const document =
        global.projectDocument?.serialize?.(state) ||
        state;

      return JSON.stringify(document);
    }
  
    function replaceRootData(nextRoot) {
      if (!nextRoot || typeof nextRoot !== "object") return;
    
      const app = window;
    
      // Делаем чистую копию, чтобы новый проект не держал ссылки
      // на объекты из предыдущего проекта.
      const cleanRoot = JSON.parse(JSON.stringify(nextRoot));
    
      if (!app.root || typeof app.root !== "object") {
        app.root = cleanRoot;
        return;
      }
    
      // Важно для мультипроектности:
      // root остаётся тем же объектом, но полностью очищается от старых полей.
      Object.keys(app.root).forEach((key) => {
        delete app.root[key];
      });
    
      Object.assign(app.root, cleanRoot);
    
      if (!Array.isArray(app.root.children)) {
        app.root.children = [];
      }
    
      if (!Array.isArray(app.root.captions)) {
        app.root.captions = [];
      }
    
      if (!app.root.tableProps || typeof app.root.tableProps !== "object") {
        app.root.tableProps = {};
      }
    
      app.root.nameHtml ||= "";
      app.root.captionsBgColor ||= "";
    }
  
    function restore(state, options = {}) {
      const data =
        global.projectDocument?.hydrate?.(state) ||
        (
          typeof state === "string"
            ? JSON.parse(state)
            : JSON.parse(JSON.stringify(state))
        );
      const projectData = data.project || {
        root: data.root,
        views: data.viewTabsState,
        properties: data.projectPropertiesState,
        formatting: {
          text: data.__fmtMap,
          textColor: data.__colorFmtMap,
          blockBackground: data.__blockBgMap,
          marks: data.__markMap,
        },
        levelHeaderNames: data.__levelHeaderNames,
        hiddenNodeIds: data.__hiddenNodeIds,
      };
      const uiState = data.ui || data;
      const formatting = projectData.formatting || {};
      const shouldRender = options.shouldRender !== false;
  
      global.__suppressCaptionBlurCommit = true;
  
      replaceRootData(projectData.root);
  
      global.selectedId = uiState.selectedId || global.root.id;
      global.treeHasFocus =
        typeof uiState.treeHasFocus === "boolean" ? uiState.treeHasFocus : true;
  
        if (uiState.currentView && global.VIEW && Object.values(global.VIEW).includes(uiState.currentView)) {
            global.currentView = uiState.currentView;
          }
  
      if (
        uiState.viewOrientation &&
        global.VIEW_ORIENTATION &&
        Object.values(global.VIEW_ORIENTATION).includes(uiState.viewOrientation)
      ) {
        global.viewOrientation = uiState.viewOrientation;
      }
  
      if (typeof uiState.showOrdinals === "boolean") global.showOrdinals = uiState.showOrdinals;
      if (typeof uiState.showCaptions === "boolean") global.showCaptions = uiState.showCaptions;

      global.tableSelectedCell = uiState.tableSelectedCell || null;

      global.viewTabsState =
  projectData.views
    ? JSON.parse(
        JSON.stringify(
          projectData.views
        )
      )
    : null;

/*
  Если модуль вкладок уже загружен,
  сразу нормализуем состояние.

  Для старого сохранения с null
  будут созданы стандартные виды.
*/
global.viewTabs
  ?.normalizeState?.();

  /*
  Миграция старых сохранений.

  Раньше Нумерация и Описание
  хранились прямо в snapshot:

    showOrdinals
    showCaptions

  Теперь они принадлежат
  settings конкретной вкладки.

  Миграция нужна только тогда,
  когда у старого проекта ещё
  не было viewTabsState.
*/

if (!projectData.views) {
  const activeItem =
    global.viewTabs
      ?.getActiveItem?.();

  const settings =
    global.viewSettings
      ?.ensureItemSettings?.(
        activeItem
      );

  if (
    settings &&
    typeof uiState.showOrdinals ===
      "boolean"
  ) {
    settings
      .properties
      .ordinals =
        uiState.showOrdinals;
  }

  if (
    settings &&
    typeof uiState.showCaptions ===
      "boolean"
  ) {
    settings
      .properties
      .captions =
        uiState.showCaptions;
  }
}

  /*
  Восстанавливаем проектный
  реестр свойств.

  У старого проекта поля ещё нет,
  поэтому normalizeState создаст
  реестр, где все нынешние свойства
  считаются созданными.
*/

global.projectPropertiesState =
  projectData.properties &&
  typeof projectData
    .properties ===
    "object"
    ? JSON.parse(
        JSON.stringify(
          projectData
            .properties
        )
      )
    : null;

global.projectProperties
  ?.normalizeState?.();
  
      global.__fmtMap = formatting.text || Object.create(null);
      global.__colorFmtMap = formatting.textColor || Object.create(null);
      global.__blockBgMap = formatting.blockBackground || Object.create(null);
      global.__markMap =
  formatting.marks ||
  Object.create(null);

/*
  __markHiddenMap не является
  данными проекта.

  При любом restore начинаем
  временное состояние скрытия
  с чистого состояния.

  Заодно отменяем таймеры,
  которые могли остаться
  от предыдущего проекта.
*/

if (
  global.markProperty
    ?.resetTransientState
) {
  global.markProperty
    .resetTransientState();
} else {
  global.__markHiddenMap =
    Object.create(null);
}

global.__levelHeaderNames =
  projectData.levelHeaderNames ||
  Object.create(null);

global.hideNodes
  ?.replaceAll?.(
    projectData.hiddenNodeIds || []
  );
  
      if (!findWithParent(global.root, global.selectedId)) {
        global.selectedId = global.root.id;
      }
  
      if (typeof global.renamingId !== "undefined") {
        global.renamingId = null;
      }
  
      if (shouldRender && typeof global.render === "function") {
        global.render();
      }
  
      queueMicrotask(() => {
        global.__suppressCaptionBlurCommit = false;
      });
    }
  
    function pushHistory() {
      global.undoStack.push(snapshot());
      global.redoStack.length = 0;
    }
  
    function undo() {
      if (!global.undoStack.length) return;
      global.redoStack.push(snapshot());
      const prev = global.undoStack.pop();
      restore(prev);
    }
  
    function redo() {
      if (!global.redoStack.length) return;
      global.undoStack.push(snapshot());
      const next = global.redoStack.pop();
      restore(next);
    }
  
    /* =========================
       Tree mutations
       ========================= */
  
    function requestRender() {
      if (typeof global.render === "function") {
        global.render();
      }
    }
  
    function requestRenameLater(id) {
      if (!id) return;
      if (typeof global.startRename !== "function") return;
  
      setTimeout(() => {
        global.startRename(id);
      }, 0);
    }
  
    function addChild(parentId) {
      const r = findWithParent(global.root, parentId);
      if (!r) return;
      if (!canHaveChild(r.node)) return;
  
      pushHistory();
  
      const child = makeNode(r.node.level + 1);
      r.node.children ||= [];
      r.node.children.push(child);
  
      global.selectedId = child.id;
      global.treeHasFocus = true;
  
      requestRender();
      requestRenameLater(child.id);
    }
  
    function addCaption(nodeId) {
      const r = findWithParent(global.root, nodeId);
      if (!r) return;
  
      if (!Array.isArray(r.node.captions)) {
        r.node.captions = [];
      }
  
      global.selectedId = nodeId;
      global.treeHasFocus = true;
  
      if (r.node.captions.length > 0) {
        const cap = r.node.captions[0];
        requestRender();
  
        setTimeout(() => {
          global.startCaptionEdit?.(nodeId, cap.id);
        }, 0);
  
        return;
      }
  
      pushHistory();
  
      const cap = makeCaption("");
      r.node.captions = [cap];
  
      requestRender();
  
      setTimeout(() => {
        global.startCaptionEdit?.(nodeId, cap.id, { isNew: true });
      }, 0);
    }
  
    function addSibling(targetId) {
      if (targetId === global.root.id) {
        addChild(global.root.id);
        return;
      }
  
      const r = findWithParent(global.root, targetId);
      if (!r || !r.parent) return;
  
      pushHistory();
  
      const parent = r.parent;
      const idx = parent.children.findIndex((x) => x.id === targetId);
      const sib = makeNode(r.node.level);
  
      const insertAt = idx >= 0 ? idx + 1 : parent.children.length;
      parent.children.splice(insertAt, 0, sib);
  
      global.selectedId = sib.id;
      global.treeHasFocus = true;
  
      requestRender();
      requestRenameLater(sib.id);
    }
  
    function removeSelected() {
      const selectedId = global.selectedId;
      if (!selectedId) return;
      if (selectedId === global.root.id) return;
  
      const r = findWithParent(global.root, selectedId);
      if (!r || !r.parent) return;
  
      const parent = r.parent;
      const arr = parent.children;
      const idx = arr.findIndex((x) => x.id === selectedId);
      if (idx < 0) return;
  
      pushHistory();

      const removedIds = collectSubtreeIds(r.node);
  
      let nextSelected = null;
  
      if (idx + 1 < arr.length) nextSelected = arr[idx + 1].id;
      else if (idx - 1 >= 0) nextSelected = arr[idx - 1].id;
      else nextSelected = parent.id;
  
      parent.children.splice(idx, 1);

      clearNodeMetadata(removedIds);
  
      global.selectedId = nextSelected;
      global.treeHasFocus = true;
  
      requestRender();
    }
  
    function moveWithinParent(dir) {
      const selectedId = global.selectedId;
      if (!selectedId) return;
      if (selectedId === global.root.id) return;
  
      const r = findWithParent(global.root, selectedId);
      if (!r || !r.parent) return;
  
      const arr = r.parent.children;
      const idx = arr.findIndex((x) => x.id === selectedId);
      if (idx < 0) return;
  
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
  
      pushHistory();
  
      const tmp = arr[idx];
      arr[idx] = arr[j];
      arr[j] = tmp;
  
      requestRender();
    }
  
    function shiftSubtreeLevel(node, delta) {
      const oldLevel = node.level;
      const newLevel = oldLevel + delta;
  
      if (newLevel < global.LEVEL.COMPANY || newLevel > global.LEVEL.STEP) {
        return false;
      }
  
      const oldDefault = getDefaultNodeName(oldLevel);
      const newDefault = getDefaultNodeName(newLevel);
  
      const plainName = String(node.name || "").trim();
      const htmlText = node.nameHtml ? htmlPlainText(node.nameHtml) : "";
  
      const shouldRenameDefault = plainName === oldDefault || htmlText === oldDefault;
  
      if (shouldRenameDefault) {
        node.name = newDefault;
  
        if (node.nameHtml) {
          node.nameHtml = replaceTextInsideHtmlPreservingMarkup(node.nameHtml, newDefault);
        }
      }
  
      node.level = newLevel;
  
      for (const ch of node.children || []) {
        const ok = shiftSubtreeLevel(ch, delta);
        if (!ok) return false;
      }
  
      return true;
    }
  
    function moveNodeRelativeToTarget(id, targetId, insertMode) {
      if (!id || !targetId) return false;
      if (id === global.root.id) return false;
      if (id === targetId) return false;
      if (insertMode !== "before" && insertMode !== "after") return false;
  
      const movingInfo = findWithParent(global.root, id);
      const targetInfo = findWithParent(global.root, targetId);
  
      if (!movingInfo || !targetInfo) return false;
      if (!movingInfo.parent) return false;
  
      let cur = targetId;
      while (cur) {
        const p = parentOf(cur);
        if (!p) break;
        if (p === id) return false;
        cur = p;
      }
  
      const wasDefault =
        String(movingInfo.node.name || "").trim() ===
        String(getDefaultNodeName(movingInfo.node.level) || "").trim();
  
      pushHistory();
  
      movingInfo.parent.children = (movingInfo.parent.children || []).filter(
        (n) => n.id !== id
      );
  
      const freshTarget = findWithParent(global.root, targetId);
      if (!freshTarget || !freshTarget.parent) {
        undo();
        return false;
      }
  
      const destinationParent = freshTarget.parent;
      destinationParent.children ||= [];
  
      const targetIdx = destinationParent.children.findIndex((n) => n.id === targetId);
      if (targetIdx < 0) {
        undo();
        return false;
      }
  
      const insertAt = insertMode === "before" ? targetIdx : targetIdx + 1;
      const newLevel = freshTarget.node.level;
      const delta = newLevel - movingInfo.node.level;
  
      if (delta !== 0) {
        const ok = shiftSubtreeLevel(movingInfo.node, delta);
        if (!ok) {
          undo();
          return false;
        }
      }
  
      if (wasDefault) {
        const def = getDefaultNodeName(movingInfo.node.level);
        if (def) movingInfo.node.name = def;
      }
  
      destinationParent.children.splice(insertAt, 0, movingInfo.node);
  
      global.selectedId = id;
      global.treeHasFocus = true;
  
      requestRender();
      return true;
    }
  
    function moveByVisibleOrder(dir) {
      const selectedId = global.selectedId;
      if (!selectedId) return false;
      if (selectedId === global.root.id) return false;
      if (dir !== -1 && dir !== 1) return false;
  
      const flat = flatten();
      const idx = flat.indexOf(selectedId);
      if (idx < 0) return false;
  
      if (dir === -1) {
        const prevId = flat[idx - 1];
        if (!prevId) return false;
        return moveNodeRelativeToTarget(selectedId, prevId, "before");
      }
  
      let nextId = null;
  
      for (let i = idx + 1; i < flat.length; i++) {
        const candidateId = flat[i];
        let cur = candidateId;
        let isDescendant = false;
  
        while (cur) {
          const p = parentOf(cur);
          if (!p) break;
          if (p === selectedId) {
            isDescendant = true;
            break;
          }
          cur = p;
        }
  
        if (!isDescendant) {
          nextId = candidateId;
          break;
        }
      }
  
      if (!nextId) return false;
  
      const nextInfo = findWithParent(global.root, nextId);
      if (!nextInfo) return false;
  
      const nextChildren = Array.isArray(nextInfo.node.children)
        ? nextInfo.node.children
        : [];
  
      if (nextChildren.length > 0) {
        const firstChildId = nextChildren[0].id;
        return moveNodeRelativeToTarget(selectedId, firstChildId, "before");
      }
  
      return moveNodeRelativeToTarget(selectedId, nextId, "after");
    }
  
    function indentNode(id) {
      if (!id || id === global.root.id) return;
  
      const r = findWithParent(global.root, id);
      if (!r || !r.parent) return;
  
      const siblings = r.parent.children;
      const idx = siblings.findIndex((x) => x.id === id);
      if (idx <= 0) return;
  
      const newParent = siblings[idx - 1];
      if (!canHaveChild(newParent)) return;
  
      const maxL = getMaxLevelInSubtree(r.node);
      if (maxL + 1 > global.LEVEL.STEP) return;
  
      pushHistory();
  
      if (!shiftSubtreeLevel(r.node, +1)) return;
  
      siblings.splice(idx, 1);
      newParent.children.push(r.node);
  
      global.selectedId = id;
      global.treeHasFocus = true;
  
      requestRender();
    }
  
    function outdentNode(id) {
      if (!id || id === global.root.id) return;
  
      const r = findWithParent(global.root, id);
      if (!r || !r.parent) return;
  
      const parent = r.parent;
      const gp = findWithParent(global.root, parent.id)?.parent;
      if (!gp) return;
  
      pushHistory();
  
      if (!shiftSubtreeLevel(r.node, -1)) return;
  
      parent.children = parent.children.filter((x) => x.id !== id);
  
      const pIdx = gp.children.findIndex((x) => x.id === parent.id);
      gp.children.splice(pIdx + 1, 0, r.node);
  
      global.selectedId = id;
      global.treeHasFocus = true;
  
      requestRender();
    }
  
    /* =========================
       Shared UI helpers
       ========================= */
  
    function isTreeLocked() {
      return global.hotkeysMode === "custom";
    }
  
    function makeBtn(midText, onClick) {
      const b = document.createElement("span");
      b.className = "btn";
  
      const l = document.createElement("span");
      l.className = "br";
      l.textContent = "[";
  
      const m = document.createElement("span");
      m.className = "mid";
      m.textContent = midText;
  
      const r = document.createElement("span");
      r.className = "br";
      r.textContent = "]";
  
      b.append(l, m, r);
  
      b.addEventListener("click", (e) => {
        if (isTreeLocked()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick(e);
      });
  
      return b;
    }
  
    function renderCaptions(node, li) {
      if (!global.showCaptions || !Array.isArray(node.captions) || !node.captions.length) {
        return;
      }
  
      const caps = document.createElement("div");
      caps.className = "captions";
  
      if (node.captionsBgColor) {
        caps.style.backgroundColor = node.captionsBgColor;
      }
  
      for (const c of node.captions) {
        const cap = document.createElement("div");
  
        const isMultiline =
          (c.text || "").includes("\n") ||
          (c.textHtml || "").includes("<br>");
  
        cap.className = "caption" + (isMultiline ? " caption-multiline" : "");
        cap.dataset.nodeId = node.id;
        cap.dataset.captionId = c.id;
  
        if (c.textHtml) cap.innerHTML = c.textHtml;
        else cap.textContent = c.text || "";
  
        cap.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          global.selectedId = node.id;
          global.treeHasFocus = true;
          global.startCaptionEdit?.(node.id, c.id);
        });
  
        caps.appendChild(cap);
      }
  
      li.appendChild(caps);
    }
  
    function syncProjectsSidebar() {
      const firstProjectItem = document.querySelector(".projects-list .project-item");
      if (!firstProjectItem) return;
  
      const projectTitle =
        (global.root?.name || "").trim() ||
        getDefaultNodeName(global.LEVEL.COMPANY) ||
        "Проект";
  
      firstProjectItem.textContent = projectTitle;
      firstProjectItem.title = projectTitle;
    }
  
    function initProjectsSidebar() {
      const addButton = document.querySelector(".project-add");
      const projectsList = document.querySelector(".projects-list");
  
      if (!addButton || !projectsList) return;
      if (addButton.dataset.bound === "1") return;
  
      addButton.dataset.bound = "1";
      addButton.addEventListener("click", () => {
        const projectItem = document.createElement("button");
        projectItem.className = "project-item";
        projectItem.type = "button";
        projectItem.textContent = "Новый проект";
        projectItem.title = "Проект";
        projectsList.appendChild(projectItem);
      });
    }
  
    /* =========================
       Hotkey helpers
       ========================= */
  
    function isMod(e) {
      return (e.metaKey || e.ctrlKey) && !e.altKey;
    }
  
    function isTextEditingElement(el) {
      if (!el) return false;
      if (el.isContentEditable) return true;
  
      const tag = String(el.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
  
      return false;
    }
  
    function getPlatformInfo() {
      return global.hotkeys?.getPlatformInfo?.() || {
        isMac: false,
        primaryToken: "Primary",
      };
    }
  
    function normalizeBaseKeyFromEvent(e) {
      if (!e) return "";
  
      const k = String(e.key || "");
      if (
        k === "Shift" ||
        k === "Alt" ||
        k === "Control" ||
        k === "Meta" ||
        k === "OS"
      ) {
        return "";
      }
  
      const code = String(e.code || "");
      if (code.startsWith("Key") && code.length === 4) return code.slice(3).toUpperCase();
      if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
      if (code.startsWith("Numpad") && code.length === 7 && /[0-9]/.test(code.slice(6))) {
        return code.slice(6);
      }
  
      if (k === " " || k === "Spacebar") return "Space";
      if (k === "Esc") return "Escape";
      if (k === "+") return "Plus";
  
      if (code === "BracketLeft") return "BracketLeft";
      if (code === "BracketRight") return "BracketRight";
  
      if (k.length === 1) return k.toUpperCase();
      return k;
    }
  
    function comboFromKeyEvent(e) {
      const { isMac, primaryToken } = getPlatformInfo();
  
      const base = normalizeBaseKeyFromEvent(e);
      if (!base) return "";
  
      const tokens = [];
      const primaryDown = isMac ? !!e.metaKey : !!e.ctrlKey;
  
      if (primaryDown) tokens.push(primaryToken);
      if (e.altKey) tokens.push("Alt");
      if (e.shiftKey) tokens.push("Shift");
  
      tokens.push(base);
  
      if (tokens.length === 2 && tokens.includes("Shift") && tokens.includes("Plus")) {
        return "+";
      }
  
      return global.hotkeys?.normalizeCombo?.(tokens.join("+")) || tokens.join("+");
    }
  
    function comboFromMouseEvent(e, baseToken) {
      const { isMac, primaryToken } = getPlatformInfo();
  
      const tokens = [];
      const primaryDown = isMac ? !!e.metaKey : !!e.ctrlKey;
  
      if (primaryDown) tokens.push(primaryToken);
      if (e.altKey) tokens.push("Alt");
      if (e.shiftKey) tokens.push("Shift");
  
      tokens.push(baseToken);
  
      return global.hotkeys?.normalizeCombo?.(tokens.join("+")) || tokens.join("+");
    }

    /*
  Навигационные действия разделены
  между четырьмя группами отображений.

  Эта проверка не позволяет старым
  обработчикам запускать действие,
  принадлежащее другой группе.
*/

const LISTS_NAV_ACTIONS =
  new Set([
    "navUp",
    "navDown",

    /*
      Старые действия оставлены здесь
      для защиты от старого кода.
    */
    "navLeft",
    "navRight",

    "levelNavUp",
    "levelNavDown",

    "branchNavLeft",
    "branchNavRight",
  ]);

const HORIZONTAL_NAV_ACTIONS =
  new Set([
    "horizontalListUp",
    "horizontalListDown",

    "horizontalLevelUp",
    "horizontalLevelDown",

    "horizontalBranchLeft",
    "horizontalBranchRight",
  ]);

const VERTICAL_NAV_ACTIONS =
  new Set([
    "verticalListUp",
    "verticalListDown",

    "verticalLevelLeft",
    "verticalLevelRight",

    "verticalBranchUp",
    "verticalBranchDown",
  ]);

const TABLE_NAV_ACTIONS =
  new Set([
    "tableListUp",
    "tableListDown",

    "tablePropertyLeft",
    "tablePropertyRight",
  ]);

function isNavigationActionAllowed(
  action
) {
  const group =
    global.hotkeysViewGroup
      ?.getActiveGroup?.();

  /*
    При старом подключении без модуля
    групп сохраняем прежнее поведение.
  */
  if (!group) {
    return true;
  }

  if (
    LISTS_NAV_ACTIONS.has(action)
  ) {
    return (
      group === "lists" ||
      group === "main"
    );
  }

  if (
    HORIZONTAL_NAV_ACTIONS
      .has(action)
  ) {
    return (
      group === "horizontal"
    );
  }

  if (
    VERTICAL_NAV_ACTIONS
      .has(action)
  ) {
    return (
      group === "vertical"
    );
  }

  if (
    TABLE_NAV_ACTIONS.has(action)
  ) {
    return (
      group === "table"
    );
  }

  /*
    Мультивыбор, перемещение,
    редактирование и остальные
    общие действия не ограничиваем.
  */
  return true;
}
  
function isHotkey(e, action) {
  /*
    Сначала проверяем, разрешено ли
    это действие в текущем отображении.
  */
  if (
    !isNavigationActionAllowed(
      action
    )
  ) {
    return false;
  }

  const wantRaw =
    global.hotkeys?.get?.(action);

  if (!wantRaw) {
    return false;
  }

  if (e.repeat) {
    return false;
  }
  
      const ae = document.activeElement;
      if (isTextEditingElement(ae)) return false;
      if (ae?.classList?.contains?.("edit")) return false;
      if (ae?.classList?.contains?.("tg-export")) return false;
  
      const haveRaw = comboFromKeyEvent(e);
      if (!haveRaw) return false;
  
      const normalize = global.hotkeys?.normalizeCombo;
      const want = normalize ? normalize(wantRaw) : wantRaw;
      const have = normalize ? normalize(haveRaw) : haveRaw;
  
      return have === want;
    }
  
    function isMouseHotkey(e, action, baseToken) {
      const wantRaw = global.hotkeys?.get?.(action);
      if (!wantRaw) return false;
  
      const ae = document.activeElement;
      if (isTextEditingElement(ae)) return false;
      if (ae?.classList?.contains?.("edit")) return false;
      if (ae?.classList?.contains?.("tg-export")) return false;
  
      const haveRaw = comboFromMouseEvent(e, baseToken);
      const normalize = global.hotkeys?.normalizeCombo;
      const want = normalize ? normalize(wantRaw) : wantRaw;
      const have = normalize ? normalize(haveRaw) : haveRaw;
  
      return have === want;
    }
  
    function isUndoHotkey(e) {
      if (!global.hotkeys?.get) return false;
      return isHotkey(e, "undo");
    }
  
    function isRedoHotkey(e) {
      if (!global.hotkeys?.get) return false;
      return isHotkey(e, "redo");
    }
  
    /* =========================
       Public API / globals
       ========================= */
  
    Object.assign(global, {
      getDefaultNodeName,
      uid,
      makeNode,
      makeCaption,
      esc,
      cssEscape,
      htmlPlainText,
      replaceTextInsideHtmlPreservingMarkup,
  
      findWithParent,
      canHaveChild,
      flatten,
      flattenWithLevels,
      parentOf,
      firstChildOf,
      firstDeeperAfter,
      collectSubtreeIds,
      clearNodeMetadata,
      getMaxLevelInSubtree,
  
      ordinalPathToString,
      buildOrdinalBadge,
  
      snapshot,
      restore,
      pushHistory,
      undo,
      redo,
  
      addChild,
      addCaption,
      addSibling,
      removeSelected,
      moveWithinParent,
      shiftSubtreeLevel,
      moveNodeRelativeToTarget,
      moveByVisibleOrder,
      indentNode,
      outdentNode,
  
      isTreeLocked,
      makeBtn,
      renderCaptions,
      syncProjectsSidebar,
      initProjectsSidebar,
  
      isMod,
      isTextEditingElement,
      getPlatformInfo,
      normalizeBaseKeyFromEvent,
      comboFromKeyEvent,
      comboFromMouseEvent,
      isHotkey,
      isMouseHotkey,
      isUndoHotkey,
      isRedoHotkey,
    });
  })();
