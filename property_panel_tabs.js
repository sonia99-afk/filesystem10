// property_panel_tabs.js
//
// Две вкладки панели свойств:
//
// - Создать;
// - Настроить отображение.
//
// Во вкладке отображения свойства делятся на:
//
// - Отображаемые;
// - Скрытые;
// - Недоступные.
//
// Модуль не пересоздаёт существующие строки.
// Он перемещает уже работающие DOM-элементы,
// сохраняя старые тумблеры, меню и обработчики.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const global = window;

  const TAB_CREATE =
    "create";

  const TAB_DISPLAY =
    "display";

  const LEVEL_HEADERS_KEY =
    "levelHeaders";

  let activeTab =
    TAB_DISPLAY;

  let managerElement =
    null;

  let oldPropertiesSection =
    null;

  let createList =
    null;

  let createEmpty =
    null;

  let displayedList =
    null;

  let displayedEmpty =
    null;

  let displayedCount =
    null;

  let hiddenList =
    null;

  let hiddenEmpty =
    null;

  let hiddenCount =
    null;

  let unavailableList =
    null;

  let unavailableEmpty =
    null;

  let unavailableCount =
    null;

  let parkingContainer =
    null;

  let renderFrame =
    0;

  const rowsByKey =
    new Map();

  /* =========================================================
     DOM helpers
  ========================================================= */

  function panel() {
    return document.getElementById(
      "viewSettingsPanel"
    );
  }

  function propertiesCountElement() {
    return document.getElementById(
      "viewSettingsPropertiesCount"
    );
  }

  function getOldPropertiesSection() {
    const count =
      propertiesCountElement();

    return (
      count?.closest(
        ".view-settings-section"
      ) ||
      null
    );
  }

  function getActiveItem() {
    return (
      global.viewSettings
        ?.getActiveItem?.() ||
      null
    );
  }

  function getActiveSettings() {
    return (
      global.viewSettings
        ?.getActiveSettings?.() ||
      null
    );
  }

  /* =========================================================
     Создание элементов
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

  function createTabButton(
    tab,
    text
  ) {
    const button =
      createElement(
        "button",
        "view-settings-property-tab",
        text
      );

    button.type =
      "button";

    button.dataset
      .propertyTab =
        tab;

    button.setAttribute(
      "role",
      "tab"
    );

    button.setAttribute(
      "aria-selected",
      "false"
    );

    button.addEventListener(
      "click",
      () => {
        setActiveTab(tab);
      }
    );

    return button;
  }

  function createGroup(
    title,
    tooltipText = ""
  ) {
    const section =
      createElement(
        "section",
        "view-settings-property-group"
      );

    const header =
      createElement(
        "div",
        "view-settings-property-group-header"
      );

    const heading =
      createElement(
        "span",
        "view-settings-property-group-title",
        title
      );

    const count =
      createElement(
        "span",
        "view-settings-property-group-count",
        "0"
      );

    const list =
      createElement(
        "div",
        "view-settings-property-group-list"
      );

    const empty =
      createElement(
        "div",
        "view-settings-property-group-empty",
        "Нет свойств"
      );

    /*
      Подсказка появляется после долгого
      наведения именно на заголовок группы.
    */

    if (
      tooltipText &&
      window.uiTooltip?.attach
    ) {
      window.uiTooltip.attach(
        heading,
        {
          text:
            tooltipText,

          showDelay:
            700,

          hideDelay:
            60,

          preferredPlacements: [
            "left",
            "right",
            "bottom",
            "top",
          ],
        }
      );
    }

    header.append(
      heading,
      count
    );

    section.append(
      header,
      list,
      empty
    );

    return {
      section,
      list,
      count,
      empty,
    };
  }

  /* =========================================================
     Основной интерфейс
  ========================================================= */

  function buildManager() {
    const root =
      panel();

    oldPropertiesSection =
      getOldPropertiesSection();

    if (
      !root ||
      !oldPropertiesSection
    ) {
      return false;
    }

    if (
      root.querySelector(
        "#viewSettingsPropertyManager"
      )
    ) {
      return false;
    }

    managerElement =
      createElement(
        "div",
        "view-settings-property-manager"
      );

    managerElement.id =
      "viewSettingsPropertyManager";

    const tabs =
      createElement(
        "div",
        "view-settings-property-tabs"
      );

    tabs.setAttribute(
      "role",
      "tablist"
    );

    tabs.setAttribute(
      "aria-label",
      "Управление свойствами"
    );

    const createTab =
      createTabButton(
        TAB_CREATE,
        "Создать"
      );

    const displayTab =
      createTabButton(
        TAB_DISPLAY,
        "Настроить отображение"
      );

    tabs.append(
      createTab,
      displayTab
    );

    /* -------------------------
       Вкладка «Создать»
    ------------------------- */

    const createPanel =
      createElement(
        "div",
        "view-settings-property-tab-panel"
      );

    createPanel.dataset
      .propertyTabPanel =
        TAB_CREATE;

    createPanel.setAttribute(
      "role",
      "tabpanel"
    );

    createList =
      createElement(
        "div",
        "view-settings-create-list"
      );

    createEmpty =
      createElement(
        "div",
        "view-settings-property-empty-state",
        "Все доступные свойства уже созданы"
      );

    createPanel.append(
      createList,
      createEmpty
    );

    /* -------------------------
       Вкладка отображения
    ------------------------- */

    const displayPanel =
      createElement(
        "div",
        "view-settings-property-tab-panel"
      );

    displayPanel.dataset
      .propertyTabPanel =
        TAB_DISPLAY;

    displayPanel.setAttribute(
      "role",
      "tabpanel"
    );

    const displayedGroup =
      createGroup(
        "Отображаемые",

        "Свойства, которые добавлены в проект и отображаются в текущем виде."
      );

    displayedList =
      displayedGroup.list;

    displayedCount =
      displayedGroup.count;

    displayedEmpty =
      displayedGroup.empty;

    const hiddenGroup =
      createGroup(
        "Скрытые",

        "Свойства, которые добавлены в проект, но скрыты пользователем в текущем виде."
      );

    hiddenList =
      hiddenGroup.list;

    hiddenCount =
      hiddenGroup.count;

    hiddenEmpty =
      hiddenGroup.empty;

    const unavailableGroup =
      createGroup(
        "Недоступные",

        "Свойства, которые добавлены в проект, но недоступны для отображения в текущем виде."
      );

    unavailableList =
      unavailableGroup.list;

    unavailableCount =
      unavailableGroup.count;

    unavailableEmpty =
      unavailableGroup.empty;

    unavailableGroup
      .section
      .classList
      .add(
        "is-unavailable-group"
      );

    displayPanel.append(
      displayedGroup.section,
      hiddenGroup.section,
      unavailableGroup.section
    );

    /*
      Сюда временно перемещаются строки
      свойств, которые удалены из проекта.

      Контейнер невидим, но сами строки
      не уничтожаются.
    */

    parkingContainer =
      createElement(
        "div",
        "view-settings-property-parking"
      );

    parkingContainer.hidden =
      true;

    managerElement.append(
      tabs,
      createPanel,
      displayPanel,
      parkingContainer
    );

    oldPropertiesSection
      .before(
        managerElement
      );

    return true;
  }

  /* =========================================================
     Поиск существующих строк
  ========================================================= */

function refreshExistingRows() {
  const root =
    panel();

  if (!root) {
    return;
  }

  rowsByKey.clear();

  /*
    Ищем строки во всей панели,
    потому что часть уже могла быть
    перенесена в новые группы.
  */

  root
    .querySelectorAll(
      "[data-view-property-row]"
    )
    .forEach(
      (row) => {
        const key =
          row.dataset
            .viewProperty;

        if (!key) {
          return;
        }

        rowsByKey.set(
          key,
          row
        );
      }
    );



  rowsByKey.forEach(
    (
      row,
      key
    ) => {
      row.dataset
        .propertyManagerRow =
          "1";

      row.dataset
        .viewProperty =
          key;
    }
  );

  if (
    oldPropertiesSection
  ) {
    oldPropertiesSection.hidden =
      true;
  }
}

  /* =========================================================
     Состояние свойства
  ========================================================= */

  function isPropertyCreated(
    key
  ) {
    const checker =
      global.projectProperties
        ?.isCreated;

    if (
      typeof checker !==
      "function"
    ) {
      return true;
    }

    return (
      checker.call(
        global.projectProperties,
        key
      ) !== false
    );
  }

  function getPropertyDescriptor(
    key
  ) {
    return (
      global.projectProperties
        ?.getDescriptor?.(
          key
        ) ||
      null
    );
  }

  function getPropertyTitle(
    key,
    row
  ) {
    const projectTitle =
      global.projectProperties
        ?.getTitle?.(
          key
        );

    if (projectTitle) {
      return projectTitle;
    }

    const rowTitle =
      row
        ?.querySelector(
          ".view-settings-control-name"
        )
        ?.textContent
        ?.trim();

    return (
      rowTitle ||
      getPropertyDescriptor(key)
        ?.title ||
      key
    );
  }

  function isLevelHeadersAvailable(
    item
  ) {
    return (
      item?.kind ===
        "schema" ||
      item?.kind ===
        "table"
    );
  }

  function isPropertyAvailable(
    key,
    item
  ) {
    if (
      key ===
      LEVEL_HEADERS_KEY
    ) {
      return (
        isLevelHeadersAvailable(
          item
        )
      );
    }

    if (key === "name") {
      return true;
    }

    const checker =
      global.viewSettings
        ?.isPropertyAvailable;

    if (
      typeof checker !==
      "function"
    ) {
      return true;
    }

    return (
      checker.call(
        global.viewSettings,
        key
      ) !== false
    );
  }

  function isPropertyEnabled(
    key,
    settings
  ) {
    if (
      key ===
      LEVEL_HEADERS_KEY
    ) {
      return !!settings
        ?.interface
        ?.levelHeaders;
    }

    if (key === "name") {
      return true;
    }

    const checker =
      global.viewSettings
        ?.isPropertyEnabled;

    if (
      typeof checker ===
      "function"
    ) {
      return (
        checker.call(
          global.viewSettings,
          key
        ) !== false
      );
    }

    return !!settings
      ?.properties
      ?.[key];
  }

  /* =========================================================
     Обновление названия строки
  ========================================================= */

  function syncRowTitle(
    key,
    row
  ) {
    const title =
      getPropertyTitle(
        key,
        row
      );

    const name =
      row.querySelector(
        ".view-settings-control-name"
      );

    if (name) {
      name.textContent =
        title;
    }

    const toggle =
      row.querySelector(
        '.ui-toggle[role="switch"]'
      );

    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        title
      );
    }
  }

  /* =========================================================
     Распределение строк
  ========================================================= */

    function getTablePropertyOrder(
      item
    ) {
      if (
        item?.kind !== "table" &&
        item?.kind !== "structure-table"
      ) {
        return [];
      }

    const columnOrder =
      item.settings
        ?.tableColumnOrder;

    if (
      !Array.isArray(
        columnOrder
      )
    ) {
      return [];
    }

    const result = [];

    columnOrder.forEach(
      (columnKey) => {
        const value =
          String(
            columnKey || ""
          );

        let propertyKeys = [];

        /*
          Обычная колонка свойства:

          property:text
          property:icon
        */

        if (
          value.startsWith(
            "property:"
          )
        ) {
          propertyKeys = [
            value.slice(
              "property:".length
            ),
          ];
        }

        /*
          Системное свойство вида:

          setting:marks
          setting:ordinals
          setting:startDate|endDate
        */

        if (
          value.startsWith(
            "setting:"
          )
        ) {
          propertyKeys =
            value
              .slice(
                "setting:".length
              )
              .split("|");
        }

        propertyKeys.forEach(
          (key) => {
            if (
              key &&
              !result.includes(key)
            ) {
              result.push(key);
            }
          }
        );
      }
    );

    return result;
  }

  function getRowsInDisplayOrder(
    item
  ) {
    const propertyOrder =
      getTablePropertyOrder(
        item
      );

    if (!propertyOrder.length) {
      return rowsByKey;
    }

    const positions =
      new Map(
        propertyOrder.map(
          (
            key,
            index
          ) => [
            key,
            index,
          ]
        )
      );

    const entries =
      Array.from(
        rowsByKey.entries()
      ).map(
        (
          [key, row],
          initialIndex
        ) => {
          return {
            key,
            row,
            initialIndex,
          };
        }
      );

    entries.sort(
      (
        left,
        right
      ) => {
        const leftPosition =
          positions.has(
            left.key
          )
            ? positions.get(
                left.key
              )
            : Number.MAX_SAFE_INTEGER;

        const rightPosition =
          positions.has(
            right.key
          )
            ? positions.get(
                right.key
              )
            : Number.MAX_SAFE_INTEGER;

        if (
          leftPosition !==
          rightPosition
        ) {
          return (
            leftPosition -
            rightPosition
          );
        }

        return (
          left.initialIndex -
          right.initialIndex
        );
      }
    );

    return new Map(
      entries.map(
        ({
          key,
          row,
        }) => [
          key,
          row,
        ]
      )
    );
  }

  function renderDisplayGroups() {
    const item =
      getActiveItem();

    const settings =
      getActiveSettings();

    if (
      !displayedList ||
      !hiddenList ||
      !unavailableList
    ) {
      return;
    }

    let displayedTotal = 0;
    let hiddenTotal = 0;
    let unavailableTotal = 0;

    getRowsInDisplayOrder(
      item
    ).forEach(
      (
        row,
        key
      ) => {
        syncRowTitle(
          key,
          row
        );

        /*
          Несозданное свойство
          не должно находиться во вкладке
          настройки отображения.
        */

        if (
          !isPropertyCreated(
            key
          )
        ) {
          parkingContainer
            ?.appendChild(
              row
            );

          return;
        }

        const available =
          isPropertyAvailable(
            key,
            item
          );

        if (!available) {
          row.classList.add(
            "is-unavailable"
          );

          unavailableList
            .appendChild(
              row
            );

          unavailableTotal += 1;
          return;
        }

        row.classList.remove(
          "is-unavailable"
        );

        const enabled =
          isPropertyEnabled(
            key,
            settings
          );

        if (enabled) {
          displayedList
            .appendChild(
              row
            );

          displayedTotal += 1;
        } else {
          hiddenList
            .appendChild(
              row
            );

          hiddenTotal += 1;
        }
      }
    );

    displayedCount.textContent =
      String(displayedTotal);

    hiddenCount.textContent =
      String(hiddenTotal);

    unavailableCount.textContent =
      String(unavailableTotal);

    displayedEmpty.hidden =
      displayedTotal > 0;

    hiddenEmpty.hidden =
      hiddenTotal > 0;

    unavailableEmpty.hidden =
      unavailableTotal > 0;
  }

 /* =========================================================
   Вкладка «Создать»
========================================================= */

const createFeedbackTypes =
  new Set();

const createFeedbackTimers =
  new Map();

function isRepeatableDescriptor(
  descriptor
) {
  return (
    descriptor
      ?.multiplicity ===
    "repeatable"
  );
}

function getCreateCatalog() {
  return (
    global.projectProperties
      ?.getCatalog?.() ||
    []
  ).filter(
    (descriptor) => {
      return (
        descriptor.kind ===
          "property" &&
        descriptor.createable !==
          false
      );
    }
  );
}

function getInstancesCount(
  type
) {
  return (
    global.projectProperties
      ?.getInstancesByType?.(
        type
      )
      ?.length ||
    0
  );
}

function showCreateFeedback(
  type
) {
  createFeedbackTypes.add(
    type
  );

  const oldTimer =
    createFeedbackTimers.get(
      type
    );

  if (oldTimer) {
    clearTimeout(
      oldTimer
    );
  }

  const timer =
    setTimeout(
      () => {
        createFeedbackTypes.delete(
          type
        );

        createFeedbackTimers.delete(
          type
        );

        scheduleRender();
      },
      1100
    );

  createFeedbackTimers.set(
    type,
    timer
  );
}

function createCreateItem(
  descriptor
) {
  const repeatable =
    isRepeatableDescriptor(
      descriptor
    );

  const count =
    getInstancesCount(
      descriptor.key
    );

  const showingFeedback =
    createFeedbackTypes.has(
      descriptor.key
    );

  const row =
    createElement(
      "div",
      "view-settings-create-row"
    );

  row.dataset
    .projectPropertyType =
      descriptor.key;

  const main =
    createElement(
      "div",
      "view-settings-control-main"
    );

  const icon =
    createElement(
      "span",
      "view-settings-property-icon",
      descriptor.icon || "·"
    );

  icon.setAttribute(
    "aria-hidden",
    "true"
  );

  const name =
    createElement(
      "span",
      "view-settings-control-name",
      descriptor.title ||
      descriptor.key
    );

  main.append(
    icon,
    name
  );

  const button =
    createElement(
      "button",
      (
        "ui-action-button " +
        "ui-action-button--soft " +
        "view-settings-create-button"
      )
    );

  button.type =
    "button";

  /*
    Одиночное:
      Создать -> Добавлено

    Повторяемое:
      Создать
      Добавлено
      Создать ещё
  */

  if (
    !repeatable &&
    count > 0
  ) {
    button.textContent =
      "Добавлено";

    button.disabled =
      true;
  }

  else if (
    showingFeedback
  ) {
    button.textContent =
      "Добавлено";

    button.disabled =
      true;
  }

  else if (
    repeatable &&
    count > 0
  ) {
    button.textContent =
      "Создать ещё";
  }

  else {
    button.textContent =
      "Создать";
  }

  if (!button.disabled) {
    button.addEventListener(
      "click",
      () => {
        createPropertyInstance(
          descriptor.key
        );
      }
    );
  }

  row.append(
    main,
    button
  );

  return row;
}

function appendCreateGroup(
  title,
  descriptors,
  options = {}
) {
  if (
    !createList ||
    !descriptors.length
  ) {
    return;
  }

  const group =
    createElement(
      "section",
      "view-settings-create-group"
    );

  if (
    options.spaced
  ) {
    group.classList.add(
      "is-spaced"
    );
  }

const heading =
  createElement(
    "div",
    "view-settings-create-group-title",
    title
  );

/*
  Подсказка о типе свойств группы.
*/

if (
  title === "Одиночные"
) {
  heading.title =
    "Можно создать только один раз";
}

if (
  title === "Повторяемые"
) {
  heading.title =
    "Можно создать несколько раз";
}

group.appendChild(
  heading
);

  descriptors.forEach(
    (descriptor) => {
      group.appendChild(
        createCreateItem(
          descriptor
        )
      );
    }
  );

  createList.appendChild(
    group
  );
}

function renderCreateList() {
  if (
    !createList ||
    !createEmpty
  ) {
    return;
  }

  createList.replaceChildren();

  const catalog =
    getCreateCatalog();

  const singles =
    catalog.filter(
      (descriptor) =>
        !isRepeatableDescriptor(
          descriptor
        )
    );

  const repeatables =
    catalog.filter(
      (descriptor) =>
        isRepeatableDescriptor(
          descriptor
        )
    );

  appendCreateGroup(
    "Одиночные",
    singles
  );

  appendCreateGroup(
    "Повторяемые",
    repeatables,
    {
      spaced:
        singles.length > 0,
    }
  );

  createEmpty.hidden =
    catalog.length > 0;
}


/* =========================================================
   Создание экземпляра свойства
========================================================= */

function createPropertyInstance(
  type
) {
  const descriptor =
    global.projectProperties
      ?.getDescriptor?.(
        type
      );

  if (!descriptor) {
    return;
  }

  const repeatable =
    isRepeatableDescriptor(
      descriptor
    );

  /*
    Одиночный уже существует.
  */

  if (
    !repeatable &&
    getInstancesCount(type) >
      0
  ) {
    scheduleRender();
    return;
  }

  /*
    Одно действие Undo.
  */

  global.pushHistory?.();

  const instance =
    global.projectProperties
      ?.createInstance?.(
        type,
        {
          save: false,
          dispatch: false,
        }
      );

  if (!instance) {
    return;
  }

  /*
    Создаём настройку видимости
    этого экземпляра во ВСЕХ видах.
  */

const tabsState =
  global.viewTabs
    ?.normalizeState?.() ||
  global.viewTabsState;

if (
  tabsState &&
  Array.isArray(
    tabsState.items
  )
) {
  const activeId =
    tabsState.activeId;

  tabsState.items.forEach(
    (item) => {
      const settings =
        global.viewSettings
          ?.ensureItemSettings?.(
            item
          );

      if (!settings) {
        return;
      }

      const available =
        global.viewSettings
          ?.isPropertyAvailableForItem?.(
            item,
            instance.id
          ) !== false;

      /*
        Новое свойство автоматически
        показываем только в том виде,
        из которого его создали.

        Во всех остальных видах:
        - доступное -> скрыто;
        - недоступное -> всё равно false
          и попадёт в "Недоступные".
      */

      settings.properties[
        instance.id
      ] =
        (
          item.id === activeId &&
          available
        );
    }
  );
}

  global.projectAutosave
    ?.saveNow?.();

  /*
    Теперь сообщаем всем модулям,
    что появился новый экземпляр.
  */

  global.dispatchEvent(
    new CustomEvent(
      "project-properties-change",
      {
        detail: {
          key:
            instance.id,

          instanceId:
            instance.id,

          type:
            instance.type,

          action:
            "create",
        },
      }
    )
  );

  const activeItem =
    global.viewSettings
      ?.getActiveItem?.();

  const activeSettings =
    global.viewSettings
      ?.getActiveSettings?.();

  global.dispatchEvent(
    new CustomEvent(
      "view-property-settings-change",
      {
        detail: {
          itemId:
            activeItem?.id ||
            "",

          kind:
            activeItem?.kind ||
            "",

          property:
            instance.id,

          enabled:
            activeSettings
              ?.properties?.[
                instance.id
              ] !== false,
        },
      }
    )
  );

  if (repeatable) {
    showCreateFeedback(
      type
    );
  }

  global.viewSettings
    ?.sync?.();

  scheduleRender();
}

  /* =========================================================
     Переключение вкладок
  ========================================================= */

  function setActiveTab(
    tab
  ) {
    if (
      tab !== TAB_CREATE &&
      tab !== TAB_DISPLAY
    ) {
      return;
    }

    activeTab =
      tab;

    managerElement
      ?.querySelectorAll(
        "[data-property-tab]"
      )
      .forEach(
        (button) => {
          const active =
            button.dataset
              .propertyTab ===
            activeTab;

          button.classList.toggle(
            "is-active",
            active
          );

          button.setAttribute(
            "aria-selected",
            active
              ? "true"
              : "false"
          );
        }
      );

    managerElement
      ?.querySelectorAll(
        "[data-property-tab-panel]"
      )
      .forEach(
        (tabPanel) => {
          tabPanel.hidden =
            tabPanel.dataset
              .propertyTabPanel !==
            activeTab;
        }
      );
  }

  /* =========================================================
     Общий render
  ========================================================= */

function render() {
  renderFrame = 0;

  const body =
    panel()
      ?.querySelector(
        ".view-settings-body"
      );

  const scrollTop =
    body?.scrollTop || 0;

  /*
    После создания/удаления свойства
    DOM-строки могли измениться.
  */

  refreshExistingRows();

  renderCreateList();
  renderDisplayGroups();

  setActiveTab(
    activeTab
  );

  /*
    appendChild перемещает строки,
    поэтому браузер может сбросить
    положение прокрутки.
  */

  if (body) {
    body.scrollTop =
      scrollTop;
  }
}

  function scheduleRender() {
    if (renderFrame) {
      return;
    }

    renderFrame =
      requestAnimationFrame(
        render
      );
  }

  /* =========================================================
     События
  ========================================================= */

  function bindEvents() {
    global.addEventListener(
      "view-property-settings-change",
      scheduleRender
    );

    global.addEventListener(
      "project-properties-change",
      scheduleRender
    );

    global.addEventListener(
      "table-column-order-change",
      scheduleRender
    );

    /*
      При открытии панели сначала
      отрабатывает старый sync(),
      затем мы распределяем строки.
    */

    document
      .getElementById(
        "viewSettingsOpenBtn"
      )
      ?.addEventListener(
        "click",
        () => {
          requestAnimationFrame(
            scheduleRender
          );
        }
      );

    /*
      Часть старых тумблеров обновляет
      состояние через requestAnimationFrame.
      Поэтому после любого клика внутри
      строки выполняем отложенную группировку.
    */

    managerElement
      ?.addEventListener(
        "click",
        (event) => {
          if (
            !event.target.closest(
              "[data-property-manager-row]"
            )
          ) {
            return;
          }

          requestAnimationFrame(
            () => {
              requestAnimationFrame(
                scheduleRender
              );
            }
          );
        }
      );
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    const root =
      panel();

    if (
      !root ||
      root.dataset
        .propertyTabsBound ===
        "1"
    ) {
      return;
    }

    /*
      view_settings.js должен сначала
      создать динамические строки.
    */

    const generatedRows =
      root.querySelectorAll(
        "[data-view-property-row]"
      );

    if (
      !generatedRows.length
    ) {
      requestAnimationFrame(
        init
      );

      return;
    }

    root.dataset
      .propertyTabsBound =
        "1";

    if (!buildManager()) {
      return;
    }

    refreshExistingRows();
    bindEvents();

    /*
      По умолчанию открываем вкладку
      «Настроить отображение».
    */

    setActiveTab(
      TAB_DISPLAY
    );

    render();
  }

  /* =========================================================
     Public API
  ========================================================= */

  global.propertyPanelTabs = {
    init,
    render:
      scheduleRender,

    openCreate() {
      setActiveTab(
        TAB_CREATE
      );

      scheduleRender();
    },

    openDisplay() {
      setActiveTab(
        TAB_DISPLAY
      );

      scheduleRender();
    },

    getActiveTab() {
      return activeTab;
    },
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        requestAnimationFrame(
          init
        );
      },
      {
        once: true,
      }
    );
  } else {
    requestAnimationFrame(
      init
    );
  }
})();