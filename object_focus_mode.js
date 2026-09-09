// object_focus_mode.js
// Погружение в объект: выбранный объект становится временным корнем отображения.

(function () {
  if (typeof window === "undefined") return;

  let focusedRootId = null;

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;
    if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
    if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function plainNodeName(node) {
    if (!node) return "";

    if (node.nameHtml) {
      const tmp = document.createElement("div");
      tmp.innerHTML = node.nameHtml;
      return (tmp.textContent || "").trim();
    }

    return (node.name || "").trim();
  }

  function findPathToNode(targetId) {
    const path = [];

    function walk(node) {
      if (!node) return false;

      path.push(node);

      if (node.id === targetId) return true;

      for (const child of node.children || []) {
        if (walk(child)) return true;
      }

      path.pop();
      return false;
    }

    if (!targetId) return [];
    walk(root);

    return path;
  }

  function getFocusedRootId() {
    return focusedRootId;
  }

  function getFocusedRootNode() {
    if (!focusedRootId) return root;

    const found = findWithParent(root, focusedRootId);
    return found?.node || root;
  }

  function getFocusedRootOrdinalPath() {
    if (!focusedRootId || focusedRootId === root.id) return [];

    const path = findPathToNode(focusedRootId);
    if (!path.length) return [];

    const ord = [];

    for (let i = 1; i < path.length; i++) {
      const parent = path[i - 1];
      const node = path[i];

      const index = (parent.children || []).findIndex((child) => child.id === node.id);
      if (index < 0) return [];

      ord.push(index + 1);
    }

    return ord;
  }

  function findByOrdinalPath(parts) {
    let node = root;

    for (const part of parts) {
      const index = Number(part) - 1;

      if (
        !node ||
        !Array.isArray(node.children) ||
        index < 0 ||
        index >= node.children.length
      ) {
        return null;
      }

      node = node.children[index];
    }

    return node;
  }

  function pathFromUrl() {
    const raw = new URL(window.location.href).searchParams.get("path");
    if (!raw) return [];

    return raw
      .split(".")
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x) && x > 0);
  }

  function syncFocusUrl(mode = "push") {
    const url = new URL(window.location.href);
    const path = getFocusedRootOrdinalPath();

    if (path.length) {
      url.searchParams.set("path", path.join("."));
    } else {
      url.searchParams.delete("path");
    }

    const method = mode === "replace" ? "replaceState" : "pushState";

    window.history[method](
      { path },
      "",
      url.toString()
    );
  }

  function restoreFocusFromUrl({ shouldRender = true } = {}) {
    const path = pathFromUrl();

    if (!path.length) {
      focusedRootId = null;
      selectedId = root.id;
    } else {
      const node = findByOrdinalPath(path);

      if (!node) return false;

      focusedRootId = node.id;
      selectedId = node.id;
    }

    treeHasFocus = true;

    if (shouldRender && typeof render === "function") {
      render();
    }

    renderBreadcrumbs();
    return true;
  }

  function focusInto(id) {
    if (!id) return false;
    if (currentView === VIEW.TEXT) return false;

    const found = findWithParent(root, id);
    if (!found) return false;

    focusedRootId = id;
    selectedId = id;
    treeHasFocus = true;

    render();
    renderBreadcrumbs();
    syncFocusUrl("push");

    return true;
  }

  function focusOutTo(id) {
    if (!id) {
      focusedRootId = null;
      selectedId = root.id;
    } else {
      const found = findWithParent(root, id);
      if (!found) return false;

      focusedRootId = id === root.id ? null : id;
      selectedId = id;
    }

    treeHasFocus = true;

    render();
    renderBreadcrumbs();
    syncFocusUrl("push");

    return true;
  }

  function resetFocus() {
    focusedRootId = null;
    selectedId = root.id;
    treeHasFocus = true;

    render();
    renderBreadcrumbs();
    syncFocusUrl("push");
  }

  function renderBreadcrumbs() {
    const bar = document.getElementById("objectBreadcrumbs");
    if (!bar) return;

    bar.innerHTML = "";

    if (!focusedRootId || focusedRootId === root.id) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "object-breadcrumb-item is-current";
      item.textContent =
        plainNodeName(root) || UI.labels.objectFocus.rootFallback;
      item.title = item.textContent;
      bar.appendChild(item);
      return;
    }

    const path = findPathToNode(focusedRootId);

    path.forEach((node, index) => {
      if (index > 0) {
        const sep = document.createElement("span");
        sep.className = "object-breadcrumb-separator";
        sep.textContent = "›";
        bar.appendChild(sep);
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "object-breadcrumb-item" + (index === path.length - 1 ? " is-current" : "");

      item.textContent =
        plainNodeName(node) || UI.labels.objectFocus.breadcrumbFallback;
      item.title = item.textContent;

      item.addEventListener("click", () => {
        focusOutTo(node.id);
      });

      bar.appendChild(item);
    });
  }

  function isInsideFocusedRoot(id) {
    if (!focusedRootId || focusedRootId === root.id) return true;
    if (!id) return false;
  
    if (id === focusedRootId) return true;
  
    const focused = findWithParent(root, focusedRootId)?.node;
    if (!focused) return true;
  
    let ok = false;
  
    (function walk(node) {
      if (!node || ok) return;
  
      if (node.id === id) {
        ok = true;
        return;
      }
  
      (node.children || []).forEach(walk);
    })(focused);
  
    return ok;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (window.hotkeysMode === "custom") return;
      if (isEditingNow()) return;
      if (currentView === VIEW.TEXT) return;
      if (typeof isTreeLocked === "function" && isTreeLocked()) return;

      if (typeof isHotkey !== "function") return;
      if (!treeHasFocus) return;
      if (!selectedId) return;

      if (isHotkey(e, "focusIntoObject")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        focusInto(selectedId);
        return;
      }

      if (isHotkey(e, "focusOutObject")) {
  /*
    Выход из объекта работает только если мы уже находимся
    внутри режима фокуса. Если focusedRootId нет — ничего не делаем.
  */
  if (!focusedRootId || focusedRootId === root.id) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();

  const path = findPathToNode(focusedRootId);

  if (path.length >= 2) {
    const parent = path[path.length - 2];
    focusOutTo(parent.id);
  } else {
    focusOutTo(null);
  }

  return;
}
    },
    true
  );

  window.addEventListener("popstate", () => {
    restoreFocusFromUrl({ shouldRender: true });
  });

  window.objectFocus = {
    isInsideFocusedRoot,
    getFocusedRootId,
    getFocusedRootNode,
    getFocusedRootOrdinalPath,
    focusInto,
    focusOutTo,
    resetFocus,
    renderBreadcrumbs,
    restoreFocusFromUrl,
    syncFocusUrl,
    findByOrdinalPath,
  };

  function initObjectFocusFromUrl() {
    restoreFocusFromUrl({ shouldRender: false });
    syncFocusUrl("replace");
    renderBreadcrumbs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObjectFocusFromUrl);
  } else {
    initObjectFocusFromUrl();
  }
})();