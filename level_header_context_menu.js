// level_header_context_menu.js
// ПКМ заголовка уровня и индивидуальная ширина отступа уровня.

(function () {
  if (typeof window === "undefined") return;

  const MODE_PIXELS = "pixels";
  const MODE_AUTO = "auto";
  const MIN_WIDTH = 1;
  const MAX_WIDTH = 1000;

  const LEVEL_CONTEXT_SCRIPT_URL =
  document.currentScript?.src ||
  document.baseURI;

function getLevelContextIconUrl(
  fileName
) {
  return new URL(
    "icons/" + fileName,
    LEVEL_CONTEXT_SCRIPT_URL
  ).href;
}

const LEVEL_CONTEXT_ICONS =
  Object.freeze({
    indent:
      getLevelContextIconUrl(
        "Отступ.svg"
      ),

    hide:
      getLevelContextIconUrl(
        "Скрыть объект.svg"
      ),

    show:
      getLevelContextIconUrl(
        "Показать объект.svg"
      ),

    collapse:
      getLevelContextIconUrl(
        "Свернуть объект.svg"
      ),

    expand:
      getLevelContextIconUrl(
        "Развернуть объект.svg"
      ),

    selectAll:
      getLevelContextIconUrl(
        "Один клик.svg"
      ),
  });

  const HEADER_SELECTOR = [
    ".level-header-item[data-level]",
    ".level-header-mini-item[data-level]",
    ".level-header-column-item[data-level]",
  ].join(",");

  let menu = null;
  let backdrop = null;
  let currentContext = null;
  let applyFrame = 0;
  let treeObserver = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
  }

  function ensureColumnWidthDialogStyles() {
  const href =
    "css/views/table/table_column_width_dialog.css";

  const alreadyLoaded =
    Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"]'
      )
    ).some((link) => {
      const current =
        link.getAttribute("href") || "";

      return (
        current === href ||
        current.endsWith("/" + href)
      );
    });

  if (alreadyLoaded) {
    return;
  }

  const link =
    document.createElement("link");

  link.rel = "stylesheet";
  link.href = href;
  link.dataset.levelIndentDialogStyles =
    "true";

  document.head.appendChild(link);
}

  function isSupportedView() {
    return (
      typeof VIEW !== "undefined" &&
      (
        currentView === VIEW.SCHEMA ||
        currentView === VIEW.STRUCTURE_TABLE
      )
    );
  }

  function getRootPixelVariable(name, fallback) {
    const value = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
    );

    return Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  }

  function getDefaultLineWidth() {
    return getRootPixelVariable("--branch-len", 16);
  }

  function getDefaultIndent() {
    return getRootPixelVariable("--text-indent", 28);
  }

  function getSettingsMap(create = false) {
    const settings = window.viewSettings?.getActiveSettings?.();
    const interfaceSettings = settings?.interface;

    if (!interfaceSettings) return null;

    const current = interfaceSettings.levelIndentWidths;

    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      if (!create) return null;
      interfaceSettings.levelIndentWidths = {};
    }

    return interfaceSettings.levelIndentWidths;
  }

  function getSavedWidth(level) {
    const value = Number(
      getSettingsMap(false)?.[String(Number(level))]
    );

    return (
      Number.isInteger(value) &&
      value >= MIN_WIDTH &&
      value <= MAX_WIDTH
    )
      ? value
      : null;
  }

  function getLineWidth(level) {
    return getSavedWidth(level) ?? getDefaultLineWidth();
  }

  function getIndent(level) {
    return (
      getDefaultIndent() +
      getLineWidth(level) -
      getDefaultLineWidth()
    );
  }

  function isAuto(level) {
    return getSavedWidth(level) === null;
  }

  function saveSettings() {
    window.projectAutosave?.saveNow?.();
  }

  function notifyChange(level) {
    window.dispatchEvent(
      new CustomEvent("level-indent-change", {
        detail: {
          level: Number(level),
          value: getLineWidth(level),
          mode: isAuto(level) ? MODE_AUTO : MODE_PIXELS,
        },
      })
    );
  }

  function rerender() {
    if (typeof window.render === "function") {
      window.render();
      return;
    }

    scheduleApply();
  }

  function setPixels(level, value) {
    const numericLevel = Number(level);
    const numericValue = Number(value);

    if (
      !Number.isInteger(numericLevel) ||
      numericLevel <= 0 ||
      !Number.isInteger(numericValue) ||
      numericValue < MIN_WIDTH ||
      numericValue > MAX_WIDTH
    ) {
      return false;
    }

    const map = getSettingsMap(true);
    if (!map) return false;

    map[String(numericLevel)] = numericValue;
    saveSettings();
    notifyChange(numericLevel);
    rerender();
    return true;
  }

  function setAuto(level) {
    const numericLevel = Number(level);
    const map = getSettingsMap(true);

    if (!map || !Number.isInteger(numericLevel) || numericLevel <= 0) {
      return false;
    }

    delete map[String(numericLevel)];
    saveSettings();
    notifyChange(numericLevel);
    rerender();
    return true;
  }

  function isStructureTreeList(list) {
    return !list.closest(
      ".level-headers-row, " +
      ".level-headers-cascade, " +
      ".level-headers-column"
    );
  }

  function applyNow() {
  if (!isSupportedView()) {
    return;
  }

  const host =
    document.getElementById("tree");

  if (!host) {
    return;
  }

  /*
    Применяет одинаковые размеры
    к структуре и её заголовкам.
  */

  function applyLevelMetrics(
    list,
    level
  ) {
    if (
      !list ||
      !Number.isInteger(level)
    ) {
      return;
    }

    list.style.setProperty(
      "--level-indent",
      `${getIndent(level)}px`
    );

    list.style.setProperty(
      "--level-branch-len",
      `${getLineWidth(level)}px`
    );
  }

  /*
    Настоящее дерево структуры.
  */

  host
    .querySelectorAll(
      "ul[data-level]"
    )
    .forEach((list) => {
      if (
        !isStructureTreeList(list)
      ) {
        return;
      }

      applyLevelMetrics(
        list,
        Number(list.dataset.level)
      );
    });

  /*
    Каскадные заголовки над структурой.

    Уровень берём из заголовка,
    находящегося непосредственно
    внутри текущего ul.
  */

  host
    .querySelectorAll(
      (
        ".level-headers-cascade-schema " +
        "ul.level-header-mini-tree"
      )
    )
    .forEach((list) => {
      const levelItem =
        list.querySelector(
          (
            ":scope > " +
            ".level-header-mini-li > " +
            ".level-header-mini-item" +
            "[data-level]"
          )
        );

      const level =
        Number(
          levelItem?.dataset.level
        );

      applyLevelMetrics(
        list,
        level
      );
    });

  requestAnimationFrame(() => {
    window.levelHeaders
      ?.alignHeaderRowForSchema?.();

    window.levelHeaders
      ?.layoutColumnCascadeLines?.();

    window.schemaActiveBlock
      ?.layout?.();

    window.schemaLines
      ?.layout?.();

    window.structureTableRowSync
      ?.schedule?.();
  });
}

  function scheduleApply() {
    cancelAnimationFrame(applyFrame);

    applyFrame = requestAnimationFrame(() => {
      applyFrame = 0;
      applyNow();
    });
  }

  function observeTree() {
    treeObserver?.disconnect?.();

    const host = document.getElementById("tree");
    if (!host || typeof MutationObserver === "undefined") return;

    treeObserver = new MutationObserver(scheduleApply);

    // Наблюдаем только замену содержимого #tree.
    // Изменения внутри линий дерева сюда не попадают.
    treeObserver.observe(host, {
      childList: true,
    });
  }

  function createMenuItem(
  command,
  iconSrc,
  label,
  disabled = false
) {
  const button =
    element(
      "button",
      (
        "ui-dropdown-item " +
        "level-header-context-item"
      )
    );

  button.type =
    "button";

  button.dataset
    .levelHeaderCommand =
      command;

  button.disabled =
    disabled;

  button.setAttribute(
    "role",
    "menuitem"
  );

  if (disabled) {
    button.setAttribute(
      "aria-disabled",
      "true"
    );
  }

  const iconElement =
    element(
      "span",
      (
        "ui-dropdown-icon " +
        "level-header-context-icon"
      )
    );

  iconElement.setAttribute(
    "aria-hidden",
    "true"
  );

  if (iconSrc) {
    const iconImage =
      element(
        "img",
        "level-header-context-icon-image"
      );

    iconImage.src =
      iconSrc;

    iconImage.alt =
      "";

    iconImage.draggable =
      false;

    iconElement.appendChild(
      iconImage
    );
  }

  button.append(
    iconElement,
    element(
      "span",
      "ui-dropdown-label",
      label
    )
  );

  return button;
}

  function createMenuTitle(text) {
    return element("div", "ui-dropdown-title level-header-context-title", text);
  }

  function ensureMenu() {
    if (menu) return menu;

    menu = element(
      "div",
      "ui-dropdown-menu level-header-context-menu"
    );

    menu.id = "levelHeaderContextMenu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Действия с уровнем");

    menu.addEventListener("click", handleMenuClick);
    document.body.appendChild(menu);

    return menu;
  }

  function buildMenu(level) {
  const hidden =
    window.hideLevels
      ?.isHidden?.(level) ===
    true;

  const rootLevel =
    level === 0;

  const menuElement =
    ensureMenu();

  menuElement.replaceChildren(
    createMenuTitle(
      "Размер отступа"
    ),

    createMenuItem(
      "change-indent",
      LEVEL_CONTEXT_ICONS.indent,
      "Изменить ширину",
      rootLevel
    ),

    createMenuTitle(
      "Видимость объектов"
    ),

    createMenuItem(
      "hide",
      LEVEL_CONTEXT_ICONS.hide,
      "Скрыть",
      rootLevel || hidden
    ),

    createMenuItem(
      "show",
      LEVEL_CONTEXT_ICONS.show,
      "Показать",
      rootLevel || !hidden
    ),

    createMenuItem(
      "collapse",
      LEVEL_CONTEXT_ICONS.collapse,
      "Свернуть"
    ),

    createMenuItem(
      "expand",
      LEVEL_CONTEXT_ICONS.expand,
      "Развернуть"
    ),

    createMenuTitle(
      "Выделение объектов"
    ),

    createMenuItem(
      "select-all",
      LEVEL_CONTEXT_ICONS.selectAll,
      "Выбрать все"
    )
  );
}

  function positionMenu(clientX, clientY) {
    const padding = 8;

    menu.style.left = "0px";
    menu.style.top = "0px";

    const rect = menu.getBoundingClientRect();
    let left = clientX;
    let top = clientY;

    if (left + rect.width + padding > window.innerWidth) {
      left = window.innerWidth - rect.width - padding;
    }

    if (top + rect.height + padding > window.innerHeight) {
      top = clientY - rect.height;
    }

    menu.style.left = `${Math.max(padding, Math.round(left))}px`;
    menu.style.top = `${Math.max(padding, Math.round(top))}px`;
  }

  function closeMenu() {
    currentContext?.element?.classList.remove(
      "is-level-header-context-target"
    );

    if (menu) {
      menu.hidden = true;
      menu.classList.remove("is-open");
    }

    currentContext = null;
  }

  function openMenu(element, level, clientX, clientY) {
    closeMenu();
    window.propertyContextMenu?.close?.();

    currentContext = {
      element,
      level,
      title: window.levelHeaders?.getLevelTitle?.(level) || `Уровень ${level}`,
    };

    buildMenu(level);

    element.classList.add("is-level-header-context-target");
    menu.hidden = false;
    menu.classList.add("is-open");
    positionMenu(clientX, clientY);
  }

  function selectedMode() {
    return (
      backdrop?.querySelector(
        'input[name="levelIndentMode"]:checked'
      )?.value || MODE_AUTO
    );
  }

  function syncRadioIndicators() {
    backdrop?.querySelectorAll(".level-indent-option").forEach((option) => {
      const radio = option.querySelector('input[type="radio"]');
      const indicator = option.querySelector(".view-settings-interface-radio");

      indicator?.classList.toggle("is-selected", radio?.checked === true);
    });
  }

  function syncDialogMode() {
    const input = backdrop?.querySelector("#levelIndentInput");

    if (input) {
      input.disabled = selectedMode() !== MODE_PIXELS;
    }

    syncRadioIndicators();
  }

  function showError(text) {
    const error = backdrop?.querySelector("#levelIndentError");
    if (!error) return;

    error.textContent = text || "";
    error.hidden = !text;
  }

  function createOption(value, text) {
    const label = element(
  "label",
  "table-column-width-option level-indent-option"
);
    const radio = document.createElement("input");

    radio.type = "radio";
    radio.name = "levelIndentMode";
    radio.value = value;
    radio.className =
  "table-column-width-native-radio level-indent-native-radio";
    radio.addEventListener("change", syncDialogMode);

    const indicator = element(
      "span",
      (
  "view-settings-interface-radio " +
  "table-column-width-radio " +
  "level-indent-radio"
)
    );

    indicator.setAttribute("aria-hidden", "true");

    label.append(radio, indicator, element("span", "", text));
    return label;
  }

  function closeDialog() {
    if (!backdrop) return;

    backdrop.hidden = true;
    backdrop.classList.remove("is-open");
    currentContext = null;
  }

  function saveDialog() {
    const context = currentContext;
    if (!context) return closeDialog();

    if (selectedMode() === MODE_AUTO) {
      setAuto(context.level);
      closeDialog();
      return;
    }

    const input = backdrop.querySelector("#levelIndentInput");
    const value = Number(input?.value);

    if (
      !Number.isInteger(value) ||
      value < MIN_WIDTH ||
      value > MAX_WIDTH
    ) {
      showError(`Введите целое число от ${MIN_WIDTH} до ${MAX_WIDTH}.`);
      input?.focus({ preventScroll: true });
      return;
    }

    if (!setPixels(context.level, value)) {
      showError("Не удалось изменить ширину отступа.");
      return;
    }

    closeDialog();
  }

  function createDialog() {
    backdrop = element(
  "div",
  (
    "property-delete-backdrop " +
    "table-column-width-backdrop " +
    "level-indent-backdrop"
  )
);

    backdrop.id = "levelIndentBackdrop";
    backdrop.hidden = true;

    const modal = element(
  "form",
  (
    "property-delete-modal " +
    "table-column-width-modal " +
    "level-indent-modal"
  )
);

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const title = element(
  "div",
  (
    "property-delete-title " +
    "table-column-width-title " +
    "level-indent-title"
  )
);
    title.id = "levelIndentTitle";

    const body = element(
  "div",
  "table-column-width-body level-indent-body"
);
    const pixelsGroup = element(
  "div",
  "table-column-width-pixels level-indent-pixels"
);
    const pixelsOption = createOption(
      MODE_PIXELS,
      "Ширина линии в пикселях"
    );

    const input = document.createElement("input");
    input.id = "levelIndentInput";
    input.className =
  "table-column-width-input level-indent-input";
    input.type = "number";
    input.min = String(MIN_WIDTH);
    input.max = String(MAX_WIDTH);
    input.step = "1";
    input.placeholder = "Введите текст";

    pixelsGroup.append(pixelsOption, input);

    const autoOption = createOption(MODE_AUTO, "Авторазмер");
    autoOption.querySelector("span:last-child").id = "levelIndentAutoLabel";

    const error = element(
  "div",
  "table-column-width-error level-indent-error"
);
    error.id = "levelIndentError";
    error.hidden = true;

    const actions = element("div", "property-delete-actions");
    const saveButton = element("button", "btnn save", "Сохранить");
    const cancelButton = element(
      "button",
      "btnn dontsave",
      "Не сохранять"
    );

    saveButton.type = "submit";
    cancelButton.type = "button";
    cancelButton.addEventListener("click", closeDialog);

    actions.append(saveButton, cancelButton);
    body.append(pixelsGroup, autoOption, error);
    modal.append(title, body, actions);
    backdrop.appendChild(modal);

    modal.addEventListener("submit", (event) => {
      event.preventDefault();
      saveDialog();
    });

    backdrop.addEventListener("pointerdown", (event) => {
      if (event.target === backdrop) closeDialog();
    });

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function openDialog(context) {
    if (!context || context.level <= 0) return false;

    closeMenu();

    const root = backdrop || createDialog();
    currentContext = context;

    root.querySelector("#levelIndentTitle").textContent =
      `Изменить размер отступа — уровень ${context.level} «${context.title}»`;

    const pixelsRadio = root.querySelector('input[value="pixels"]');
    const autoRadio = root.querySelector('input[value="auto"]');
    const auto = isAuto(context.level);

    pixelsRadio.checked = !auto;
    autoRadio.checked = auto;

    root.querySelector("#levelIndentInput").value = String(
      getLineWidth(context.level)
    );

    root.querySelector("#levelIndentAutoLabel").textContent =
      `Авторазмер (${getDefaultLineWidth()}px)`;

    showError("");
    syncDialogMode();

    root.hidden = false;
    root.classList.add("is-open");

    requestAnimationFrame(() => {
      if (!auto) {
        const input = root.querySelector("#levelIndentInput");
        input.focus({ preventScroll: true });
        input.select?.();
      }
    });

    return true;
  }

  function handleMenuClick(event) {
    const item = event.target.closest("[data-level-header-command]");
    if (!item || item.disabled || !currentContext) return;

    event.preventDefault();
    event.stopPropagation();

    const command = item.dataset.levelHeaderCommand;
    const context = { ...currentContext };

    if (command === "change-indent") {
      openDialog(context);
      return;
    }

    closeMenu();

    if (command === "hide") {
      window.hideLevels?.hideLevel?.(context.level);
      return;
    }

    if (command === "show") {
      window.hideLevels?.showLevel?.(context.level);
      return;
    }

    if (command === "collapse") {
      window.collapseNodes?.collapseLevel?.(context.level);
      return;
    }

    if (command === "expand") {
      window.collapseNodes?.expandLevel?.(context.level);
      return;
    }

    if (command === "select-all") {
      window.multiSelect?.selectLevel?.(context.level);
    }
  }

  function handleContextMenu(event) {
    const header = event.target?.closest?.(HEADER_SELECTOR);

    if (!header || !isSupportedView()) {
      closeMenu();
      return;
    }

    const level = Number(header.dataset.level);
    if (!Number.isInteger(level)) return;

    event.preventDefault();
    event.stopPropagation();

    openMenu(header, level, event.clientX, event.clientY);
  }

  function handlePointerDown(event) {
    if (menu && !menu.hidden && !menu.contains(event.target)) {
      closeMenu();
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;

    if (backdrop && !backdrop.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }

    if (menu && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    }
  }

  function init() {
     ensureColumnWidthDialogStyles();
     
    ensureMenu();
    observeTree();
    scheduleApply();

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("scroll", closeMenu, true);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("view-tabs-change", scheduleApply);
  }

  window.levelIndents = {
    MIN_WIDTH,
    MAX_WIDTH,
    getWidth: getLineWidth,
    getIndent,
    isAuto,
    setPixels,
    setAuto,
    apply: scheduleApply,
    openDialog,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();