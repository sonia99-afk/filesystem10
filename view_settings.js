// view_settings.js
// Правая панель настройки выбранной вкладки вида.

(function () {
  if (typeof window === "undefined") {
    return;
  }

 const SETTINGS_VERSION = 5;

const DEFAULT_LEVEL_HEADERS_MODE =
  "header-row";

  /* =========================================================
     Каталог дополнительных свойств
  ========================================================= */

  const PROPERTIES_BEFORE_NAME = [
    {
      key: "icon",
      name: "Иконка",
      icon: "◆",
    },

    {
      key: "cover",
      name: "Обложка",
      icon: "▣",
    },
  ];

  const PROPERTIES_AFTER_DESCRIPTION = [
    {
      key: "text",
      name: "Текст",
      icon: "¶",
    },

    {
      key: "startDate",
      name: "Дата начала",
      icon: "◷",
    },

    {
      key: "startTime",
      name: "Время начала",
      icon: "◴",
    },

    {
      key: "endDate",
      name: "Дата завершения",
      icon: "◷",
    },

    {
      key: "endTime",
      name: "Время завершения",
      icon: "◴",
    },

    {
  key: "dateRange",
  name:
    "Дата начала и дата завершения",
  icon: "◷",
},

{
  key: "timeRange",
  name:
    "Время начала и время завершения",
  icon: "◴",
},

{
  key: "startDateTime",
  name:
    "Дата и время начала",
  icon: "◷",
},

{
  key: "endDateTime",
  name:
    "Дата и время завершения",
  icon: "◷",
},

{
  key: "fullDateTimeRange",
  name:
    "Дата, время начала и завершения",
  icon: "◷",
},

    {
      key: "priority",
      name: "Приоритет",
      icon: "⚑",
    },

    {
      key: "focus",
      name: "Фокус",
      icon: "◎",
    },

    {
      key: "status",
      name: "Статус",
      icon: "●",
    },

    {
      key: "tag",
      name: "Выпадающий список",
      icon: "#",
    },

    {
      key: "extraImage",
      name: "Доп. изображения",
      icon: "▧",
    },

    {
      key: "file",
      name: "Файл",
      icon: "□",
    },

    {
      key: "timeCounter",
      name: "Счётчик времени",
      icon: "▶",
    },

    {
      key: "timerDuration",
      name: "Время таймера",
      icon: "⏱",
    },

    {
      key: "timerRemaining",
      name: "Оставшееся время",
      icon: "◉",
    },
  ];

  const ALL_PROPERTY_KEYS = [
    "marks",
    "icon",
    "cover",
    "name",
    "ordinals",
    "captions",

    ...PROPERTIES_AFTER_DESCRIPTION.map(
      (property) => property.key
    ),
  ];

  /*
    Во всех видах, кроме таблицы,
    можно переключать только:

    - Метку;
    - Нумерацию;
    - Описание.

    Название включено всегда.
  */

  const COMMON_EDITABLE_KEYS = new Set([
    "marks",
    "ordinals",
    "captions",
  ]);


  /* =========================================================
     DOM helpers
  ========================================================= */

  function panel() {
    return document.getElementById(
      "viewSettingsPanel"
    );
  }

  function openButton() {
    return document.getElementById(
      "viewSettingsOpenBtn"
    );
  }

  function closeButton() {
    return document.getElementById(
      "viewSettingsCloseBtn"
    );
  }

  function viewSelect() {
    return document.getElementById(
      "viewSettingsViewSelect"
    );
  }

  function propertiesCount() {
    return document.getElementById(
      "viewSettingsPropertiesCount"
    );
  }

  function tabsState() {
    return (
      window.viewTabs
        ?.normalizeState?.() ||

      window.viewTabsState ||

      null
    );
  }

  function activeItem() {
  return (
    window.viewTabs
      ?.getActiveItem?.() ||
    null
  );
}

  function isTableItem(item) {
  return (
    item?.kind === "table" ||
    item?.kind === "structure-table"
  );
}

  /* =========================================================
   Экземпляры проектных свойств
========================================================= */

function getPropertyType(
  ref
) {
  const instance =
    window.projectProperties
      ?.getInstance?.(
        ref
      );

  return (
    instance?.type ||
    String(ref || "")
  );
}

function getProjectPropertyRows() {
  const instances =
    window.projectProperties
      ?.getCreatedPropertyInstances?.() ||
    [];

  /*
    Эти четыре свойства уже имеют
    собственные строки в HTML.
  */

  const staticTypes =
    new Set([
      "marks",
      "ordinals",
      "name",
      "captions",
    ]);

  return instances
    .filter(
      (instance) =>
        !staticTypes.has(
          instance.type
        )
    )
    .map(
      (instance) => {
        const descriptor =
          window.projectProperties
            ?.getDescriptor?.(
              instance.id
            );

        return {
          /*
            КЛЮЧЕВОЕ:
            key теперь является ID
            конкретного экземпляра.
          */

          key:
            instance.id,

          type:
            instance.type,

          name:
            window.projectProperties
              ?.getTitle?.(
                instance.id
              ) ||
            descriptor?.title ||
            instance.type,

          icon:
            descriptor?.icon ||
            "·",
        };
      }
    );
}

function getDefaultPropertyEnabled(
  item,
  instance
) {
  if (
    !item ||
    !instance
  ) {
    return false;
  }

  /*
    Название всегда включено.
  */

  if (
    instance.type ===
    "name"
  ) {
    return true;
  }

  /*
    Таблица.

    Автоматически включаем только
    стандартный экземпляр свойства.

    Стандартный экземпляр имеет:

      id === type

    Например:

      text
      file
      status
      startDate

    А дополнительные пользовательские
    экземпляры:

      text__abc123
      file__def456
      date__xyz789

    в НОВОЙ таблице должны быть
    скрыты по умолчанию.
  */

  if (
  isTableItem(item)
) {
    return (
      instance.id ===
      instance.type
    );
  }

  /*
    В остальных видах стандартные
    общие свойства работают как раньше.
  */

  return COMMON_EDITABLE_KEYS.has(
    instance.type
  );
}
  /*
  Заголовки уровней сейчас реализованы только:

  - в Структуре;
  - в Таблице.
*/

const LEVEL_HEADERS_AVAILABLE_KINDS =
  new Set([
    "schema",
    "table",
    "structure-table",
  ]);

function isLevelHeadersAvailable(
  itemOrKind
) {
  const kind =
    typeof itemOrKind === "string"
      ? itemOrKind
      : itemOrKind?.kind;

  return (
    LEVEL_HEADERS_AVAILABLE_KINDS
      .has(kind)
  );
}

 function isPropertyAvailable(
  item,
  key
) {
  if (
    !item ||
    !key
  ) {
    return false;
  }

  /*
    key может быть:
      text
    или:
      text__abc123

    Для определения доступности
    нам нужен тип свойства.
  */

  const type =
    getPropertyType(
      key
    );

  if (
    type ===
    "name"
  ) {
    return true;
  }

  if (
    isTableItem(item)
  ) {
    return true;
  }

  return COMMON_EDITABLE_KEYS.has(
    type
  );
}

  /* =========================================================
     Настройки конкретной вкладки
  ========================================================= */

function createDefaultSettings(
  kind
) {
  const isTable =
  kind === "table" ||
  kind === "structure-table";

    const levelHeadersAvailable =
  isLevelHeadersAvailable(
    kind
  );

  const properties = {};

  ALL_PROPERTY_KEYS.forEach(
    (key) => {
      /*
        Название включено всегда
        и не может быть выключено.
      */

      if (key === "name") {
        properties[key] = true;
        return;
      }

      /*
        В таблице доступны все свойства,
        поэтому новая таблица создаётся
        со всеми включёнными свойствами.
      */

      if (isTable) {
        properties[key] = true;
        return;
      }

      /*
        В остальных отображениях включаем
        все доступные для них свойства:

        - Метка;
        - Нумерация;
        - Описание.

        Недоступные табличные свойства
        остаются выключенными.
      */

      properties[key] =
        COMMON_EDITABLE_KEYS.has(
          key
        );
    }
  );

  /*
  Помимо старых базовых ключей
  добавляем настройки для каждого
  реально созданного экземпляра.

  Например:

  text
  text__abc
  text__def
*/

  return {
    version:
      SETTINGS_VERSION,

    properties,

    /*
      Параметры отметки по умолчанию.

      Сама отметка включена, но отмеченные
      объекты не скрываются и не зачёркиваются.
    */

    propertyOptions: {
      marks: {
        hideMarked: false,
        strikeMarked: false,
      },
    },

    /*
      Заголовки уровней тоже относятся
      к доступным настройкам интерфейса,
      поэтому включены в новом виде.
    */

   interface: {
  /*
    Заголовки уровней.
  */

  levelHeaders:
    levelHeadersAvailable,

  levelHeadersMode:
    DEFAULT_LEVEL_HEADERS_MODE,

    /*
  Индивидуальная ширина
  горизонтальной линии каждого уровня.
  Отсутствие значения означает авторазмер.
*/

levelIndentWidths: {},

  /*
    Структура.
  */

  showTextPropertyHeaders:
    kind === "schema",

  textPropertyHeaderPlacement:
    "inline",

  showCalloutElement:
  kind === "schema" ||
  kind === "structure-table",

  calloutElementScope:
    "one",

  /*
    Таблица.

    На макете автоматическая высота
    по умолчанию выключена,
    а перенос текста запомнен включённым.
  */

  autoTextCellHeight:
    false,

  wrapTextByCellWidth:
    true,

    tableVerticalAlign:
  "middle",
},
  };
}

  function hasStoredSettings(
    item
  ) {
    return !!(
      item?.settings &&
      typeof item.settings ===
        "object" &&

      item.settings.properties &&
      typeof item.settings.properties ===
        "object" &&

      item.settings.interface &&
      typeof item.settings.interface ===
        "object"
    );
  }

 function isCurrentActiveItem(
  item
) {
  const active =
    window.viewTabs
      ?.getActiveItem?.();

  return !!(
    item?.id &&
    active?.id &&
    item.id === active.id
  );
}

  function ensureItemSettings(
    item
  ) {
    if (!item) {
      return null;
    }

    /*
      Старая вкладка, у которой ещё
      не было полноценного settings.
    */

if (!hasStoredSettings(item)) {
  /*
    У каждой вкладки свои настройки.

    Новая вкладка или вкладка без settings
    получает только стандартные настройки
    своего типа и ничего не наследует
    от текущего отображения.
  */

  item.settings =
    createDefaultSettings(
      item.kind
    );
}

    const defaults =
      createDefaultSettings(
        item.kind
      );

    const storedSettingsVersion =
  Number(
    item.settings.version
  ) || 0;

item.settings.version =
  SETTINGS_VERSION;

    if (
      !item.settings.properties ||
      typeof item.settings.properties !==
        "object"
    ) {
      item.settings.properties = {};
    }

    if (
      !item.settings.interface ||
      typeof item.settings.interface !==
        "object"
    ) {
      item.settings.interface = {};
    }

    /*
  До версии 4 объединённый вид
  считался неподдерживаемым,
  поэтому заголовки уровней
  сохранялись выключенными.
*/

if (
  item.kind === "structure-table" &&
  storedSettingsVersion < 4
) {
  item.settings
    .interface
    .levelHeaders = true;

  item.settings
    .interface
    .levelHeadersMode =
      item.settings
        .interface
        .levelHeadersMode ||
      DEFAULT_LEVEL_HEADERS_MODE;
}

    /*
  Настройки шестерёнки «Метка».
*/

if (
  !item.settings.propertyOptions ||
  typeof item.settings.propertyOptions !==
    "object"
) {
  item.settings.propertyOptions = {};
}

if (
  !item.settings
    .propertyOptions
    .marks ||

  typeof item.settings
    .propertyOptions
    .marks !== "object"
) {
  item.settings
    .propertyOptions
    .marks = {};
}

const markOptions =
  item.settings
    .propertyOptions
    .marks;

if (
  typeof markOptions
    .hideMarked !== "boolean"
) {
  markOptions.hideMarked =
    false;
}

if (
  typeof markOptions
    .strikeMarked !== "boolean"
) {
  markOptions.strikeMarked =
    false;
}

/*
  Режим заголовков уровней.
*/

const availableLevelModes =
  Object.values(
    window.levelHeaders
      ?.MODES || {}
  );

if (
  !availableLevelModes.includes(
    item.settings
      .interface
      .levelHeadersMode
  )
) {
  item.settings
    .interface
    .levelHeadersMode =
      DEFAULT_LEVEL_HEADERS_MODE;
}

/*
  Ширина линии отступа уровня.

  Ключ — номер уровня.
  Значение — длина горизонтальной
  линии в пикселях.
*/

if (
  !item.settings
    .interface
    .levelIndentWidths ||
  typeof item.settings
    .interface
    .levelIndentWidths !==
      "object" ||
  Array.isArray(
    item.settings
      .interface
      .levelIndentWidths
  )
) {
  item.settings
    .interface
    .levelIndentWidths = {};
} else {
  Object.entries(
    item.settings
      .interface
      .levelIndentWidths
  ).forEach(
    ([levelKey, widthValue]) => {
      const level =
        Number(levelKey);

      const width =
        Number(widthValue);

      if (
        !Number.isInteger(level) ||
        level <= 0 ||
        level > 20 ||
        !Number.isInteger(width) ||
        width < 1 ||
        width > 1000
      ) {
        delete item.settings
          .interface
          .levelIndentWidths[
            levelKey
          ];

        return;
      }

      item.settings
        .interface
        .levelIndentWidths[
          String(level)
        ] = width;
    }
  );
}

/*
  Новые настройки интерфейса.
  Старые сохранённые вкладки получают
  только отсутствующие значения.
*/

const interfaceDefaults =
  defaults.interface;

[
  "showTextPropertyHeaders",
  "showCalloutElement",
  "autoTextCellHeight",
  "wrapTextByCellWidth",
].forEach(
  (key) => {
    if (
      typeof item.settings
        .interface[key] !==
      "boolean"
    ) {
      item.settings
        .interface[key] =
          interfaceDefaults[key];
    }
  }
);

if (
  ![
    "above",
    "inline",
  ].includes(
    item.settings
      .interface
      .textPropertyHeaderPlacement
  )
) {
  item.settings
    .interface
    .textPropertyHeaderPlacement =
      "inline";
}

if (
  ![
    "all",
    "one",
  ].includes(
    item.settings
      .interface
      .calloutElementScope
  )
) {
  item.settings
    .interface
    .calloutElementScope =
      "one";
}

if (
  ![
    "top",
    "middle",
    "bottom",
  ].includes(
    item.settings
      .interface
      .tableVerticalAlign
  )
) {
  item.settings
    .interface
    .tableVerticalAlign =
      interfaceDefaults
        .tableVerticalAlign;
}
    /*
      Добавляем новые свойства,
      появившиеся после сохранения проекта.
    */

    ALL_PROPERTY_KEYS.forEach(
      (key) => {
        if (
          typeof item.settings
            .properties[key] !==
          "boolean"
        ) {
          item.settings
            .properties[key] =
              defaults
                .properties[key];
        }
      }
    );

    /*
  Добавляем настройки для каждого
  реально созданного экземпляра свойства.

  Например:

  text
  text__abc
  text__def
*/

const projectInstances =
  window.projectProperties
    ?.getCreatedPropertyInstances?.() ||
  [];

projectInstances.forEach(
  (instance) => {
    const instanceId =
      instance.id;

    /*
      Настройка этого экземпляра
      уже существует.
    */

    if (
      typeof item.settings
        .properties[
          instanceId
        ] ===
      "boolean"
    ) {
      return;
    }

    /*
      Новый экземпляр получает
      собственную настройку видимости.
    */

    item.settings
      .properties[
        instanceId
      ] =
        getDefaultPropertyEnabled(
          item,
          instance
        );
  }
);

    /*
      Название нельзя выключить.
    */

    item.settings
      .properties
      .name = true;

    if (
      typeof item.settings
        .interface
        .levelHeaders !==
      "boolean"
    ) {
      item.settings
        .interface
        .levelHeaders =
          defaults
            .interface
            .levelHeaders;
    }

    /*
  У старых сохранённых вкладок
  заголовки могли быть включены
  даже в неподдерживаемых видах.
*/

if (
  !isLevelHeadersAvailable(
    item
  )
) {
  item.settings
    .interface
    .levelHeaders = false;
}

    return item.settings;
  }

  function saveSettings() {
    window
      .projectAutosave
      ?.saveNow?.();
  }

  function dispatchSettingsChange(
    item,
    key,
    enabled
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "view-property-settings-change",
        {
          detail: {
            itemId:
              item?.id || "",

            kind:
              item?.kind || "",

            property:
              key,

            enabled:
              !!enabled,
          },
        }
      )
    );
  }

  /* =========================================================
   Изменение настройки свойства
========================================================= */

/*
  Единственная точка изменения
  видимости свойства конкретной вкладки.

  ВАЖНО:

  Источник истины здесь —
  item.settings.properties.

  Старые глобальные значения
  showOrdinals / showCaptions /
  markProperty и т.д.
  обновляются уже ПОСЛЕ этого.
*/

function setPropertySetting(
  key,
  enabled,
  options = {}
) {
  const item =
    options.item ||
    activeItem();

  const settings =
    ensureItemSettings(
      item
    );

  if (
    !item ||
    !settings ||
    !key
  ) {
    return false;
  }

  /*
    Название нельзя выключить.
  */

  if (key === "name") {
    enabled = true;
  }

  /*
    Нельзя включить свойство,
    которого нет в этом виде.
  */

  if (
    key !== "name" &&
    !isPropertyAvailable(
      item,
      key
    )
  ) {
    return false;
  }

  const next =
    !!enabled;

  const previous =
    !!settings
      .properties[key];

  /*
    Сначала меняем главный state.
  */

  settings
    .properties[key] =
      next;

  /*
    Если фактически ничего
    не изменилось — дальше
    работу можно не повторять.
  */

  if (
    previous ===
    next
  ) {
    return true;
  }

  saveSettings();

  dispatchSettingsChange(
    item,
    key,
    next
  );

  /*
    Runtime-состояние применяем
    только если менялась
    активная вкладка.

    Например:

    settings.captions
        ↓
    showCaptions
        ↓
    render
  */

  if (
    isCurrentActiveItem(
      item
    ) &&
    options.apply !== false
  ) {
    applyActiveSettingsToView({
      render:
        options.render !==
        false,
    });
  }

  /*
    Обновляем панель,
    чтобы UI показывал state,
    а не наоборот.
  */

  if (
    options.sync !== false
  ) {
    sync();
  }

  return true;
}

/* =========================================================
   Изменение дополнительных настроек Метки
========================================================= */

function setMarkOptionSetting(
  key,
  enabled,
  options = {}
) {
  const item =
    options.item ||
    activeItem();

  const settings =
    ensureItemSettings(
      item
    );

  if (
    !item ||
    !settings
  ) {
    return false;
  }

  /*
    У Метки сейчас только
    две дополнительные настройки.
  */

  if (
    key !== "hideMarked" &&
    key !== "strikeMarked"
  ) {
    return false;
  }

  const markOptions =
    settings
      .propertyOptions
      .marks;

  const next =
    !!enabled;

  const previous =
    !!markOptions[key];

  /*
    Сначала меняем главный state.
  */

  markOptions[key] =
    next;

  if (
    previous ===
    next
  ) {
    return true;
  }

  saveSettings();

  /*
    После изменения сохранённого
    state применяем его к runtime.
  */

  if (
    isCurrentActiveItem(
      item
    ) &&
    options.apply !== false
  ) {
    applyActiveSettingsToView({
      render:
        options.render !==
        false,
    });
  }

  if (
    options.sync !== false
  ) {
    sync();
  }

  return true;
}

/* =========================================================
   Изменение настроек Заголовков уровней
========================================================= */

function setLevelHeadersSetting(
  key,
  value,
  options = {}
) {
  const item =
    options.item ||
    activeItem();

  const settings =
    ensureItemSettings(
      item
    );

  if (
    !item ||
    !settings ||
    !isLevelHeadersAvailable(
      item
    )
  ) {
    return false;
  }

  /*
    Здесь разрешены только
    две настройки:
    
    - включены ли заголовки;
    - режим отображения.
  */

  if (
    key !== "levelHeaders" &&
    key !== "levelHeadersMode"
  ) {
    return false;
  }

  let next =
    value;

  if (
    key === "levelHeaders"
  ) {
    next =
      !!value;
  }

  if (
    key ===
    "levelHeadersMode"
  ) {
    const availableModes =
      Object.values(
        window.levelHeaders
          ?.MODES || {}
      );

    if (
      !availableModes.includes(
        value
      )
    ) {
      return false;
    }
  }

  const previous =
    settings
      .interface[key];

  /*
    Сначала меняем
    главный state вкладки.
  */

  settings
    .interface[key] =
      next;

  if (
    previous === next
  ) {
    return true;
  }

  saveSettings();

  dispatchInterfaceChange(
    item,
    key,
    next
  );

  /*
    После изменения settings
    применяем их к runtime.
  */

  if (
    isCurrentActiveItem(
      item
    ) &&
    options.apply !== false
  ) {
    applyActiveSettingsToView({
      render:
        options.render !==
        false,
    });
  }

  if (
    options.sync !== false
  ) {
    sync();
  }

  return true;
}

  /* =========================================================
     Создание дополнительных строк свойств
  ========================================================= */

  function createPropertyRow(
    property
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "view-settings-control-row";

    row.dataset
      .viewPropertyRow = "1";

      row.dataset
  .viewPropertyGenerated =
    "1";

row.dataset
  .viewPropertyType =
    property.type ||
    property.key;

    row.dataset
      .viewProperty =
        property.key;

    const main =
      document.createElement(
        "div"
      );

    main.className =
      "view-settings-control-main";

    const icon =
      document.createElement(
        "span"
      );

    icon.className =
      "view-settings-property-icon";

    icon.textContent =
      property.icon;

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    const name =
      document.createElement(
        "span"
      );

    name.className =
      "view-settings-control-name";

    name.textContent =
      property.name;

    main.append(
      icon,
      name
    );

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "view-settings-control-actions";

    const toggle =
      document.createElement(
        "button"
      );

    toggle.type = "button";

    toggle.className =
      "ui-toggle";

    toggle.setAttribute(
      "role",
      "switch"
    );

    toggle.setAttribute(
      "aria-checked",
      "false"
    );

    toggle.setAttribute(
      "aria-disabled",
      "true"
    );

    toggle.setAttribute(
      "aria-label",
      property.name
    );

    toggle.disabled = true;

    toggle.dataset
      .viewProperty =
        property.key;

    toggle.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (toggle.disabled) {
          return;
        }

        /*
          Запоминаем вкладку непосредственно
          в момент нажатия.

          Даже если пользователь сразу
          переключит вид, настройка не попадёт
          в соседнюю вкладку.
        */

        const itemAtClick =
          activeItem();

        const settings =
          ensureItemSettings(
            itemAtClick
          );

        if (
          !itemAtClick ||
          !settings ||
          !isPropertyAvailable(
            itemAtClick,
            property.key
          )
        ) {
          return;
        }

        const next =
          toggle.getAttribute(
            "aria-checked"
          ) !== "true";

        setPropertySetting(
  property.key,
  next,
  {
    item:
      itemAtClick,

    /*
      Для динамических табличных
      свойств изменение отображения
      сейчас обрабатывается через
      view-property-settings-change.

      Поэтому здесь отдельный
      applyActiveSettingsToView
      не требуется.
    */
    apply:
      false,

    /*
      Полный sync панели здесь
      тоже не нужен:
      ниже обновим только
      конкретный тумблер и счётчик.
    */
    sync:
      false,
  }
);

toggle.setAttribute(
  "aria-checked",
  next
    ? "true"
    : "false"
);

syncPropertiesCount();
      }
    );

    actions.appendChild(
      toggle
    );

    row.append(
      main,
      actions
    );

    return row;
  }

  function renderPropertyGroup(
    containerId,
    properties
  ) {
    const container =
      document.getElementById(
        containerId
      );

    if (!container) {
      return;
    }

    container.innerHTML = "";

    properties.forEach(
      (property) => {
        container.appendChild(
          createPropertyRow(
            property
          )
        );
      }
    );
  }

function renderPropertyCatalog() {
  /*
    Старые динамические строки могли
    уже быть перенесены модулем
    property_panel_tabs.js в другие группы.

    Поэтому удаляем их независимо
    от текущего родителя.
  */

  panel()
    ?.querySelectorAll(
      '[data-view-property-generated="1"]'
    )
    .forEach(
      (row) => {
        row.remove();
      }
    );

  const properties =
    getProjectPropertyRows();

  /*
    Иконка и Обложка остаются
    перед Названием, как и раньше.
  */

  const beforeName =
    properties.filter(
      (property) =>
        property.type ===
          "icon" ||
        property.type ===
          "cover"
    );

  const afterDescription =
    properties.filter(
      (property) =>
        property.type !==
          "icon" &&
        property.type !==
          "cover"
    );

  renderPropertyGroup(
    "viewSettingsBeforeName",
    beforeName
  );

  renderPropertyGroup(
    "viewSettingsAfterDescription",
    afterDescription
  );
}

/* =========================================================
   Интерфейс конкретного вида
========================================================= */

function interfaceSection() {
  return document
    .getElementById(
      "levelHeadersTools"
    )
    ?.closest(
      ".view-settings-section"
    ) || null;
}

function ensureDynamicInterfaceContainer() {
  let container =
    document.getElementById(
      "viewSettingsDynamicInterface"
    );

  if (container) {
    return container;
  }

  const section =
    interfaceSection();

  if (!section) {
    return null;
  }

  container =
    document.createElement(
      "div"
    );

  container.id =
    "viewSettingsDynamicInterface";

  container.className =
    "view-settings-dynamic-interface";

  const levelHeaders =
    document.getElementById(
      "levelHeadersTools"
    );

  section.insertBefore(
    container,
    levelHeaders || null
  );

  return container;
}

function dispatchInterfaceChange(
  item,
  key,
  value
) {
  window.dispatchEvent(
    new CustomEvent(
      "view-interface-settings-change",
      {
        detail: {
          itemId:
            item?.id || "",

          kind:
            item?.kind || "",

          setting:
            key,

          value,
        },
      }
    )
  );
}

function setInterfaceSetting(
  key,
  value
) {
  const item =
    activeItem();

  const settings =
    ensureItemSettings(
      item
    );

  if (
    !item ||
    !settings
  ) {
    return;
  }

  settings
    .interface[key] =
      value;

  saveSettings();

  dispatchInterfaceChange(
    item,
    key,
    value
  );

  /*
    Настройки заголовков текстовых
    свойств сразу применяем
    к Структуре.
  */

  if (
    item.kind ===
    "schema"
  ) {
    window.render?.();
  }

  renderInterfaceSettings();
}

function closeInterfaceMenu(menu) {
  if (!menu) return;

  menu.hidden = true;

  window.uiAnchoredPopup
    ?.close?.(menu);
}

function createInterfaceMenu(
  currentValue,
  options,
  onChange
) {
  const menu =
    document.createElement(
      "div"
    );

  /*
    Подключаем общий компонент
    выпадающего меню.
  */

  menu.className =
    "ui-dropdown-menu " +
    "view-settings-interface-menu";

  menu.hidden =
    true;

  menu.setAttribute(
    "role",
    "menu"
  );

  options.forEach(
    (option) => {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      /*
        Пункт также получает
        класс общего компонента.
      */

      button.className =
        "ui-dropdown-item " +
        "view-settings-interface-menu-option";

      button.setAttribute(
        "role",
        "menuitemradio"
      );

      const selected =
        option.value ===
        currentValue;

      button.setAttribute(
        "aria-checked",
        selected
          ? "true"
          : "false"
      );

      /*
        Используем общую радиокнопку
        из ui_dropdown.css.
      */

      const radio =
        document.createElement(
          "span"
        );

      radio.className =
        "ui-dropdown-radio";

      radio.setAttribute(
        "aria-hidden",
        "true"
      );

      const label =
  document.createElement(
    "span"
  );

label.className =
  "ui-dropdown-label";

label.textContent =
  option.label;

/*
  Иконка используется только у тех
  пунктов, где передан option.icon.
*/
let icon = null;

if (option.icon) {
  icon =
    document.createElement(
      "img"
    );

  icon.className =
    "view-settings-interface-menu-icon";

  icon.src =
    option.icon;

  icon.alt = "";

  icon.draggable =
    false;

  icon.setAttribute(
    "aria-hidden",
    "true"
  );
}

if (icon) {
  /*
    Иконка слева, название посередине,
    радиоиндикатор справа.
  */
  button.append(
    icon,
    label,
    radio
  );
} else {
  /*
    Остальные меню сохраняют
    существующий порядок элементов.
  */
  button.append(
    radio,
    label
  );
}

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          closeInterfaceMenu(
            menu
          );

          onChange(
            option.value
          );
        }
      );

      menu.appendChild(
        button
      );
    }
  );

  return menu;
}

function createInterfaceRow({
  label,
  checked = false,
  disabled = false,
  onToggle = null,
  menu = null,
  tooltip = null,
  showToggle = true,
}) {
  const row =
    document.createElement(
      "div"
    );

  row.className =
    "view-settings-control-row " +
    "view-settings-interface-row";


    /*
  У выравнивания нет тумблера,
  но его место нужно сохранить,
  чтобы шестерёнки стояли в одной колонке.
*/
if (
  !showToggle &&
  menu
) {
  row.classList.add(
    "view-settings-interface-row-no-toggle"
  );
}

  if (disabled) {
    row.classList.add(
      "is-unavailable"
    );
  }

  const main =
    document.createElement(
      "div"
    );

  main.className =
    "view-settings-control-main";

  const name =
    document.createElement(
      "span"
    );

  name.className =
    "view-settings-control-name";

  name.textContent =
    label;

  main.appendChild(
    name
  );

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "view-settings-control-actions";

  /*
    Шестерёнка дополнительных настроек.
  */

  if (menu) {
    const gear =
      document.createElement(
        "button"
      );

    gear.type =
      "button";

    gear.className =
      "btnn " +
      "view-settings-gear " +
      "icon-settings";

    gear.setAttribute(
      "aria-label",
      "Дополнительные настройки"
    );

    gear.disabled =
  disabled ||
  (
    showToggle &&
    !checked
  );

    const popup =
      createInterfaceMenu(
        menu.value,
        menu.options,
        menu.onChange
      );

    gear.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (gear.disabled) {
          return;
        }

      document
  .querySelectorAll(
    ".view-settings-interface-menu"
  )
  .forEach(
    (other) => {
      if (other !== popup) {
        closeInterfaceMenu(
          other
        );
      }
    }
  );

const willOpen =
  popup.hidden;

if (!willOpen) {
  closeInterfaceMenu(
    popup
  );

  return;
}

popup.hidden = false;

window.uiAnchoredPopup
  ?.open?.(
    popup,
    gear,
    {
      overlap: 12,
    }
  );

    
      }
    );

    actions.append(
      gear,
      popup
    );
  }

  /*
  Основной тумблер.
  У настройки выравнивания его нет.
*/

if (showToggle) {
  const toggle =
    document.createElement(
      "button"
    );

  toggle.type =
    "button";

  toggle.className =
    "ui-toggle";

  toggle.setAttribute(
    "role",
    "switch"
  );

  toggle.setAttribute(
    "aria-checked",
    checked
      ? "true"
      : "false"
  );

  toggle.setAttribute(
    "aria-disabled",
    disabled
      ? "true"
      : "false"
  );

  toggle.disabled =
    disabled;

  toggle.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        disabled ||
        typeof onToggle !==
          "function"
      ) {
        return;
      }

      onToggle(
        !checked
      );
    }
  );

  actions.appendChild(
    toggle
  );
}

  row.append(
    main,
    actions
  );

  /*
    События наведения отслеживаем на всей
    строке, потому что выключенный тумблер
    может не получать события мыши.

    При этом хвостик указывает именно
    на тумблер.
  */

  if (
    tooltip &&
    window.uiTooltip
      ?.attach
  ) {
    const tooltipOptions =
      typeof tooltip ===
      "string"
        ? {
            text:
              tooltip,
          }
        : tooltip;

   window.uiTooltip.attach(
  row,
  {
    preferredPlacements: [
      "top",
      "bottom",
    ],

    ...tooltipOptions,

    anchor:
      tooltipOptions
        .anchor ||
      row,
  }
);
  }

  return row;
}

function renderInterfaceSettings() {
  const container =
    ensureDynamicInterfaceContainer();

  if (!container) {
    return;
  }

  document
  .querySelectorAll(
    ".view-settings-interface-menu"
  )
  .forEach(
    closeInterfaceMenu
  );

  container.replaceChildren();

  const item =
    activeItem();

  const settings =
    ensureItemSettings(
      item
    );

  if (
    !item ||
    !settings
  ) {
    return;
  }

  const ui =
    settings.interface;

  /*
    СТРУКТУРА
  */

  if (
    item.kind ===
    "schema"
  ) {
    container.appendChild(
      createInterfaceRow({
        label:
          "Отображать заголовок текстовых свойств",

        checked:
          !!ui
            .showTextPropertyHeaders,

        onToggle(value) {
          setInterfaceSetting(
            "showTextPropertyHeaders",
            value
          );
        },

        menu: {
          value:
            ui
              .textPropertyHeaderPlacement,

          options: [
            {
              value: "above",
              label: "Над текстом",
            },
            {
              value: "inline",
              label: "В одну строку",
            },
          ],

          onChange(value) {
            setInterfaceSetting(
              "textPropertyHeaderPlacement",
              value
            );
          },
        },
      })
    );

    }

if (
  item.kind === "schema" ||
  item.kind === "structure-table"
) {

    container.appendChild(
      createInterfaceRow({
        label:
          "Выносной элемент",

        checked:
          !!ui
            .showCalloutElement,

        onToggle(value) {
          setInterfaceSetting(
            "showCalloutElement",
            value
          );
        },

        menu: {
          value:
            ui
              .calloutElementScope,

          options: [
            {
              value: "one",
              label: "Один",
            },
            {
              value: "all",
              label: "Все",
            },
          ],

          onChange(value) {
            setInterfaceSetting(
              "calloutElementScope",
              value
            );
          },
        },
      })
    );
  }

  /*
    ТАБЛИЦА
  */

 if (
  isTableItem(item)
) {
    const autoHeight =
      !!ui
        .autoTextCellHeight;

        container.appendChild(
  createInterfaceRow({
    label:
      "Выравнивание текста",

    /*
      У этой настройки нет состояния
      «включено/выключено».
    */

    showToggle:
      false,

    menu: {
      value:
        ui
          .tableVerticalAlign,

      options: [
  {
    value: "top",

    label:
      "По верхнему краю",

    icon:
      "icons/align-top.svg",
  },
  {
    value: "middle",

    label:
      "По середине",

    icon:
      "icons/align-middle.svg",
  },
  {
    value: "bottom",

    label:
      "По нижнему краю",

    icon:
      "icons/align-bottom.svg",
  },
],

      onChange(value) {
        setInterfaceSetting(
          "tableVerticalAlign",
          value
        );
      },
    },
  })
);

    container.appendChild(
      createInterfaceRow({
        label:
          "Подстраивать высоту ячеек текстовых свойств",

        checked:
          autoHeight,

        onToggle(value) {
          setInterfaceSetting(
            "autoTextCellHeight",
            value
          );
        },
      })
    );

    container.appendChild(
      createInterfaceRow({
        label:
          "Переносить текст по ширине ячейки",

        checked:
          !!ui
            .wrapTextByCellWidth,

        /*
          Как на макете:
          без автоматической высоты
          эта настройка недоступна,
          но её значение сохраняется.
        */

        disabled:
          !autoHeight,

          tooltip:
  !autoHeight
    ? "Чтобы активировать настройку, сначала включите «Подстраивать высоту ячеек текстовых свойств»."
    : null,

        onToggle(value) {
          setInterfaceSetting(
            "wrapTextByCellWidth",
            value
          );
        },
      })
    );
  }
}

  /* =========================================================
     Состояние и доступность тумблеров
  ========================================================= */

  function setToggleState(
    id,
    checked
  ) {
    const toggle =
      document.getElementById(
        id
      );

    if (!toggle) {
      return;
    }

    toggle.setAttribute(
      "aria-checked",
      checked
        ? "true"
        : "false"
    );
  }

  function setToggleAvailability(
    toggle,
    available,
    checked,
    title
  ) {
    if (!toggle) {
      return;
    }

    toggle.disabled =
      !available;

    toggle.setAttribute(
      "aria-disabled",
      available
        ? "false"
        : "true"
    );

    toggle.setAttribute(
      "aria-checked",
      checked
        ? "true"
        : "false"
    );

    toggle.title =
      title || "";
  }

  function syncPropertyAvailability() {
    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (
      !item ||
      !settings
    ) {
      return;
    }

    document
      .querySelectorAll(
        "#viewSettingsPanel [data-view-property-row]"
      )
      .forEach(
        (row) => {
          const key =
            row.dataset
              .viewProperty;

          const toggle =
            row.querySelector(
              '.ui-toggle[role="switch"]'
            );

          if (
            !key ||
            !toggle
          ) {
            return;
          }

          /*
            Название всегда включено,
            но его тумблер заблокирован.
          */

          if (key === "name") {
            row.classList.remove(
              "is-unavailable"
            );

            setToggleAvailability(
              toggle,
              false,
              true,
              "Название отображается всегда"
            );

            return;
          }

          const available =
            isPropertyAvailable(
              item,
              key
            );

          const checked =
            available &&
            !!settings
              .properties[key];

          row.classList.toggle(
            "is-unavailable",
            !available
          );

          setToggleAvailability(
            toggle,
            available,
            checked,

            available
              ? ""
              : "Свойство доступно только в таблице"
          );
        }
      );

 /*
  Заголовки уровней доступны только
  в Структуре и Таблице.
*/

const levelHeadersAvailable =
  isLevelHeadersAvailable(
    item
  );

const levelHeadersRow =
  document.getElementById(
    "levelHeadersTools"
  );

const levelHeadersToggle =
  document.getElementById(
    "toggleLevelHeaders"
  );

const levelHeadersGear =
  document.getElementById(
    "levelHeadersSettingsBtn"
  );

/*
  Недоступная строка становится серой.
*/

levelHeadersRow
  ?.classList
  .toggle(
    "is-unavailable",
    !levelHeadersAvailable
  );

/*
  Шестерёнка тоже должна быть
  недоступна вместе с тумблером.
*/

if (levelHeadersGear) {
  levelHeadersGear.disabled =
    !levelHeadersAvailable;

  levelHeadersGear.setAttribute(
    "aria-disabled",

    levelHeadersAvailable
      ? "false"
      : "true"
  );

  levelHeadersGear.title =
    levelHeadersAvailable
      ? "Настройки заголовков уровней"
      : "Заголовки уровней недоступны в этом виде";
}

setToggleAvailability(
  levelHeadersToggle,
  levelHeadersAvailable,

  levelHeadersAvailable &&
    !!settings
      .interface
      .levelHeaders,

  levelHeadersAvailable
    ? ""
    : "Заголовки уровней недоступны в этом виде"
);
  }

  function syncToggleStates() {
    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (!settings) {
      return;
    }

    setToggleState(
      "toggleOrdinals",

      !!settings
        .properties
        .ordinals
    );

    setToggleState(
      "toggleCaptions",

      !!settings
        .properties
        .captions
    );

    setToggleState(
      "toggleMarks",

      !!settings
        .properties
        .marks
    );

    setToggleState(
  "toggleLevelHeaders",

  isLevelHeadersAvailable(
    item
  ) &&
    !!settings
      .interface
      .levelHeaders
);
  }

  function syncPropertiesCount() {
    const output =
      propertiesCount();

    if (!output) {
      return;
    }

    const rows =
      document.querySelectorAll(
        "#viewSettingsPanel [data-view-property-row]"
      );

    let count = 0;

    rows.forEach(
      (row) => {
        const toggle =
          row.querySelector(
            '.ui-toggle[role="switch"]'
          );

        if (
          toggle?.getAttribute(
            "aria-checked"
          ) === "true"
        ) {
          count += 1;
        }
      }
    );

    output.textContent =
      String(count);
  }

  function syncViewSelect() {
    const select =
      viewSelect();

    const state =
      tabsState();

    if (
      !select ||
      !state ||
      !Array.isArray(state.items)
    ) {
      return;
    }

    select.innerHTML = "";

    state.items.forEach(
      (item) => {
        ensureItemSettings(item);

        const option =
          document.createElement(
            "option"
          );

        option.value =
          item.id;

        option.textContent =
          item.name;

        select.appendChild(
          option
        );
      }
    );

    const active =
      activeItem();

    if (active) {
      select.value =
        active.id;
    }
  }

function sync() {
  syncViewSelect();

  renderInterfaceSettings();

  syncPropertyAvailability();
  syncToggleStates();
  syncPropertiesCount();
}

  /* =========================================================
     Применение настроек активной вкладки
  ========================================================= */

  let applyingSettings = false;

  function applyActiveSettingsToView(
  options = {}
) {
  const shouldRender =
    options.render !== false;
    if (applyingSettings) {
      return;
    }

    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (
      !item ||
      !settings
    ) {
      return;
    }

    applyingSettings = true;

    try {
      let needsRender = false;

      let levelHeadersWillRender =
        false;

      /* -------------------------
         Нумерация
      ------------------------- */

      const nextOrdinals =
        !!settings
          .properties
          .ordinals;

      if (
        !!window.showOrdinals !==
        nextOrdinals
      ) {
        window.showOrdinals =
          nextOrdinals;

        window
          .updateOrdinalButton
          ?.();

        window
          .syncOrdinalsModeClass
          ?.();

        needsRender = true;
      }

      /* -------------------------
         Описание
      ------------------------- */

      const nextCaptions =
        !!settings
          .properties
          .captions;

      if (
        !!window.showCaptions !==
        nextCaptions
      ) {
        window.showCaptions =
          nextCaptions;

        window
          .updateCaptionButton
          ?.();

        needsRender = true;
      }

      /* -------------------------
         Метка
      ------------------------- */
/* -------------------------
   Метка
------------------------- */

const nextMarks =
  !!settings
    .properties
    .marks;

const markOptions =
  settings
    .propertyOptions
    ?.marks || {};

const nextHideMarked =
  nextMarks &&
  !!markOptions.hideMarked;

const nextStrikeMarked =
  nextMarks &&
  !!markOptions.strikeMarked;

const currentMarkState =
  window.markProperty
    ?.getState?.() || {};

const markStateChanged =
  !!currentMarkState
    .showMarks !== nextMarks ||

  !!currentMarkState
    .hideMarked !== nextHideMarked ||

  !!currentMarkState
    .strikeMarked !==
      nextStrikeMarked;

if (markStateChanged) {
  if (
    window.markProperty
      ?.setState
  ) {
    window.markProperty
      .setState(
        {
          showMarks:
            nextMarks,

          hideMarked:
            nextHideMarked,

          strikeMarked:
            nextStrikeMarked,
        },
        {
          /*
            При открытии вкладки
            view_tabs сам сделает
            общий render().

            Поэтому тогда здесь
            только готовим state,
            не трогая старый DOM.
          */
          decorate:
            shouldRender &&
            !needsRender,
        }
      );
  } else {
    /*
      Временная совместимость
      со старой версией
      mark_property.js.
    */

    window.markProperty
      ?.setShowMarks?.(
        nextMarks
      );

    window.markProperty
      ?.setHideMarked?.(
        nextHideMarked
      );

    window.markProperty
      ?.setStrikeMarked?.(
        nextStrikeMarked
      );
  }
}

      /* -------------------------
         Заголовки уровней
      ------------------------- */

/* -------------------------
   Заголовки уровней
------------------------- */

const levelHeadersAvailable =
  isLevelHeadersAvailable(
    item
  );

const currentLevelHeadersState =
  window.levelHeaders
    ?.getState?.() || {};

const currentLevelHeaders =
  !!currentLevelHeadersState
    .enabled;

const currentLevelHeadersMode =
  currentLevelHeadersState
    .mode ||
  DEFAULT_LEVEL_HEADERS_MODE;

/*
  В неподдерживаемом виде заголовки
  обязательно выключаются.
*/

const nextLevelHeaders =
  levelHeadersAvailable &&
  !!settings
    .interface
    .levelHeaders;

/*
  Пока заголовки недоступны,
  глобальный режим не меняем.

  Это предотвращает лишний рендер
  при переходе, например,
  из Структуры в Иерархию.
*/

const nextLevelHeadersMode =
  levelHeadersAvailable
    ? (
        settings
          .interface
          .levelHeadersMode ||
        DEFAULT_LEVEL_HEADERS_MODE
      )
    : (
        currentLevelHeadersMode ||
        DEFAULT_LEVEL_HEADERS_MODE
      );

/*
  Новый общий метод меняет режим
  и включённость одним рендером.
*/

if (
  window.levelHeaders
    ?.setState
) {
  if (
    currentLevelHeaders !==
      nextLevelHeaders ||

    currentLevelHeadersMode !==
      nextLevelHeadersMode
  ) {
    levelHeadersWillRender =
  shouldRender;

    window.levelHeaders
  .setState(
    {
      enabled:
        nextLevelHeaders,

      mode:
        nextLevelHeadersMode,
    },
    {
      render:
        shouldRender,
    }
  );
  }
} else {
  /*
    Резервная совместимость.
  */

  if (
    currentLevelHeadersMode !==
    nextLevelHeadersMode
  ) {
    levelHeadersWillRender =
  shouldRender;

    window.levelHeaders
      ?.setMode?.(
        nextLevelHeadersMode
      );
  }

  if (
    currentLevelHeaders !==
    nextLevelHeaders
  ) {
    levelHeadersWillRender =
  shouldRender;

    window.levelHeaders
      ?.setEnabled?.(
        nextLevelHeaders
      );
  }
}
      /*
        Если нумерация или описание изменились,
        но заголовки уровней сами не вызвали render,
        перерисовываем отображение здесь.
      */

      if (
  shouldRender &&
  needsRender &&
  !levelHeadersWillRender
) {
  window.render?.();
}
    } finally {
      applyingSettings = false;
    }
  }
  /* =========================================================
     Открытие и закрытие панели
  ========================================================= */

    function open() {
    const element =
      panel();

    const trigger =
      openButton();

    if (!element) {
      return;
    }

    sync();

    /*
      При каждом открытии показываем
      «Настроить отображение».
    */

    window.propertyPanelTabs
      ?.openDisplay?.();

    element.classList.add(
      "is-open"
    );

    element.setAttribute(
      "aria-hidden",
      "false"
    );

    trigger?.setAttribute(
      "aria-expanded",
      "true"
    );

    /*
      Восстанавливаем положение сразу
      и ещё раз после обновления DOM.
    */

        const body =
      element.querySelector(
        ".view-settings-body"
      );

    if (body) {
      body.scrollTop = 0;

      requestAnimationFrame(
        () => {
          body.scrollTop = 0;
        }
      );
    }
  }

  function close() {
    const element =
      panel();

    const trigger =
      openButton();

    if (!element) {
      return;
    }

    element.classList.remove(
      "is-open"
    );

    element.setAttribute(
      "aria-hidden",
      "true"
    );

    trigger?.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function toggle() {
    const element =
      panel();

    if (!element) {
      return;
    }

    if (
      element.classList.contains(
        "is-open"
      )
    ) {
      close();
    } else {
      open();
    }
  }

  async function selectView(
    itemId
  ) {
    if (!itemId) {
      return;
    }

    await window
      .viewTabs
      ?.open?.(
        itemId,
        {
          restoreFocus: false,
        }
      );

    applyActiveSettingsToView();
    sync();
  }

  /* =========================================================
     Сохранение старых рабочих тумблеров
  ========================================================= */

  function bindPropertyToggle(
  id
) {
  const toggle =
    document.getElementById(
      id
    );

  if (
    !toggle ||
    toggle.dataset
      .viewSettingsBound === "1"
  ) {
    return;
  }

  toggle.dataset
    .viewSettingsBound = "1";

  /*
    Обычные свойства вкладки.
  */

  const directPropertyKey =
    {
      toggleOrdinals:
        "ordinals",

      toggleCaptions:
        "captions",

      toggleMarks:
        "marks",
    }[id];

  if (directPropertyKey) {
    toggle.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemAtClick =
          activeItem();

        const settings =
          ensureItemSettings(
            itemAtClick
          );

        if (
          !itemAtClick ||
          !settings ||
          !isPropertyAvailable(
            itemAtClick,
            directPropertyKey
          )
        ) {
          return;
        }

        const next =
          !settings
            .properties[
              directPropertyKey
            ];

        setPropertySetting(
          directPropertyKey,
          next,
          {
            item:
              itemAtClick,
          }
        );
      }
    );

    return;
  }

  /*
    Заголовки уровней относятся
    не к properties,
    а к interface.
  */

  if (
    id ===
    "toggleLevelHeaders"
  ) {
    toggle.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemAtClick =
          activeItem();

        const settings =
          ensureItemSettings(
            itemAtClick
          );

        if (
          !itemAtClick ||
          !settings ||
          !isLevelHeadersAvailable(
            itemAtClick
          )
        ) {
          return;
        }

        const next =
          !settings
            .interface
            .levelHeaders;

        setLevelHeadersSetting(
          "levelHeaders",
          next,
          {
            item:
              itemAtClick,
          }
        );
      }
    );
  }
}

  /* =========================================================
     Инициализация
  ========================================================= */

function init() {
  renderPropertyCatalog();

  window.addEventListener(
  "project-properties-change",
  () => {
    requestAnimationFrame(
      () => {
        renderPropertyCatalog();

        sync();

        window.propertyPanelTabs
          ?.render?.();
      }
    );
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (
      event.target.closest(
        ".view-settings-interface-row"
      )
    ) {
      return;
    }

    document
      .querySelectorAll(
        ".view-settings-interface-menu"
      )
      .forEach(
  closeInterfaceMenu
);
  }
);

    const trigger =
      openButton();

    const closer =
      closeButton();

    const select =
      viewSelect();

    trigger?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        toggle();
      }
    );

    closer?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        close();
      }
    );

    document.addEventListener(
  "pointerdown",
  (event) => {
    const element = panel();
    const trigger = openButton();

    if (
      !element?.classList.contains(
        "is-open"
      )
    ) {
      return;
    }

        if (
      element.contains(event.target) ||
      trigger?.contains(event.target) ||
      event.target?.closest?.(
        "#propertyContextMenu"
      )
    ) {
      return;
    }

    close();
  },
  true
);

    select?.addEventListener(
      "change",
      () => {
        selectView(
          select.value
        );
      }
    );

    [
      "toggleOrdinals",
      "toggleCaptions",
      "toggleMarks",
      "toggleLevelHeaders",
    ].forEach(
      bindPropertyToggle
    );

    /*
      После переключения вкладки
      применяем настройки именно
      новой активной вкладки.
    */

    window.addEventListener(
      "view-tabs-change",
      () => {
        requestAnimationFrame(
          () => {
            applyActiveSettingsToView();
            sync();
          }
        );
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Escape"
        ) {
          return;
        }

        const element =
          panel();

        if (
          !element?.classList
            .contains("is-open")
        ) {
          return;
        }

        close();
      }
    );

    /*
      Создаём индивидуальные настройки
      для всех существующих вкладок.
    */

    syncViewSelect();

    /*
      Применяем настройки текущей вкладки.
    */

    applyActiveSettingsToView();

    sync();

    /*
      Сохраняем созданные settings
      в состоянии проекта.
    */

    saveSettings();
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.viewSettings = {
    open,
    close,
    toggle,
    sync,

    applyActiveSettingsToView,

    getActiveItem:
      activeItem,

    createDefaultSettings,
    ensureItemSettings,
    setPropertySetting,
    setMarkOptionSetting,
    setLevelHeadersSetting,

isPropertyAvailableForItem(
  item,
  key
) {
  return isPropertyAvailable(
    item,
    key
  );
},

    getActiveSettings() {
      return ensureItemSettings(
        activeItem()
      );
    },

    isPropertyAvailable(
      key
    ) {
      return isPropertyAvailable(
        activeItem(),
        key
      );
    },

    isPropertyEnabled(
      key
    ) {
      const item =
        activeItem();

      const settings =
        ensureItemSettings(
          item
        );

      if (
        !item ||
        !settings
      ) {
        return true;
      }

      if (key === "name") {
        return true;
      }

      if (
        !isPropertyAvailable(
          item,
          key
        )
      ) {
        return false;
      }

      return (
        settings
          .properties[key] !==
        false
      );
    },
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();