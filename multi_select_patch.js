// multi_select_patch.js
// Массовое выделение подряд ТОЛЬКО на одном уровне (внутри одного UL):
// - rangeUp / rangeDown
// - rangeClick мышью: может быть и Click, и DblClick
//
// Подсветка: голубым
//
// API:
// window.multiSelect = { getIds, clear, has, size, debug, handleRangeKey }

(function () {
  if (typeof window === "undefined") return;

  const HOST_ID = "tree";

  const state = {
    anchorId: null,
    activeId: null,
    contextKey: null,
    ids: new Set(),
  };

  let synth = 0;
  let pendingSingleTimer = null;

  function host() {
    return document.getElementById(HOST_ID);
  }

  function cssEscapeLocal(s) {
    const v = String(s);
    if (window.CSS && typeof CSS.escape === "function") return CSS.escape(v);
    return v.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
  }

  function rowById(id) {
    const h = host();
    if (!h) return null;
    return h.querySelector(`.row[data-id="${cssEscapeLocal(id)}"]`);
  }

  function selectedRow() {
    const h = host();
    if (!h) return null;
    return h.querySelector(".row.sel");
  }

  function contextKeyForRow(row) {
    if (!row) return null;
  
    const id = row.dataset?.id;
    if (!id) return null;
  
    const found = findWithParent(root, id);
    if (!found || !found.node) return null;
  
    return String(found.node.level);
  }

  function siblingRows(row) {
    if (!row) return [];
  
    const id = row.dataset?.id;
    if (!id) return [];
  
    const found = findWithParent(root, id);
    if (!found || !found.node) return [];
  
    const targetLevel = found.node.level;
    const h = host();
    if (!h) return [];
  
    return Array.from(h.querySelectorAll(".row[data-id]")).filter((r) => {
      const rid = r.dataset?.id;
      if (!rid) return false;
  
      const info = findWithParent(root, rid);
      return !!info && !!info.node && info.node.level === targetLevel;
    });
  }

  function reset() {
    state.anchorId = null;
    state.activeId = null;
    state.contextKey = null;
    state.ids.clear();
  }

  function applyClasses() {
    const h = host();
    if (!h) return;
  
    h.querySelectorAll('.row[data-multi-owner="level"]').forEach((el) => {
      el.classList.remove("multi");
      el.classList.remove("multi-anchor");
      el.removeAttribute("data-multi-owner");
    });
  
    for (const id of state.ids) {
      const r = rowById(id);
      if (r) {
        r.classList.add("multi");
        r.setAttribute("data-multi-owner", "level");
  
        if (id === state.anchorId) {
          r.classList.add("multi-anchor");
        }
      }
    }
  }

  function setRange(anchorRow, activeRow) {
    if (!anchorRow || !activeRow) return false;

    const aCtx = contextKeyForRow(anchorRow);
    const bCtx = contextKeyForRow(activeRow);

    if (!aCtx || !bCtx || aCtx !== bCtx) return false;

    const sibs = siblingRows(anchorRow);
    const ia = sibs.indexOf(anchorRow);
    const ib = sibs.indexOf(activeRow);
    if (ia < 0 || ib < 0) return false;

    const from = Math.min(ia, ib);
    const to = Math.max(ia, ib);
    state.anchorId = anchorRow.dataset.id;
    state.activeId = activeRow.dataset.id;
    state.contextKey = aCtx;
    state.ids = new Set(sibs.slice(from, to + 1).map((r) => r.dataset.id));
    return true;
  }

  function clickRow(row) {
    if (!row) return;
    synth++;
    try {
      row.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    } finally {
      synth--;
    }
  }

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;
    if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
    if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function clearPendingSingle() {
    if (pendingSingleTimer) {
      clearTimeout(pendingSingleTimer);
      pendingSingleTimer = null;
    }
  }

  if (typeof window.render === "function" && !window.render.__multiLevelPatchedV2) {
    const _render = window.render;
    window.render = function patchedRender() {
      _render();
      applyClasses();
    };
    window.render.__multiLevelPatchedV2 = true;
  }

  // function handleRangeKey(dir) {
  //   const cur = selectedRow();
  //   if (!cur) return;
  
  //   const ctx = contextKeyForRow(cur);
  //   if (!ctx) return;
  
  //   const sibs = siblingRows(cur);
  //   const idx = sibs.indexOf(cur);
  //   if (idx < 0) return;
  
  //   const next = sibs[idx + dir];
  //   if (!next) return;
  
  //   if (!state.anchorId || state.contextKey !== ctx) {
  //     state.anchorId = cur.dataset.id;
  //     state.contextKey = ctx;
  
  //     const ok = setRange(cur, next);
  
  //     if (!ok) {
  //       state.ids = new Set([cur.dataset.id, next.dataset.id]);
  //     }
  
  //     selectedId = state.anchorId;
  //     treeHasFocus = true;
  //     rowById(state.anchorId)?.focus?.({ preventScroll: true });
  
  //     applyClasses();
  //     return;
  //   }
  
  //   const anchor = rowById(state.anchorId) || cur;
  //   const anchorIndex = sibs.indexOf(anchor);
  
  //   if (anchorIndex < 0) return;
  
  //   const selectedIds = Array.from(state.ids);
  //   const selectedRows = selectedIds
  //     .map((id) => rowById(id))
  //     .filter(Boolean);
  
  //   const selectedIndexes = selectedRows
  //     .map((r) => sibs.indexOf(r))
  //     .filter((i) => i >= 0);
  
  //   const currentEdgeIndex =
  //     dir > 0
  //       ? Math.max(...selectedIndexes)
  //       : Math.min(...selectedIndexes);
  
  //   const nextEdge = sibs[currentEdgeIndex + dir];
  //   if (!nextEdge) return;
  
  //   const ok = setRange(anchor, nextEdge);
  
  //   if (!ok) {
  //     state.ids = new Set([state.anchorId, nextEdge.dataset.id]);
  //   }
  
  //   selectedId = state.anchorId;
  //   treeHasFocus = true;
  //   rowById(state.anchorId)?.focus?.({ preventScroll: true });
  
  //   applyClasses();
  // }

  function handleRangeKey(dir) {
    const cur = selectedRow();
    if (!cur) return;
  
    const ctx = contextKeyForRow(cur);
    if (!ctx) return;
  
    const sibs = siblingRows(cur);
    const idx = sibs.indexOf(cur);
    if (idx < 0) return;
  
    if (!state.anchorId || state.contextKey !== ctx) {
      const next = sibs[idx + dir];
      if (!next) return;
  
      state.anchorId = cur.dataset.id;
      state.activeId = next.dataset.id;
      state.contextKey = ctx;
  
      const ok = setRange(cur, next);
  
      if (!ok) {
        state.ids = new Set([cur.dataset.id, next.dataset.id]);
      }
  
     
  selectedId = state.anchorId;
  treeHasFocus = true;
  rowById(state.anchorId)?.focus?.({ preventScroll: true });

  
      applyClasses();
      return;
    }
  
    const anchor = rowById(state.anchorId) || cur;
    const active = rowById(state.activeId) || anchor;
  
    const anchorIndex = sibs.indexOf(anchor);
    const activeIndex = sibs.indexOf(active);
  
    if (anchorIndex < 0 || activeIndex < 0) return;
  
    const nextActive = sibs[activeIndex + dir];
    if (!nextActive) return;
  
    state.activeId = nextActive.dataset.id;
  
    const ok = setRange(anchor, nextActive);
  
    if (!ok) {
      state.ids = new Set([state.anchorId, state.activeId]);
    }
  
   
  selectedId = state.anchorId;
  treeHasFocus = true;
  rowById(state.anchorId)?.focus?.({ preventScroll: true });

  
    applyClasses();
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (window.hotkeysMode === "custom") return;
      if (isEditingNow()) return;
      if (typeof isHotkey !== "function") return;
      if (window.currentView === window.VIEW?.TABLE) return;

      if (isHotkey(e, "rangeUp")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        handleRangeKey(-1);
        return;
      }

      if (isHotkey(e, "rangeDown")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        handleRangeKey(+1);
        return;
      }
    },
    true
  );

  function processRangeRow(row) {
    const clicked = row;
    const ctxClicked = contextKeyForRow(clicked);
    const id = clicked.dataset.id;
  
    if (!state.contextKey || state.contextKey !== ctxClicked || !state.anchorId) {
      state.contextKey = ctxClicked;
      state.anchorId = id;
      state.activeId = id;
      state.ids = new Set([id]);
     
  selectedId = state.anchorId;
  treeHasFocus = true;
  rowById(state.anchorId)?.focus?.({ preventScroll: true });

  
      applyClasses();
      return;
    }
  
    if (state.ids.has(id)) {
  if (id !== state.anchorId) {
    state.ids.delete(id);
  }
} else {
  state.ids.add(id);
}

state.activeId = id;
  
  selectedId = state.anchorId;
  treeHasFocus = true;
  rowById(state.anchorId)?.focus?.({ preventScroll: true });
  
    applyClasses();
  }

  function handleRangePointer(e, baseToken) {
    if (synth) return;

    const row = e.target?.closest?.(".row") || null;

    if (e.target?.closest?.(".act")) return;

    if (!row) {
      if (baseToken === "Click") {
        reset();
        applyClasses();
      }
      return;
    }

    if (typeof isMouseHotkey !== "function") {
      if (baseToken === "Click") {
        reset();
        applyClasses();
      }
      return;
    }

    if (!isMouseHotkey(e, "rangeClick", baseToken)) {
      if (baseToken === "Click") {
        reset();
        applyClasses();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    processRangeRow(row);
  }

  function installPointerHandlers() {
    const h = host();
    if (!h) return;
    if (h.__multiLevelClickInstalledV2) return;
    h.__multiLevelClickInstalledV2 = true;

    h.addEventListener(
      "click",
      (e) => {
        if (synth) return;

        clearPendingSingle();

        // ждём немного: вдруг это начало dblclick
        pendingSingleTimer = setTimeout(() => {
          pendingSingleTimer = null;
          handleRangePointer(e, "Click");
        }, 230);
      },
      true
    );

    h.addEventListener(
      "dblclick",
      (e) => {
        if (synth) return;

        clearPendingSingle();
        handleRangePointer(e, "DblClick");
      },
      true
    );
  }

  installPointerHandlers();

  function selectLevel(
  level
) {
  const targetLevel =
    Number(level);

  const tree =
    host();

  if (
    !tree ||
    !Number.isInteger(
      targetLevel
    )
  ) {
    return false;
  }

  /*
    Берём только реально отображаемые
    строки структурной части.

    Строки таблицы совмещённого режима
    сюда не попадают.
  */

  const rows =
    Array.from(
      tree.querySelectorAll(
        ".row[data-id]"
      )
    ).filter(
      (row) => {
        if (
          !row
            .getClientRects()
            .length
        ) {
          return false;
        }

        if (
          row.closest(
            ".structure-table"
          )
        ) {
          return false;
        }

        const id =
          row.dataset.id;

        const found =
          findWithParent(
            root,
            id
          );

        return (
          found?.node?.level ===
          targetLevel
        );
      }
    );

  if (!rows.length) {
    reset();
    applyClasses();

    return false;
  }

  /*
    Если активный объект уже находится
    на выбранном уровне, сохраняем его
    как опорный.

    Иначе активным становится первый
    видимый объект уровня.
  */

  const anchorRow =
    rows.find(
      (row) =>
        row.dataset.id ===
        String(selectedId)
    ) ||
    rows[0];

  clickRow(
    anchorRow
  );

  state.anchorId =
    anchorRow.dataset.id;

  state.activeId =
    rows[
      rows.length - 1
    ].dataset.id;

  state.contextKey =
    String(targetLevel);

  state.ids =
    new Set(
      rows.map(
        (row) =>
          row.dataset.id
      )
    );

  selectedId =
    state.anchorId;

  treeHasFocus =
    true;

  applyClasses();

  rowById(
    state.anchorId
  )?.focus?.({
    preventScroll: true,
  });

  return true;
}

  window.multiSelect = {
    getIds() {
      return Array.from(state.ids);
    },
    clear() {
      reset();
      applyClasses();
    },
    has(id) {
      return state.ids.has(id);
    },
    size() {
      return state.ids.size;
    },
    debug() {
      return {
        anchorId: state.anchorId,
        activeId: state.activeId,
        contextKey: state.contextKey,
        ids: Array.from(state.ids),
      };
    },
    selectLevel,
    handleRangeKey
  };

  window.addEventListener(
    "keydown",
    (e) => {
      if (isEditingNow()) return;

      const noMods = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
      if (
        noMods &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        window.multiSelect?.clear?.();
      }
    },
    true
  );

  try {
    applyClasses();
  } catch (_) {}
})();