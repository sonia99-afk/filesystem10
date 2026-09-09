// property_context_menu.js
//
// Контекстное меню свойства.
//
// Открывается:
//
// - по ПКМ на строке свойства
//   в панели «Настроить отображение»;
//
// - по ПКМ на заголовке обычной
//   колонки таблицы.
//
// На текущем этапе:
//
// - «Настроить» работает для Метки
//   и Заголовков уровней;
//
// - «Скрыть / Отобразить» использует
//   существующий тумблер свойства;
//
// - переименование и удаление
//   будут добавлены следующими этапами.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const global = window;

  const CONFIGURABLE_KEYS =
    new Set([
      "marks",
      "levelHeaders",
    ]);

    const MENU_ICON_PATHS =
  Object.freeze({
    resizeColumn:
      "icons/resize-column.svg",

    settings:
      "icons/settings.svg",

    hide:
      "icons/hide.svg",

    rename:
      "icons/rename.svg",

    delete:
      "icons/delete.svg",
  });

  let menu = null;
  let currentContext = null;

  /* =========================================================
     DOM
  ========================================================= */

  function createElement(
    tagName,
    className,
    text
  ) {
    const element =
      document.createElement(
        tagName
      );

    if (className) {
      element.className =
        className;
    }

    if (
      text !== undefined
    ) {
      element.textContent =
        text;
    }

    return element;
  }

  function getPropertyRow(
    key
  ) {
    if (
      key ===
      "levelHeaders"
    ) {
      return document.getElementById(
        "levelHeadersTools"
      );
    }

    return document.querySelector(
      (
        "#viewSettingsPanel " +
        '[data-view-property="' +
        escapeAttributeValue(key) +
        '"]'
      )
    );
  }

  function getPropertyToggle(
    key
  ) {
    const row =
      getPropertyRow(key);

    return (
      row?.querySelector(
        '.ui-toggle[role="switch"]'
      ) ||
      null
    );
  }

  function escapeAttributeValue(
    value
  ) {
    const text =
      String(value || "");

    if (
      global.CSS &&
      typeof global.CSS.escape ===
        "function"
    ) {
      return global.CSS.escape(
        text
      );
    }

    return text.replace(
      /["\\]/g,
      "\\$&"
    );
  }

  /* =========================================================
     Получение ключа свойства
  ========================================================= */

  function getPanelPropertyTarget(
    target
  ) {
    const row =
      target?.closest?.(
        (
          "#viewSettingsPanel " +
          "[data-view-property]"
        )
      );

    if (row) {
      const key =
        row.dataset
          .viewProperty || "";

      if (key) {
        return {
          key,
          element: row,
          source: "panel",
        };
      }
    }

    /*
      Запасной вариант для строки
      заголовков уровней.

      property_panel_tabs.js уже должен
      назначать ей data-view-property,
      но оставляем совместимость.
    */

    const levelHeadersRow =
      target?.closest?.(
        "#levelHeadersTools"
      );

    if (levelHeadersRow) {
      return {
        key:
          "levelHeaders",

        element:
          levelHeadersRow,

        source:
          "panel",
      };
    }

    return null;
  }

  function getPropertyKeyFromHeader(
    header
  ) {
    const columnKey =
      String(
        header?.dataset
          ?.tableColumnKey || ""
      );

    /*
      Простая колонка из table_columns.js:

      property:text
      property:priority
      property:timerDuration
    */

    if (
      columnKey.startsWith(
        "property:"
      )
    ) {
      const propertyKey =
        columnKey.slice(
          "property:".length
        );

      return (
        propertyKey &&
        !propertyKey.includes("|")
          ? propertyKey
          : ""
      );
    }

    /*
      Системные колонки, которые связаны
      с одной настройкой вида:

      setting:marks
      setting:ordinals
      setting:name
      setting:captions
    */

    if (
      columnKey.startsWith(
        "setting:"
      )
    ) {
      const settingKey =
        columnKey.slice(
          "setting:".length
        );

      /*
        Составные столбцы вроде:

        setting:startDate|endDate

        пока не обрабатываем, потому что
        они зависят сразу от нескольких
        исходных свойств.
      */

      return (
        settingKey &&
        !settingKey.includes("|")
          ? settingKey
          : ""
      );
    }

    /*
      system:id и system:уровень
      не являются свойствами проекта.
    */

    return "";
  }

  function getTablePropertyTarget(
    target
  ) {
    if (
      target?.closest?.(
        ".table-column-resize-handle"
      )
    ) {
      return null;
    }

    const header =
      target?.closest?.(
        (
          "#tree " +
          ".structure-table " +
          "thead th" +
          "[data-table-column-key]"
        )
      );

    if (!header) {
      return null;
    }

    const key =
  getPropertyKeyFromHeader(
    header
  );

const columnKey =
  String(
    header.dataset
      .tableColumnKey || ""
  );

if (!columnKey) {
  return null;
}

return {
  key,
  columnKey,
  element: header,
  source: "table",
};
  }

  function resolvePropertyTarget(
    target
  ) {
    return (
      getPanelPropertyTarget(
        target
      ) ||
      getTablePropertyTarget(
        target
      )
    );
  }

  /* =========================================================
     Состояние свойства
  ========================================================= */

  function getPropertyTitle(
    key,
    sourceElement
  ) {
    const projectTitle =
      global.projectProperties
        ?.getTitle?.(
          key
        );

    if (projectTitle) {
      return projectTitle;
    }

    const row =
      getPropertyRow(key);

    const panelTitle =
      row
        ?.querySelector(
          ".view-settings-control-name"
        )
        ?.textContent
        ?.trim();

    if (panelTitle) {
      return panelTitle;
    }

    const tableTitle =
      sourceElement
        ?.querySelector?.(
          ".table-column-header-label"
        )
        ?.textContent
        ?.trim();

    return (
      tableTitle ||
      key
    );
  }

  function isPropertyEnabled(
    key
  ) {
    if (key === "name") {
      return true;
    }

    const toggle =
      getPropertyToggle(
        key
      );

    if (toggle) {
      return (
        toggle.getAttribute(
          "aria-checked"
        ) === "true"
      );
    }

    if (
      key ===
      "levelHeaders"
    ) {
      return !!global
        .viewSettings
        ?.getActiveSettings?.()
        ?.interface
        ?.levelHeaders;
    }

    return (
      global.viewSettings
        ?.isPropertyEnabled?.(
          key
        ) !== false
    );
  }

  function isPropertyAvailable(
    key
  ) {
    const toggle =
      getPropertyToggle(
        key
      );

    if (toggle) {
      return (
        !toggle.disabled &&
        toggle.getAttribute(
          "aria-disabled"
        ) !== "true"
      );
    }

    if (
      key ===
      "levelHeaders"
    ) {
      const row =
        getPropertyRow(key);

      return !row?.classList
        .contains(
          "is-unavailable"
        );
    }

    return (
      global.viewSettings
        ?.isPropertyAvailable?.(
          key
        ) !== false
    );
  }

  function canToggleProperty(
    key
  ) {
    if (key === "name") {
      return false;
    }

    return (
      isPropertyAvailable(key) &&
      !!getPropertyToggle(key)
    );
  }

  /* =========================================================
   Возможность переименования
========================================================= */

function canRenameProperty(
  key
) {
  const descriptor =
    global.projectProperties
      ?.getDescriptor?.(
        key
      );

  if (!descriptor) {
    return false;
  }

  return (
    descriptor.renameable !==
    false
  );
}

  /* =========================================================
     Элементы меню
  ========================================================= */

  function createMenuItem({
  command,
  iconSrc,
  label,
  disabled = false,
  title = "",
}) {
  const button =
    createElement(
      "button",
      (
        "ui-dropdown-item " +
        "property-context-menu-item"
      )
    );

  button.type =
    "button";

  button.dataset
    .propertyCommand =
      command;

  button.setAttribute(
    "role",
    "menuitem"
  );

  const iconElement =
    createElement(
      "span",
      (
        "ui-dropdown-icon " +
        "property-context-menu-icon"
      )
    );

  iconElement.setAttribute(
    "aria-hidden",
    "true"
  );

  if (iconSrc) {
    const iconImage =
      createElement(
        "img",
        "property-context-menu-icon-image"
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

  const labelElement =
    createElement(
      "span",
      "ui-dropdown-label",
      label
    );

  button.append(
    iconElement,
    labelElement
  );

  if (disabled) {
    button.disabled =
      true;

    button.setAttribute(
      "aria-disabled",
      "true"
    );
  }

  if (title) {
    button.title =
      title;
  }

  return button;
}

  function ensureMenu() {
    if (menu) {
      return menu;
    }

    menu =
      createElement(
        "div",
        (
          "ui-dropdown-menu " +
          "property-context-menu"
        )
      );

    menu.id =
      "propertyContextMenu";

    menu.hidden =
      true;

    menu.setAttribute(
      "role",
      "menu"
    );

    menu.setAttribute(
      "aria-label",
      "Действия со свойством"
    );

    menu.addEventListener(
      "click",
      handleMenuClick
    );

    document.body.appendChild(
      menu
    );

    return menu;
  }

function buildMenu(
  context
) {
  const element =
    ensureMenu();

  element.replaceChildren();

  const {
    key,
  } = context;

  const available =
  key
    ? isPropertyAvailable(
        key
      )
    : true;

const enabled =
  key
    ? isPropertyEnabled(
        key
      )
    : true;

    /*
  Изменение ширины доступно
  для любого столбца таблицы.
*/

if (
  context.source === "table" &&
  context.columnKey
) {
  element.appendChild(
    createMenuItem({
      command:
        "resize-column",

      iconSrc:
  MENU_ICON_PATHS.resizeColumn,

      label:
        "Изменить ширину",
    })
  );
}

/*
  У системной колонки может
  не быть свойства проекта.

  В таком случае оставляем
  только изменение ширины.
*/

if (!key) {
  return (
    element.children.length >
    0
  );
}

  /*
    Настройка доступна только
    для Метки и Заголовков уровней.
  */

  if (
    CONFIGURABLE_KEYS.has(
      key
    )
  ) {
    element.appendChild(
      createMenuItem({
        command:
          "configure",

        iconSrc:
  MENU_ICON_PATHS.settings,

        label:
          "Настроить",

        disabled:
          !available,

        title:
          available
            ? ""
            : "Настройка недоступна в этом виде",
      })
    );
  }

  /*
    Название обязательно,
    поэтому его нельзя скрыть.

    У остальных свойств пункт показываем,
    только если существует рабочий тумблер.
  */

  if (
    key !== "name" &&
    getPropertyToggle(key)
  ) {
    element.appendChild(
      createMenuItem({
        command:
          "toggle",

        iconSrc:
  MENU_ICON_PATHS.hide,

        label:
          enabled
            ? "Скрыть"
            : "Отобразить",

        disabled:
          !canToggleProperty(
            key
          ),

        title:
          available
            ? ""
            : "Свойство недоступно в этом виде",
      })
    );
  }

  /*
    Переименование относится
    ко всему проекту.
  */

  element.appendChild(
    createMenuItem({
      command:
        "rename",

      iconSrc:
  MENU_ICON_PATHS.rename,

      label:
        "Переименовать",

      disabled:
        !canRenameProperty(
          key
        ),
    })
  );

  if (
  global.propertyDelete
    ?.canDelete?.(
      key
    )
) {
  element.appendChild(
    createMenuItem({
      command:
        "delete",

      iconSrc:
  MENU_ICON_PATHS.delete,

      label:
        "Удалить",
    })
  );
}

  return (
    element.children.length >
    0
  );
}
  /* =========================================================
     Позиционирование
  ========================================================= */

  function positionMenu(
    clientX,
    clientY
  ) {
    if (!menu) {
      return;
    }

    const viewportPadding =
      8;

    menu.style.left =
      "0px";

    menu.style.top =
      "0px";

    const rect =
      menu.getBoundingClientRect();

    let left =
      clientX;

    let top =
      clientY;

    if (
      left +
        rect.width +
        viewportPadding >
      global.innerWidth
    ) {
      left =
        global.innerWidth -
        rect.width -
        viewportPadding;
    }

    if (
      top +
        rect.height +
        viewportPadding >
      global.innerHeight
    ) {
      top =
        clientY -
        rect.height;
    }

    left =
      Math.max(
        viewportPadding,
        left
      );

    top =
      Math.max(
        viewportPadding,
        top
      );

    menu.style.left =
      `${Math.round(left)}px`;

    menu.style.top =
      `${Math.round(top)}px`;
  }

  /* =========================================================
     Открытие и закрытие
  ========================================================= */

  function clearTargetHighlight() {
    currentContext
      ?.element
      ?.classList
      ?.remove(
        "is-property-context-target"
      );
  }

  function closeMenu() {
    if (!menu) {
      return;
    }

    clearTargetHighlight();

    menu.hidden =
      true;

    menu.classList.remove(
      "is-open"
    );

    currentContext =
      null;
  }

  function openMenu(
    context,
    clientX,
    clientY
  ) {
    closeMenu();

    if (
      !buildMenu(
        context
      )
    ) {
      return false;
    }

    currentContext =
      context;

    context.element
      ?.classList
      ?.add(
        "is-property-context-target"
      );

    menu.hidden =
      false;

    menu.classList.add(
      "is-open"
    );

    positionMenu(
      clientX,
      clientY
    );

    const firstEnabled =
      menu.querySelector(
        (
          ".property-context-menu-item" +
          ":not(:disabled)"
        )
      );

    /*
      Не переводим фокус немедленно
      при открытии мышью.

      Это защищает таблицу от лишнего
      горизонтального скачка.
    */

    firstEnabled?.setAttribute(
      "tabindex",
      "0"
    );

    return true;
  }

  /* =========================================================
     Команда «Скрыть / Отобразить»
  ========================================================= */

  function toggleCurrentProperty() {
    const key =
      currentContext?.key;

    if (
      !key ||
      !canToggleProperty(key)
    ) {
      closeMenu();
      return;
    }

    const toggle =
      getPropertyToggle(
        key
      );

    closeMenu();

    /*
      Нажимаем существующий тумблер.

      Так сохраняются все прежние
      обработчики view_settings.js,
      mark-property и level_headers.
    */

    toggle?.click();
  }

  /* =========================================================
     Команда «Настроить»
  ========================================================= */

  function getConfigureButton(
    key
  ) {
    if (key === "marks") {
      return document.getElementById(
        "markSettingsBtn"
      );
    }

    if (
      key ===
      "levelHeaders"
    ) {
      return document.getElementById(
        "levelHeadersSettingsBtn"
      );
    }

    return null;
  }

  function configureCurrentProperty() {
  const key =
    currentContext?.key;

  if (
    !key ||
    !CONFIGURABLE_KEYS.has(key) ||
    !isPropertyAvailable(key)
  ) {
    closeMenu();
    return;
  }

  closeMenu();

  global.viewSettings
    ?.open?.();

  global.propertyPanelTabs
    ?.openDisplay?.();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const button =
        getConfigureButton(key);

      if (
        !button ||
        button.disabled
      ) {
        return;
      }

      button.click();
    });
  });
}

  /* =========================================================
   Команда «Переименовать»
========================================================= */

function renameCurrentProperty() {
  const context =
    currentContext;

  if (
    !context ||
    !canRenameProperty(
      context.key
    )
  ) {
    return;
  }

  const detail = {
    key:
      context.key,

    source:
      context.source,

    element:
      context.element,
  };

  /*
    Сначала создаём поле ввода,
    пока строка свойства ещё доступна.
  */

  const started =
    global.propertyRename
      ?.start?.(
        detail
      );

  if (!started) {
    return;
  }

  /*
    Только после успешного запуска
    скрываем контекстное меню.
    Панель «Настройка вида» остаётся открытой.
  */

  closeMenu();
}

/* =========================================================
   Команда «Изменить ширину»
========================================================= */

function resizeCurrentColumn() {
  const context =
    currentContext;

  if (
    !context ||
    context.source !== "table" ||
    !context.columnKey
  ) {
    closeMenu();
    return;
  }

  const table =
    context.element?.closest(
      ".structure-table"
    );

  const title =
    getPropertyTitle(
      context.key,
      context.element
    );

  /*
    Сначала сохраняем все нужные
    данные, затем закрываем меню.
  */

  const columnKey =
    context.columnKey;

  closeMenu();

  global.tableColumnWidthDialog
    ?.open?.({
      table,
      columnKey,
      title,
    });
}

  /* =========================================================
     Обработчики
  ========================================================= */

  function handleMenuClick(
    event
  ) {
    const item =
      event.target.closest(
        "[data-property-command]"
      );

    if (
      !item ||
      item.disabled
    ) {
      return;
    }

    const command =
      item.dataset
        .propertyCommand;

    if (
  command ===
  "resize-column"
) {
  event.preventDefault();
  event.stopPropagation();

  resizeCurrentColumn();
  return;
}

 if (
  command === "toggle"
) {
  toggleCurrentProperty();
  return;
}



if (
  command ===
  "configure"
) {
  event.preventDefault();
  event.stopPropagation();

  configureCurrentProperty();

  return;
}

if (
  command === "rename"
) {
  event.preventDefault();
  event.stopPropagation();

  renameCurrentProperty();

  return;
}

if (
  command === "delete"
) {
  const key =
    currentContext?.key;

  closeMenu();

  if (key) {
    global.propertyDelete
      ?.open?.(
        key
      );
  }

  return;
}
  }

  function handleContextMenu(
    event
  ) {
    const context =
      resolvePropertyTarget(
        event.target
      );

    if (!context) {
      closeMenu();
      return;
    }

    const opened =
      openMenu(
        context,
        event.clientX,
        event.clientY
      );

    if (!opened) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handleTableHeaderPointerUp(
  event
) {
  /*
    Обрабатываем только основную
    левую кнопку мыши.
  */

  if (event.button !== 0) {
    return;
  }

  /*
    После настоящего перетаскивания
    меню открываться не должно.
  */

  if (
    global.tableColumnReorder
      ?.wasRecentlyDragged?.(
        250
      )
  ) {
    return;
  }

  const context =
    getTablePropertyTarget(
      event.target
    );

  if (!context) {
    return;
  }

  /*
    В совмещённом виде столбец,
    закрытый структурой, нельзя
    настраивать через таблицу.
  */

  if (
    global.structureTableOcclusion
      ?.isHeaderCovered?.(
        context.element
      )
  ) {
    return;
  }

  const opened =
    openMenu(
      context,
      event.clientX,
      event.clientY
    );

  if (!opened) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
}

  function handlePointerDown(
    event
  ) {
    if (
      !menu ||
      menu.hidden
    ) {
      return;
    }

    if (
      menu.contains(
        event.target
      )
    ) {
      return;
    }

    closeMenu();
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key !==
      "Escape" ||
      !menu ||
      menu.hidden
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    closeMenu();
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    if (
      document.documentElement
        .dataset
        .propertyContextMenuBound ===
      "1"
    ) {
      return;
    }

    document.documentElement
      .dataset
      .propertyContextMenuBound =
        "1";

    ensureMenu();

    document.addEventListener(
      "contextmenu",
      handleContextMenu,
      true
    );

    document.addEventListener(
  "pointerup",
  handleTableHeaderPointerUp,
  true
);

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    document.addEventListener(
      "scroll",
      closeMenu,
      true
    );

    global.addEventListener(
      "resize",
      closeMenu
    );

    global.addEventListener(
      "blur",
      closeMenu
    );

    global.addEventListener(
      "view-tabs-change",
      closeMenu
    );

    global.addEventListener(
      "view-property-settings-change",
      closeMenu
    );
  }

  global.propertyContextMenu = {
    init,
    close:
      closeMenu,

    openForElement(
      element,
      clientX,
      clientY
    ) {
      const context =
        resolvePropertyTarget(
          element
        );

      if (!context) {
        return false;
      }

      return openMenu(
        context,
        clientX,
        clientY
      );
    },
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true,
      }
    );
  } else {
    init();
  }
})();