// schema_text_property_editor.js
//
// Редактирование текстовых свойств прямо в режиме «Структура».
//
// Модуль:
// - добавляет кнопку [✎] рядом с переименованием объекта;
// - показывает все созданные свойства типа text;
// - использует общие классы ui-dropdown;
// - редактирует те же node.tableProps, что и таблица;
// - сохраняет plain text и rich HTML.

(function () {
  if (typeof window === "undefined") return;

  const global = window;

  let menu = null;
  let activeButton = null;
  let activeNodeId = "";

  function cssEscape(value) {
    const text = String(value || "");

    if (global.CSS?.escape) {
      return global.CSS.escape(text);
    }

    return text.replace(/(["\\])/g, "\\$1");
  }

  function getNode(nodeId) {
    if (
      !nodeId ||
      typeof global.findWithParent !== "function" ||
      !global.root
    ) {
      return null;
    }

    return global.findWithParent(global.root, nodeId)?.node || null;
  }

  function getTextProperties() {
    return (
      global.projectProperties
        ?.getInstancesByType?.("text") ||
      []
    );
  }

  function getPropertyDescriptor(property) {
    return (
      global.projectProperties
        ?.getDescriptor?.(property?.id || property?.type) ||
      null
    );
  }

  function getPropertyTitle(property) {
    return (
      global.projectProperties
        ?.getTitle?.(property?.id) ||
      property?.title ||
      "Текст"
    );
  }

  function getRichValue(node, propertyKey) {
    if (global.tableRichTextCells?.getProp) {
      return global.tableRichTextCells.getProp(node, propertyKey);
    }

    const props =
      node?.tableProps &&
      typeof node.tableProps === "object"
        ? node.tableProps
        : {};

    return {
      text: String(props[propertyKey] || ""),
      html: String(props[`${propertyKey}Html`] || ""),
    };
  }

  function normalizeRichHtml(html) {
    if (global.tableRichTextCells?.normalizeHtml) {
      return global.tableRichTextCells.normalizeHtml(html || "");
    }

    if (global.__fmtSync?.normalizeRichHtml) {
      return global.__fmtSync.normalizeRichHtml(html || "");
    }

    const host = document.createElement("div");
    host.innerHTML = html || "";

    host.querySelectorAll("div").forEach((element) => {
      element.before(
        ...Array.from(element.childNodes),
        document.createElement("br")
      );
      element.remove();
    });

    while (host.lastChild?.nodeName === "BR") {
      host.lastChild.remove();
    }

    const text = (host.textContent || "").trim();
    const hasMarkup = !!host.querySelector("br, span, b, strong, i, em, u, s, strike, del");

    return {
      text,
      html: hasMarkup ? host.innerHTML : "",
    };
  }

  function saveRichValue(node, propertyKey, rich) {
    if (global.tableRichTextCells?.setProp) {
      global.tableRichTextCells.setProp(node, propertyKey, rich);
      global.projectAutosave?.saveNow?.();
      return;
    }

    if (!node.tableProps || typeof node.tableProps !== "object") {
      node.tableProps = {};
    }

    const nextText = String(rich?.text || "");
    const nextHtml = String(rich?.html || "");
    const oldText = String(node.tableProps[propertyKey] || "");
    const oldHtml = String(node.tableProps[`${propertyKey}Html`] || "");

    if (oldText === nextText && oldHtml === nextHtml) {
      return;
    }

    if (typeof global.pushHistory === "function") {
      global.pushHistory();
    }

    node.tableProps[propertyKey] = nextText;
    node.tableProps[`${propertyKey}Html`] = nextHtml;

    global.projectAutosave?.saveNow?.();
  }

  function getSchemaSettings() {
    return (
      global.viewSettings
        ?.getActiveSettings?.() ||
      null
    );
  }

  function shouldShowHeading() {
    return (
      getSchemaSettings()
        ?.interface
        ?.showTextPropertyHeaders !==
      false
    );
  }

  function getHeadingPlacement() {
    return (
      getSchemaSettings()
        ?.interface
        ?.textPropertyHeaderPlacement ===
      "above"
        ? "above"
        : "inline"
    );
  }

  function findRow(nodeId) {
    return document.querySelector(
      `#tree .row[data-id="${cssEscape(nodeId)}"]`
    );
  }

  function findPropertyLine(container, property) {
    const key = cssEscape(property.id);

    const byKey = container.querySelector(
      [
        `[data-schema-text-property-key="${key}"]`,
        `[data-property-key="${key}"]`,
        `[data-field="${key}"]`,
      ].join(",")
    );

    if (byKey) return byKey;

    const title = getPropertyTitle(property);

    return (
      Array.from(
        container.querySelectorAll(".schema-text-property")
      ).find((line) => {
        const heading = line.querySelector(
          ".schema-text-property-title"
        );

        return (
          heading?.textContent
            ?.trim()
            .replace(/:\s*$/, "") ===
          title
        );
      }) ||
      null
    );
  }

  function createPropertyLine(container, property) {
    const line = document.createElement("div");
    line.className = "schema-text-property";
    line.dataset.schemaTextPropertyKey = property.id;

    if (shouldShowHeading()) {
      line.classList.add(
        getHeadingPlacement() === "above"
          ? "is-header-above"
          : "is-header-inline"
      );

      const title = document.createElement("span");
      title.className = "schema-text-property-title";
      title.textContent = `${getPropertyTitle(property)}:`;
      line.appendChild(title);
    }

    const value = document.createElement("span");
    value.className = "schema-text-property-value";
    line.appendChild(value);

    container.appendChild(line);

    return line;
  }

  function ensurePropertyValueHost(nodeId, property) {
    const row = findRow(nodeId);
    const li = row?.closest("li");

    if (!row || !li) return null;

    let container = li.querySelector(
      ":scope > .schema-text-properties"
    );

    if (!container) {
      container = document.createElement("div");
      container.className = "schema-text-properties";

      const captions = li.querySelector(":scope > .captions");

      if (captions) {
        captions.after(container);
      } else {
        row.after(container);
      }
    }

    let line = findPropertyLine(container, property);

    if (!line) {
      line = createPropertyLine(container, property);
    } else {
      line.dataset.schemaTextPropertyKey = property.id;
    }

    let value = line.querySelector(
      ".schema-text-property-value"
    );

    if (!value) {
      value = document.createElement("span");
      value.className = "schema-text-property-value";
      line.appendChild(value);
    }

    return value;
  }

  function renderValue(valueHost, rich) {
    valueHost.replaceChildren();
    valueHost.classList.toggle(
      "is-empty",
      !rich.text && !rich.html
    );

    if (rich.html) {
      valueHost.innerHTML = rich.html;
    } else {
      valueHost.textContent = rich.text || "";
    }
  }

  function relayoutSchema() {
    global.schemaActiveBlock?.schedule?.();
    global.schemaActiveBlock?.layout?.();

    if (
      !global.schemaActiveBlock &&
      typeof global.applyCaptionOrdinalOffsets === "function"
    ) {
      global.applyCaptionOrdinalOffsets();
    }

    if (typeof global.layoutTrunks === "function") {
      requestAnimationFrame(global.layoutTrunks);
    }
  }

  function syncFormattingToolbar() {
    global.syncFmtButtons?.();
    global.colorFormatting?.syncToolbar?.();
  }

  function placeCaretAtEnd(editor) {
    const selection = global.getSelection?.();

    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function startEdit(nodeId, property) {
    const node = getNode(nodeId);
    const valueHost = ensurePropertyValueHost(nodeId, property);

    if (!node || !valueHost) return false;

    const oldValue = getRichValue(node, property.id);
    const editor = document.createElement("div");

    editor.className =
  "edit edit-rich edit-caption " +
  "inline-cell-editor " +
  "schema-text-property-editor";
    editor.contentEditable = "true";
    editor.spellcheck = true;
    editor.dataset.schemaTextPropertyEditor = "1";
    editor.setAttribute(
      "aria-label",
      `Редактировать: ${getPropertyTitle(property)}`
    );

    if (oldValue.html) {
      editor.innerHTML = oldValue.html;
    } else {
      editor.textContent = oldValue.text || "";
    }

    let finished = false;

    function finish(save) {
      if (finished) return;
      finished = true;

      if (save) {
        const normalized = normalizeRichHtml(editor.innerHTML);
        const editorText = editor.textContent || "";

        saveRichValue(node, property.id, {
          text: editorText === "" ? "" : normalized.text || "",
          html: normalized.html || "",
        });
      }

      valueHost.classList.remove(
        "inline-edit-cell"
      );

      renderValue(
        valueHost,
        getRichValue(node, property.id)
      );

      relayoutSchema();
    }

    editor.addEventListener("keydown", (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
        return;
      }

      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        finish(true);
      }
    }, true);

    [
      "pointerdown",
      "mousedown",
      "click",
      "dblclick",
    ].forEach((eventName) => {
      editor.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    editor.addEventListener("input", () => {
      syncFormattingToolbar();
      relayoutSchema();
    });

    editor.addEventListener("keyup", syncFormattingToolbar);
    editor.addEventListener("mouseup", syncFormattingToolbar);
    editor.addEventListener("blur", () => finish(true));

    valueHost.classList.add(
  "inline-edit-cell"
);

valueHost.replaceChildren(
  editor
);

valueHost.classList.remove(
  "is-empty"
);

    requestAnimationFrame(() => {
      editor.focus({
        preventScroll: true,
      });
      placeCaretAtEnd(editor);
      syncFormattingToolbar();
      relayoutSchema();
    });

    return true;
  }

  function createMenuItem(property) {
    const button = document.createElement("button");
    const descriptor = getPropertyDescriptor(property);

    button.type = "button";
    button.className = "ui-dropdown-item schema-text-property-menu-item";
    button.dataset.propertyKey = property.id;
    button.setAttribute("role", "menuitem");

    const icon = document.createElement("span");
    icon.className = "ui-dropdown-icon";
    icon.textContent = descriptor?.icon || "¶";
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "ui-dropdown-label";
    label.textContent = getPropertyTitle(property);

    button.append(icon, label);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const nodeId = activeNodeId;
      closeMenu({ restoreFocus: false });
      startEdit(nodeId, property);
    });

    return button;
  }

  function ensureMenu() {
    if (menu) return menu;

    menu = document.createElement("div");
    menu.id = "schemaTextPropertyMenu";
    menu.className = "ui-dropdown-menu schema-text-property-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Заполнить текстовое свойство");

    document.body.appendChild(menu);

    return menu;
  }

  function buildMenu() {
    const element = ensureMenu();
    const properties = getTextProperties();

    element.replaceChildren();

    const title = document.createElement("div");
    title.className = "ui-dropdown-title";
    title.textContent = "Заполнить текстовое свойство";
    element.appendChild(title);

    if (!properties.length) {
      const empty = document.createElement("div");
      empty.className = "schema-text-property-menu-empty";
      empty.textContent = "Нет текстовых свойств";
      element.appendChild(empty);
      return;
    }

    properties.forEach((property) => {
      element.appendChild(createMenuItem(property));
    });
  }

  function positionMenu(button) {
    if (!menu || !button) return;

    const padding = 8;
    const gap = 6;
    const anchor = button.getBoundingClientRect();

    menu.style.left = "0px";
    menu.style.top = "0px";

    const box = menu.getBoundingClientRect();

    let left = anchor.right + gap;
    let top = anchor.top;

    if (left + box.width > global.innerWidth - padding) {
      left = anchor.left - box.width - gap;
    }

    if (top + box.height > global.innerHeight - padding) {
      top = global.innerHeight - box.height - padding;
    }

    menu.style.left = `${Math.max(padding, Math.round(left))}px`;
    menu.style.top = `${Math.max(padding, Math.round(top))}px`;
  }

  function closeMenu(options = {}) {
    if (!menu || menu.hidden) return;

    const button = activeButton;

    menu.hidden = true;
    menu.classList.remove("is-open");

    activeButton?.classList.remove("is-open");
    activeButton?.setAttribute("aria-expanded", "false");

    activeButton = null;
    activeNodeId = "";

    if (options.restoreFocus && button?.isConnected) {
      button.focus?.({
        preventScroll: true,
      });
    }
  }

  function selectNodeInSchema(nodeId) {
    global.selectedId = nodeId;
    global.treeHasFocus = true;

    const tree = document.getElementById("tree");
    const nextRow = findRow(nodeId);

    tree?.querySelectorAll(".row.sel").forEach((row) => {
      row.classList.remove("sel");
    });

    nextRow?.classList.add("sel");
    relayoutSchema();
  }

  function openMenu(button, nodeId) {
    const sameButton = activeButton === button && !menu?.hidden;

    if (sameButton) {
      closeMenu({
        restoreFocus: false,
      });
      return;
    }

    global.propertyContextMenu?.close?.();

    activeButton?.classList.remove("is-open");
    activeButton?.setAttribute("aria-expanded", "false");

    activeButton = button;
    activeNodeId = String(nodeId || "");

    selectNodeInSchema(activeNodeId);
    buildMenu();

    menu.hidden = false;
    menu.classList.add("is-open");
    button.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");

    positionMenu(button);

    requestAnimationFrame(() => {
      menu.querySelector(".ui-dropdown-item")?.focus?.({
        preventScroll: true,
      });
    });
  }

  function createFallbackActionButton() {
    const button = document.createElement("span");
    button.className = "btn";

    const left = document.createElement("span");
    left.className = "br";
    left.textContent = "[";

    const middle = document.createElement("span");
    middle.className = "mid";
    middle.textContent = "✎";

    const right = document.createElement("span");
    right.className = "br";
    right.textContent = "]";

    button.append(left, middle, right);

    return button;
  }

  function appendButton(actions, node) {
    if (!actions || !node?.id) return null;

    const existing = actions.querySelector(
      `:scope > .schema-text-property-menu-button[data-node-id="${cssEscape(node.id)}"]`
    );

    if (existing) return existing;

    const button = createFallbackActionButton();

    button.classList.add("schema-text-property-menu-button");
    button.dataset.nodeId = node.id;
    button.tabIndex = 0;
    button.setAttribute("role", "button");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Заполнить текстовое свойство");
    button.title = "Заполнить текстовое свойство";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMenu(button, node.id);
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      event.stopPropagation();
      openMenu(button, node.id);
    });

    actions.appendChild(button);

    return button;
  }

  function enhanceRenderedRows() {
    const rows = document.querySelectorAll(
      "#tree .row[data-id]"
    );

    rows.forEach((row) => {
      if (row.closest(".structure-table")) return;

      const actions = row.querySelector(":scope > .act");
      const node = getNode(row.dataset.id);

      if (!actions || !node) return;

      const button = appendButton(actions, node);

      const renameButton = Array.from(
        actions.querySelectorAll(":scope > .btn")
      ).find((candidate) => {
        return (
          candidate !== button &&
          candidate.querySelector(":scope > .mid")?.textContent === ".."
        );
      });

      if (button && renameButton && button.nextSibling !== renameButton) {
        actions.insertBefore(button, renameButton);
      }
    });
  }

  function handleDocumentPointerDown(event) {
    if (menu?.hidden) return;

    if (
      menu?.contains(event.target) ||
      activeButton?.contains(event.target)
    ) {
      return;
    }

    closeMenu({
      restoreFocus: false,
    });
  }

  function handleDocumentKeyDown(event) {
    if (event.key !== "Escape" || menu?.hidden) return;

    event.preventDefault();
    event.stopPropagation();

    closeMenu({
      restoreFocus: true,
    });
  }

  function init() {
    ensureMenu();
    enhanceRenderedRows();

    document.addEventListener(
      "pointerdown",
      handleDocumentPointerDown,
      true
    );

    document.addEventListener(
      "keydown",
      handleDocumentKeyDown,
      true
    );

    document.addEventListener("scroll", closeMenu, true);
    global.addEventListener("resize", closeMenu);
    global.addEventListener("blur", closeMenu);
    global.addEventListener("view-tabs-change", closeMenu);
    global.addEventListener("project-properties-change", () => {
      closeMenu();
      enhanceRenderedRows();
    });
  }

  global.schemaTextPropertyEditor = {
    appendButton,
    enhanceRenderedRows,
    open: openMenu,
    close: closeMenu,
    startEdit,
    getTextProperties,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true,
    });
  } else {
    init();
  }
})();