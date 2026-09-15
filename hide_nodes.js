// hide_nodes.js
// Скрытие только самого объекта:
// [x] скрывает объект/строку,
// длинный минус восстанавливает объект/строку.
// Вложенные объекты остаются видимыми.

(function () {
  if (typeof window === "undefined") return;

  let hiddenIds = new Set();
  
  

  function host() {
    return document.getElementById("tree");
  }

  function cssEscapeLocal(s) {
    const v = String(s);
    if (window.CSS && typeof CSS.escape === "function") return CSS.escape(v);
    return v.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
  }

function isSchemaView() {
  return (
    typeof VIEW !== "undefined" &&
    typeof currentView !== "undefined" &&
    (
      currentView === VIEW.SCHEMA ||
      currentView === VIEW.STRUCTURE_TABLE
    )
  );
}

function isTableView() {
  return (
    typeof VIEW !== "undefined" &&
    typeof currentView !== "undefined" &&
    (
      window.isTableLikeView
        ? window.isTableLikeView(currentView)
        : currentView === VIEW.TABLE
    )
  );
}

function isStructureTableView() {
  return (
    typeof VIEW !== "undefined" &&
    typeof currentView !== "undefined" &&
    currentView === VIEW.STRUCTURE_TABLE
  );
}

  function isSupportedView() {
    return isSchemaView() || isTableView();
  }

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;
    if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
    if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function isHidden(id) {
    return !!id && hiddenIds.has(id);
  }

  function isRootId(id) {
    return (
      !!id &&
      typeof root !== "undefined" &&
      root &&
      id === root.id
    );
  }

  function firstVisibleInSubtree(node) {
    if (!node) return null;

    if (
      !isHidden(node.id) &&
      window.objectFocus?.isInsideFocusedRoot?.(node.id) !== false
    ) {
      return node.id;
    }

    for (const child of node.children || []) {
      const found = firstVisibleInSubtree(child);
      if (found) return found;
    }

    return null;
  }

  function firstVisibleFromFlat(exceptId) {
    if (typeof flatten !== "function") return null;

    const ids = flatten();

    for (const id of ids) {
      if (id === exceptId) continue;
      if (isHidden(id)) continue;
      if (window.objectFocus?.isInsideFocusedRoot?.(id) === false) continue;
      return id;
    }

    return null;
  }

  function pickSelectionAfterHide(id) {
    const found =
      typeof findWithParent === "function"
        ? findWithParent(root, id)
        : null;

    if (found?.node) {
      for (const child of found.node.children || []) {
        const childVisible = firstVisibleInSubtree(child);
        if (childVisible) return childVisible;
      }
    }

    const parent = found?.parent || null;

    if (parent) {
      const siblings = parent.children || [];
      const idx = siblings.findIndex((child) => child.id === id);

      for (let i = idx + 1; i < siblings.length; i++) {
        const visible = firstVisibleInSubtree(siblings[i]);
        if (visible) return visible;
      }

      for (let i = idx - 1; i >= 0; i--) {
        const visible = firstVisibleInSubtree(siblings[i]);
        if (visible) return visible;
      }

      if (!isHidden(parent.id)) return parent.id;
    }

    return firstVisibleFromFlat(id) || id;
  }

  function hide(id, withHistory = true) {
    if (!id || hiddenIds.has(id) || isRootId(id)) return false;

    if (
      typeof findWithParent === "function" &&
      !findWithParent(root, id)
    ) {
      return false;
    }

    if (withHistory && typeof pushHistory === "function") {
      pushHistory();
    }

    hiddenIds.add(id);

    if (typeof selectedId !== "undefined" && selectedId === id) {
      selectedId = pickSelectionAfterHide(id);
      treeHasFocus = true;
    }

    if (typeof render === "function") render();
    return true;
  }

  function show(id, withHistory = true) {
    if (!id || !hiddenIds.has(id)) return false;
  
    if (withHistory && typeof pushHistory === "function") {
      pushHistory();
    }
  
    hiddenIds.delete(id);
  
    // Важно:
    // при восстановлении объекта через ─── не переносим серое выделение
    // на восстановленный объект. Оставляем выбранным текущий видимый объект.
    if (typeof render === "function") render();
    return true;
  }

  function toggle(id) {
    if (!id) return false;
    if (isHidden(id)) return show(id, true);
    return hide(id, true);
  }

  function hideMany(ids, withHistory = true) {
    const list = Array.from(new Set(ids || []))
  .filter((id) => id && !isRootId(id));
    if (!list.length) return false;
  
    const existing = list.filter((id) => !hiddenIds.has(id));
    if (!existing.length) return false;
  
    if (withHistory && typeof pushHistory === "function") {
      pushHistory();
    }
  
    existing.forEach((id) => hiddenIds.add(id));
  
    if (
      typeof selectedId !== "undefined" &&
      hiddenIds.has(selectedId)
    ) {
      selectedId = pickSelectionAfterHide(selectedId);
      treeHasFocus = true;
    }
  
    if (typeof render === "function") render();
    return true;
  }
  
  function showMany(ids, withHistory = true) {
    const list = Array.from(new Set(ids || [])).filter(Boolean);
    if (!list.length) return false;
  
    const existing = list.filter((id) => hiddenIds.has(id));
    if (!existing.length) return false;
  
    if (withHistory && typeof pushHistory === "function") {
      pushHistory();
    }
  
    existing.forEach((id) => hiddenIds.delete(id));
  
    // При восстановлении группы через ─── выбранный объект не меняем.
    if (typeof render === "function") render();
    return true;
  }

  function makePlaceholder(id) {
    const ph = document.createElement("span");
    ph.className = "object-hide-placeholder";
    ph.dataset.id = id;
    ph.setAttribute("aria-hidden", "true");
    return ph;
  }

  function directCaptionsOfLi(li) {
    return li?.querySelector?.(":scope > .captions") || null;
  }

  function makeColumnButton(idOrIds, hidden) {
    const ids = Array.isArray(idOrIds)
      ? idOrIds.filter(Boolean)
      : [idOrIds].filter(Boolean);
  
    const id = ids[0];
    const isGroup = hidden && ids.length > 1;
  
    const btn = document.createElement("button");
    btn.type = "button";
  
    btn.className =
      "object-hide-col" +
      (hidden ? " is-hidden-object" : "") +
      (isGroup ? " is-hidden-group" : "");
  
    btn.dataset.id = id || "";
  
    if (isGroup) {
      btn.dataset.ids = ids.join(",");
    }
  
    const label = hidden
  ? (
      isGroup
        ? `Показать ${ids.length} скрытых объектов`
        : "Показать объект"
    )
  : "Скрыть объект";

window.visibilityControls?.apply(
  btn,
  {
    kind:
      hidden
        ? "restoreVertical"
        : "hide",

    label,

    /*
      Кнопка восстановления скрытого объекта
      должна оставаться видимой постоянно.
    */
    alwaysVisible:
      hidden,
  }
);
  
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
  
      if (typeof isTreeLocked === "function" && isTreeLocked()) return;
      if (isEditingNow()) return;
  
      if (hidden) {
        if (isGroup) {
          showMany(ids, true);
        } else {
          show(id, true);
        }
  
        return;
      }
  
      hide(id, true);
    });
  
    return btn;
  }

  function bindButtonHover(btn, targetEl) {
    if (!btn || !targetEl) return;
  
    // Минус для восстановления всегда видимый
    if (btn.classList.contains("is-hidden-object")) {
      btn.classList.add("is-hover-visible");
      return;
    }
  
    let hideTimer = null;
  
    function showBtn() {
      clearTimeout(hideTimer);
      btn.classList.add("is-hover-visible");
    }
  
    function hideBtnSoon() {
      clearTimeout(hideTimer);
      btn.classList.remove("is-hover-visible");
    }
  
    targetEl.addEventListener("mouseenter", showBtn);
    targetEl.addEventListener("mouseleave", hideBtnSoon);
  
    btn.addEventListener("mouseenter", showBtn);
    btn.addEventListener("mouseleave", hideBtnSoon);
  }

  /* =========================
     СХЕМА
     ========================= */

  function rowIsDirectTreeRow(row) {
    if (!row || !row.dataset?.id) return false;
    if (row.closest(".structure-table")) return false;
    if (row.closest(".hierarchy-view")) return false;
    if (row.closest(".hierarchy-horizontal-view")) return false;
    if (row.closest(".icicle-horizontal-view")) return false;
    if (row.closest(".icicle-vertical-view")) return false;
    if (row.closest(".leaf-page")) return false;
    return !!row.closest("li");
  }

  function applyHiddenDom() {
    const h = host();
    if (!h || !isSchemaView()) return;

    h.querySelectorAll(".object-hide-placeholder").forEach((el) => el.remove());

    h.querySelectorAll("li.object-node-hidden").forEach((li) => {
      li.classList.remove("object-node-hidden");

      const row = li.querySelector(":scope > .row[data-id]");
      row?.removeAttribute("aria-hidden");

      li
  .querySelector(
    ":scope > .schema-text-properties"
  )
  ?.removeAttribute(
    "aria-hidden"
  );

li
  .querySelector(
    ":scope > .schema-active-block"
  )
  ?.removeAttribute(
    "aria-hidden"
  );

      directCaptionsOfLi(li)?.removeAttribute("aria-hidden");
    });

    for (const id of hiddenIds) {
      const row = h.querySelector(`.row[data-id="${cssEscapeLocal(id)}"]`);
      if (!row) continue;

      const li = row.closest("li");
      if (!li) continue;

      li.classList.add("object-node-hidden");
      row.setAttribute("aria-hidden", "true");

      li
  .querySelector(
    ":scope > .schema-text-properties"
  )
  ?.setAttribute(
    "aria-hidden",
    "true"
  );

li
  .querySelector(
    ":scope > .schema-active-block"
  )
  ?.setAttribute(
    "aria-hidden",
    "true"
  );
      directCaptionsOfLi(li)?.setAttribute("aria-hidden", "true");

      const anchor = li.querySelector(":scope > .anchor");
      const placeholder = makePlaceholder(id);

      if (anchor?.nextSibling) {
        li.insertBefore(placeholder, anchor.nextSibling);
      } else if (anchor) {
        li.appendChild(placeholder);
      } else {
        li.insertBefore(placeholder, li.firstChild);
      }
    }
  }

  function groupHiddenColumnItems(items) {
    const result = [];
    let i = 0;
  
    while (i < items.length) {
      const item = items[i];
  
      if (!item.hidden) {
        result.push({
          ...item,
          ids: [item.id],
          groupSize: 1,
        });
  
        i++;
        continue;
      }
  
      const start = i;
      const group = [];
  
      while (i < items.length && items[i].hidden) {
        group.push(items[i]);
        i++;
      }
  
      const end = i - 1;
      const first = group[0];
      const last = group[group.length - 1];
  
      let prevVisible = null;
      for (let p = start - 1; p >= 0; p--) {
        if (!items[p].hidden && items[p].top != null) {
          prevVisible = items[p];
          break;
        }
      }
  
      let nextVisible = null;
      for (let n = end + 1; n < items.length; n++) {
        if (!items[n].hidden && items[n].top != null) {
          nextVisible = items[n];
          break;
        }
      }
  
      let groupTop = first.top;
  
      // Главная логика:
      // если скрытая группа находится между двумя видимыми [x],
      // ставим один общий ─── ровно посередине между ними.
      if (prevVisible && nextVisible) {
        groupTop = Math.round((prevVisible.top + nextVisible.top) / 2);
      }

      // Самая первая скрытая группа:
    // берём координату первого видимого [x] и ставим ─── на 10px выше
    else if (!prevVisible && nextVisible) {
      groupTop = Math.max(0, Math.round(nextVisible.top - 10));
    }
  
      result.push({
        ...first,
        top: groupTop,
        ids: group.map((x) => x.id),
        target: first.target,
        targetEnd: last.target,
        hidden: true,
        groupSize: group.length,
      });
    }
  
    return result;
  }
  
  function layoutColumn() {
    const h = host();
    if (!h || !isSchemaView()) return;

    h.querySelectorAll(".object-hide-col").forEach((el) => el.remove());

    const hostBox = h.getBoundingClientRect();

    function directRowOfLi(li) {
      return li?.querySelector?.(":scope > .row[data-id]") || null;
    }

    function isSchemaLi(li) {
      if (!li || li.tagName !== "LI") return false;
      if (li.closest(".structure-table")) return false;
      if (li.closest(".hierarchy-view")) return false;
      if (li.closest(".hierarchy-horizontal-view")) return false;
      if (li.closest(".icicle-horizontal-view")) return false;
      if (li.closest(".icicle-vertical-view")) return false;
      if (li.closest(".leaf-page")) return false;
      return true;
    }

    function visibleTopForLi(li) {
  const row =
    directRowOfLi(li);

  if (
    !row ||
    !row.getClientRects().length
  ) {
    return null;
  }

  const box =
    row.getBoundingClientRect();

  const controlHeight = 20;

  return Math.round(
    box.top -
    hostBox.top +
    (
      box.height -
      controlHeight
    ) / 2
  );
}

    const sequence = [];

    h.querySelectorAll("li").forEach((li) => {
      if (!isSchemaLi(li)) return;

      const row = directRowOfLi(li);
      const ph = li.querySelector(":scope > .object-hide-placeholder[data-id]");

      if (li.classList.contains("object-node-hidden")) {
        const id = ph?.dataset?.id || row?.dataset?.id;
        if (!id) return;

        sequence.push({
          id,
          hidden: true,
          top: null,
        });

        return;
      }

      if (!row || !row.dataset?.id) return;
if (isRootId(row.dataset.id)) return;
if (!rowIsDirectTreeRow(row)) return;
if (!row.getClientRects().length) return;

sequence.push({
  id: row.dataset.id,
  hidden: false,
  top: visibleTopForLi(li),
});
    });

    distributeHiddenItems(sequence, 20, 80);

    const buttonItems = groupHiddenColumnItems(sequence);

for (const item of buttonItems) {
  if (item.top == null) continue;

  const btn = makeColumnButton(
    item.hidden ? item.ids : item.id,
    item.hidden
  );

  btn.style.top = `${item.top}px`;
  h.appendChild(btn);

  const targetRow = h.querySelector(
    `.row[data-id="${cssEscapeLocal(item.id)}"]`
  );

  bindButtonHover(btn, targetRow);
}
  }

  /* =========================
     ТАБЛИЦА
     ========================= */

  function applyHiddenTableDom() {
    const h = host();
    if (!h || !isTableView()) return;

    h.querySelectorAll(".structure-table tbody tr.object-node-hidden").forEach((tr) => {
      tr.classList.remove("object-node-hidden");
      tr.removeAttribute("aria-hidden");
    });

    for (const id of hiddenIds) {
  const tr = h.querySelector(
    `.structure-table tbody tr[data-id="${cssEscapeLocal(id)}"]`
  );

  if (!tr) continue;

      tr.classList.add("object-node-hidden");
      tr.setAttribute("aria-hidden", "true");
    }

    h.querySelectorAll(".table-collapse-col[data-id]").forEach((btn) => {
      const id = btn.dataset.id;
      btn.style.display = hiddenIds.has(id) ? "none" : "";
    });
  }

  function bindTableCollapseHover() {
    const h = host();
    if (!h || !isTableView()) return;
  
    h.querySelectorAll(".table-collapse-col[data-id]").forEach((btn) => {
      if (btn.__tableCollapseHoverBound) return;
  
      const id = btn.dataset.id;
      if (!id) return;
  
      const tr = h.querySelector(
  `.structure-table tbody tr[data-id="${cssEscapeLocal(id)}"]`
);

if (!tr) return;
  
      let hideTimer = null;
  
      function showBtn() {
        clearTimeout(hideTimer);
        btn.classList.add("is-visible");
      }
  
      function hideBtnSoon() {
        clearTimeout(hideTimer);
        btn.classList.remove("is-visible");
      }
  
      tr.addEventListener("mouseenter", showBtn);
      tr.addEventListener("mouseleave", hideBtnSoon);
  
      btn.addEventListener("mouseenter", showBtn);
      btn.addEventListener("mouseleave", hideBtnSoon);
  
      btn.__tableCollapseHoverBound = true;
    });
  }

  function layoutTableColumn() {
    const h = host();
    if (!h || !isTableView()) return;

    h.querySelectorAll(".object-hide-col").forEach((el) => el.remove());

    const hostBox = h.getBoundingClientRect();
    const table = h.querySelector(".structure-table");
    if (!table) return;

    const sequence = [];

table.querySelectorAll("tbody tr").forEach((tr) => {
  const id =
    tr.dataset.id ||
    tr.querySelector(
      ".row[data-id]"
    )?.dataset?.id ||
    "";

  if (!id) return;
  if (isRootId(id)) return;

const hidden = hiddenIds.has(id);

      if (hidden) {
        sequence.push({
          id,
          hidden: true,
          top: null,
        });

        return;
      }

      if (!tr.getClientRects().length) return;

      const trBox = tr.getBoundingClientRect();

      sequence.push({
        id,
        hidden: false,
        top: Math.round(
  trBox.top -
  hostBox.top +
  (
    trBox.height -
    20
  ) / 2
),
      });
    });

    distributeHiddenItems(sequence, 20, 100);

    const buttonItems = groupHiddenColumnItems(sequence);

for (const item of buttonItems) {
  if (item.top == null) continue;

  const btn = makeColumnButton(
    item.hidden ? item.ids : item.id,
    item.hidden
  );

  btn.classList.add("object-hide-table-col");
  btn.style.top = `${item.top}px`;

  h.appendChild(btn);

const targetRow = h.querySelector(
  `.structure-table tbody tr[data-id="${cssEscapeLocal(item.id)}"]`
);

bindButtonHover(btn, targetRow);
}
  }

  /* =========================
     Общая раскладка скрытых кнопок
     ========================= */

  function getAverageStep(sequence, fallbackStep, maxDiff) {
    const visibleTops = sequence
      .filter((item) => !item.hidden && item.top != null)
      .map((item) => item.top);

    if (visibleTops.length < 2) return fallbackStep;

    const diffs = [];

    for (let i = 1; i < visibleTops.length; i++) {
      const d = visibleTops[i] - visibleTops[i - 1];
      if (d > 0 && d < maxDiff) diffs.push(d);
    }

    if (!diffs.length) return fallbackStep;

    return Math.round(
      diffs.reduce((sum, d) => sum + d, 0) / diffs.length
    );
  }

  function distributeHiddenItems(sequence, fallbackStep = 20, maxDiff = 80) {
    const defaultStep = getAverageStep(sequence, fallbackStep, maxDiff);

    let i = 0;

    while (i < sequence.length) {
      if (!sequence[i].hidden) {
        i++;
        continue;
      }

      const start = i;

      while (i < sequence.length && sequence[i].hidden) {
        i++;
      }

      const end = i - 1;
      const count = end - start + 1;

      let prevVisible = null;
      for (let p = start - 1; p >= 0; p--) {
        if (!sequence[p].hidden && sequence[p].top != null) {
          prevVisible = sequence[p];
          break;
        }
      }

      let nextVisible = null;
      for (let n = end + 1; n < sequence.length; n++) {
        if (!sequence[n].hidden && sequence[n].top != null) {
          nextVisible = sequence[n];
          break;
        }
      }

      for (let k = 0; k < count; k++) {
        const item = sequence[start + k];

        if (prevVisible && nextVisible) {
          const gap = nextVisible.top - prevVisible.top;

          item.top = Math.round(
            prevVisible.top + (gap * (k + 1)) / (count + 1)
          );
        } else if (prevVisible) {
          item.top = Math.round(prevVisible.top + defaultStep * (k + 1));
        } else if (nextVisible) {
          item.top = Math.round(nextVisible.top - defaultStep * (count - k));
        } else {
          item.top = defaultStep * k;
        }
      }
    }
  }

  /* =========================
     Refresh / patches
     ========================= */

  function refresh() {
    const h = host();
    if (!h) return;

    if (!isSupportedView()) {
      h.querySelectorAll(".object-hide-col").forEach((el) => el.remove());
      return;
    }

if (isSchemaView()) {
  applyHiddenDom();

  try {
    if (typeof layoutTrunks === "function") {
      layoutTrunks();
    }
  } catch (_) {}

  try {
    if (typeof layoutCollapseColumn === "function") {
      layoutCollapseColumn();
    }
  } catch (_) {}

  layoutColumn();

  /*
    В обычной структуре на этом заканчиваем.
    В объединённом виде нужно дополнительно
    обновить соответствующую строку таблицы.
  */

  if (!isStructureTableView()) {
    return;
  }
}

if (isTableView()) {
  applyHiddenTableDom();

  /*
    В объединённом виде кнопки скрытия
    уже находятся возле левой структуры.
  */

  if (!isStructureTableView()) {
    layoutTableColumn();
  }

  bindTableCollapseHover();
}
  }

  function patchRender() {
    if (typeof window.render !== "function") return;
    if (window.render.__hideNodesPatched) return;

    const originalRender = window.render;

    window.render = function patchedRenderHideNodes() {
      const result = originalRender.apply(this, arguments);
      refresh();
      return result;
    };

    window.render.__hideNodesPatched = true;
  }

  function injectStyles() {
    if (document.getElementById("hideNodesStyles")) return;

    const style = document.createElement("style");
    style.id = "hideNodesStyles";

    style.textContent = `
      #tree .object-hide-col {
  position: absolute;
  left: -30px;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: #6b7280;
  font: inherit;
  font-size: 12px !important;
  line-height: 20px;
  text-align: right;
  user-select: none;
  cursor: pointer;
  z-index: 35;

  opacity: 0;
  transition: none;
}

#tree .object-hide-col.is-hover-visible,
#tree .object-hide-col.is-hidden-object {
  opacity: 1;
}

      #tree .object-hide-col:hover {
        color: #000;
        background: transparent;
      }

      

      #tree li.object-node-hidden > .row,
#tree li.object-node-hidden > .captions,
#tree li.object-node-hidden > .schema-text-properties,
#tree li.object-node-hidden > .schema-active-block {
  display: none !important;
}

      #tree li.object-node-hidden::before {
        display: none !important;
      }

      #tree .object-hide-placeholder {
        display: block;
        width: 0;
        height: 0;
        min-height: 0;
        line-height: 0;
        padding: 0;
        margin: 0;
        overflow: hidden;
      }

      #tree .structure-table tr.object-node-hidden {
        display: none !important;
      }

      

      .table-collapse-col {
      color: #6b7280;
  opacity: 0;
  transition: none;
}

.table-collapse-col:hover {
      color: #000;
  }

.table-collapse-col.is-visible,
.table-collapse-col:hover {
  opacity: 1;
}
    `;

    document.head.appendChild(style);
  }

  window.hideNodes = {
    hide,
    show,
    hideMany,
    showMany,
    toggle,
    isHidden,
    refresh,

    getAll() {
      return Array.from(hiddenIds);
    },

    forget(ids) {
      const list = Array.from(new Set(ids || [])).filter(Boolean);
      let changed = false;

      list.forEach((id) => {
        changed = hiddenIds.delete(id) || changed;
      });

      return changed;
    },

    replaceAll(ids) {
      hiddenIds = new Set(
        Array.from(new Set(ids || [])).filter((id) => {
          return id && !isRootId(id);
        })
      );

      return true;
    },

    clear(withHistory = true) {
      if (!hiddenIds.size) return false;

      if (withHistory && typeof pushHistory === "function") {
        pushHistory();
      }

      hiddenIds.clear();

      if (typeof render === "function") render();
      return true;
    },
  };

  injectStyles();
  patchRender();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.addEventListener("resize", () => {
    try {
      refresh();
    } catch (_) {}
  });
})();
