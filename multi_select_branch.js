// multi_select_branch.js
// Выделение по одной branch-цепочке:
// Primary+Alt+Shift+ArrowLeft
// Primary+Alt+Shift+ArrowRight
//
// Логика как у alt+ArrowLeft / alt+ArrowRight,
// но с range-выделением по цепочке:
// parent <-> current <-> firstChild <-> firstChild...

(function () {
  if (typeof window === "undefined") return;

  const HOST_ID = "tree";

  const state = {
    ids: new Set(),
    anchorId: null,
    activeId: null,
    branchKey: null,
  };

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

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;
    if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
    if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function branchKeyForRow(row) {
    if (!row) return null;
    return row.dataset?.id || null;
  }

  function buildAncestorChain(id) {
    const out = [];
    let cur = id;

    while (cur) {
      out.push(cur);
      cur = parentOf(cur);
    }

    out.reverse();
    return out;
  }

  function buildDescendantFirstChildChain(id) {
    const out = [];
    let cur = firstChildOf(id);

    while (cur) {
      out.push(cur);
      cur = firstChildOf(cur);
    }

    return out;
  }

  function rowsInBranchChain(branchKey) {
    const out = [];
    if (!branchKey) return out;

    const ids = [
      ...buildAncestorChain(branchKey),
      ...buildDescendantFirstChildChain(branchKey),
    ];

    for (const id of ids) {
      const row = rowById(id);
      if (row) out.push(row);
    }

    return out;
  }

  function reset() {
    state.ids.clear();
    state.anchorId = null;
    state.activeId = null;
    state.branchKey = null;
  }

  function applyClasses() {
    const h = host();
    if (!h) return;

    h.querySelectorAll('.row[data-multi-owner="branch"]').forEach((el) => {
      el.classList.remove("multi");
      el.classList.remove("multi-anchor");
      el.removeAttribute("data-multi-owner");
    });

    for (const id of state.ids) {
      const r = rowById(id);
      if (!r) continue;

      r.classList.add("multi");
      r.setAttribute("data-multi-owner", "branch");

      if (id === state.anchorId) {
        r.classList.add("multi-anchor");
      }
    }
  }

  function focusAnchor() {
  if (!state.anchorId) return;
  selectedId = state.anchorId;
  treeHasFocus = true;

  const anchorRow = rowById(state.anchorId);
  anchorRow?.focus?.({ preventScroll: true });
}

  if (typeof window.render === "function" && !window.render.__multiBranchPatchedV2) {
    const _render = window.render;
    window.render = function patchedRenderBranch() {
      _render();
      applyClasses();
    };
    window.render.__multiBranchPatchedV2 = true;
  }

  // function handleBranchRangeKey(dir) {
  //   const cur = selectedRow();
  //   if (!cur) return;

  //   if (!state.anchorId) {
  //     state.anchorId = cur.dataset.id;
  //     state.branchKey = branchKeyForRow(cur);

  //     const list = rowsInBranchChain(state.branchKey);
  //     const idx = list.indexOf(cur);
  //     if (idx < 0) return;

  //     const next = list[idx + dir];
  //     if (!next) return;

  //     const ia = list.indexOf(cur);
  //     const ib = list.indexOf(next);
  //     const from = Math.min(ia, ib);
  //     const to = Math.max(ia, ib);

  //     state.ids = new Set(list.slice(from, to + 1).map((r) => r.dataset.id));

  //     focusAnchor();
  //     applyClasses();
  //     return;
  //   }

  //   const list = rowsInBranchChain(state.branchKey);
  //   const anchor = rowById(state.anchorId) || cur;
  //   const anchorIndex = list.indexOf(anchor);

  //   if (anchorIndex < 0) return;

  //   const selectedRows = Array.from(state.ids)
  //     .map((id) => rowById(id))
  //     .filter(Boolean);

  //   const selectedIndexes = selectedRows
  //     .map((r) => list.indexOf(r))
  //     .filter((i) => i >= 0);

  //   if (!selectedIndexes.length) return;

  //   const currentEdgeIndex =
  //     dir > 0
  //       ? Math.max(...selectedIndexes)
  //       : Math.min(...selectedIndexes);

  //   const nextEdge = list[currentEdgeIndex + dir];
  //   if (!nextEdge) return;

  //   const edgeIndex = list.indexOf(nextEdge);
  //   const from = Math.min(anchorIndex, edgeIndex);
  //   const to = Math.max(anchorIndex, edgeIndex);

  //   state.ids = new Set(list.slice(from, to + 1).map((r) => r.dataset.id));

  //   focusAnchor();
  //   applyClasses();
  // }

  function handleBranchRangeKey(dir) {
    const cur = selectedRow();
    if (!cur) return;
  
    const branchKey = branchKeyForRow(cur);
    const list = rowsInBranchChain(branchKey);
    const idx = list.indexOf(cur);
  
    if (idx < 0) return;
  
    if (!state.anchorId) {
      const next = list[idx + dir];
      if (!next) return;
  
      state.anchorId = cur.dataset.id;
      state.activeId = next.dataset.id;
      state.branchKey = branchKey;
  
      const from = Math.min(idx, idx + dir);
      const to = Math.max(idx, idx + dir);
  
      state.ids = new Set(
        list.slice(from, to + 1).map((r) => r.dataset.id)
      );
  
      focusAnchor();
      applyClasses();
      return;
    }
  
    const anchor = rowById(state.anchorId) || cur;
    const active = rowById(state.activeId) || anchor;
  
    const anchorIndex = list.indexOf(anchor);
    const activeIndex = list.indexOf(active);
  
    if (anchorIndex < 0 || activeIndex < 0) return;
  
    const nextActive = list[activeIndex + dir];
    if (!nextActive) return;
  
    state.activeId = nextActive.dataset.id;
  
    const nextActiveIndex = list.indexOf(nextActive);
  
    const from = Math.min(anchorIndex, nextActiveIndex);
    const to = Math.max(anchorIndex, nextActiveIndex);
  
    state.ids = new Set(
      list.slice(from, to + 1).map((r) => r.dataset.id)
    );
  
    focusAnchor();
    applyClasses();
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (window.hotkeysMode === "custom") return;
      if (isEditingNow()) return;
      if (typeof isHotkey !== "function") return;
      if (window.currentView === window.VIEW?.TABLE) return;

      if (isHotkey(e, "branchRangeLeft")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleBranchRangeKey(-1);
        return;
      }

      if (isHotkey(e, "branchRangeRight")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleBranchRangeKey(+1);
        return;
      }
    },
    true
  );

  function installPointerHandlers() {
    const h = host();
    if (!h) return;
    if (h.__multiBranchClickInstalledV2) return;

    h.__multiBranchClickInstalledV2 = true;

    h.addEventListener(
      "click",
      (e) => {
        const row = e.target?.closest?.(".row") || null;

        if (!row) {
          reset();
          applyClasses();
        }
      },
      true
    );
  }

  installPointerHandlers();

  window.addEventListener(
    "keydown",
    (e) => {
      if (isEditingNow()) return;

      const noMods = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;

      if (
        noMods &&
        (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        )
      ) {
        reset();
        applyClasses();
      }
    },
    true
  );

  window.multiSelectBranch = {
    getIds() {
      return Array.from(state.ids);
    },

    clear() {
      reset();
      applyClasses();
    },

    size() {
      return state.ids.size;
    },

    has(id) {
      return state.ids.has(id);
    },

    debug() {
      return {
        branchKey: state.branchKey,
        anchorId: state.anchorId,
        activeId: state.activeId,
        ids: Array.from(state.ids),
      };
    },

    handleBranchRangeKey,
  };
})();