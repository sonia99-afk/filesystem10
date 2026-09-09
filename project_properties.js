// project_properties.js
//
// Проектный реестр свойств v2.
//
// Главное отличие от v1:
//
// раньше:
//   text -> одно свойство
//
// теперь:
//   {
//     id: "text",
//     type: "text",
//     title: "Текст"
//   }
//
//   {
//     id: "text__abc123",
//     type: "text",
//     title: "Текст"
//   }
//
// То есть:
// - одиночные свойства имеют один экземпляр;
// - повторяемые могут иметь сколько угодно экземпляров;
// - старые проекты автоматически мигрируют;
// - первый старый экземпляр сохраняет старый id,
//   поэтому существующие данные не ломаются.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const global = window;

  const STATE_VERSION = 3;

  /* =========================================================
     Каталог ТИПОВ свойств
  ========================================================= */

  const CATALOG = [
    /* -------------------------
       Одиночные
    ------------------------- */

    {
      key: "marks",
      title: "Метка",
      icon: "◎",

      multiplicity: "single",

      configurable: true,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "ordinals",
      title: "Нумерация",
      icon: "№",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "icon",
      title: "Иконка",
      icon: "◆",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "cover",
      title: "Обложка",
      icon: "▣",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

{
  key: "id",
  title: "ID",
  icon: "#",

  multiplicity: "single",

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

{
  key: "level",
  title: "Уровень",
  icon: "↳",

  multiplicity: "single",

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

    {
      key: "name",
      title: "Название",
      icon: "Aa",

      multiplicity: "single",

      required: true,
      createable: false,

      configurable: false,
      removable: false,
      renameable: true,
      hideable: false,

      kind: "property",
    },

    {
      key: "captions",
      title: "Описание",
      icon: "≡",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "startDate",
      title: "Дата начала",
      icon: "◷",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "startTime",
      title: "Время начала",
      icon: "◴",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "endDate",
      title: "Дата завершения",
      icon: "◷",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "endTime",
      title: "Время завершения",
      icon: "◴",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
  key: "dateRange",
  title: "Дата начала и дата завершения",
  icon: "◷",

  multiplicity: "single",

  composite: true,

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

{
  key: "timeRange",
  title: "Время начала и время завершения",
  icon: "◴",

  multiplicity: "single",

  composite: true,

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

{
  key: "startDateTime",
  title: "Дата и время начала",
  icon: "◷",

  multiplicity: "single",

  composite: true,

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

{
  key: "endDateTime",
  title: "Дата и время завершения",
  icon: "◷",

  multiplicity: "single",

  composite: true,

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

{
  key: "fullDateTimeRange",
  title: "Дата, время начала и завершения",
  icon: "◷",

  multiplicity: "single",

  composite: true,

  configurable: false,
  removable: true,
  renameable: true,
  hideable: true,

  kind: "property",
},

    {
      key: "priority",
      title: "Приоритет",
      icon: "⚑",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "focus",
      title: "Фокус",
      icon: "◎",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "status",
      title: "Статус",
      icon: "●",

      multiplicity: "single",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    /* -------------------------
       Повторяемые
    ------------------------- */

    {
      key: "text",
      title: "Текст",
      icon: "¶",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    /*
      Эти два типа новые.

      Раньше у нас были только
      Дата начала / Дата завершения
      и Время начала / Время завершения.

      Generic Дата и Время нужны именно
      для повторяемых свойств прототипа.

      На старом проекте автоматически
      не создаём, чтобы внезапно
      не появились новые столбцы.
    */

    {
      key: "date",
      title: "Дата",
      icon: "◷",

      multiplicity: "repeatable",
      legacyDefaultCreated: false,

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "time",
      title: "Время",
      icon: "◴",

      multiplicity: "repeatable",
      legacyDefaultCreated: false,

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "tag",
      title: "Выпадающий список",
      icon: "#",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "extraImage",
      title: "Доп. изображения",
      icon: "▧",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "file",
      title: "Файл",
      icon: "□",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "timeCounter",
      title: "Счётчик времени",
      icon: "▶",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "timerDuration",
      title: "Время таймера",
      icon: "⏱",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    {
      key: "timerRemaining",
      title: "Оставшееся время",
      icon: "◉",

      multiplicity: "repeatable",

      configurable: false,
      removable: true,
      renameable: true,
      hideable: true,

      kind: "property",
    },

    /* -------------------------
       Интерфейс
    ------------------------- */

    {
      key: "levelHeaders",
      title: "Заголовки уровней",
      icon: "☰",

      multiplicity: "single",

      createable: false,

      configurable: true,
      removable: false,
      renameable: true,
      hideable: true,

      kind: "interface",
    },
  ];

  const CATALOG_BY_KEY =
    new Map(
      CATALOG.map(
        (descriptor) => [
          descriptor.key,
          descriptor,
        ]
      )
    );

    const V3_DEFAULT_TYPES =
  new Set([
    "dateRange",
    "timeRange",
    "startDateTime",
    "endDateTime",
    "fullDateTimeRange",
  ]);

function addV3DefaultInstances(
  state
) {
  if (
    !state ||
    !Array.isArray(
      state.instances
    )
  ) {
    return state;
  }

  V3_DEFAULT_TYPES.forEach(
    (type) => {
      const exists =
        state.instances.some(
          (instance) =>
            instance.type === type
        );

      if (exists) {
        return;
      }

      const descriptor =
        CATALOG_BY_KEY.get(
          type
        );

      if (!descriptor) {
        return;
      }

      state.instances.push(
        createInstanceObject(
          descriptor,
          {
            id: type,
          }
        )
      );
    }
  );

  return state;
}

  /* =========================================================
     Helpers
  ========================================================= */

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function uid() {
    return (
      Math.random()
        .toString(36)
        .slice(2, 9) +
      "_" +
      Date.now()
        .toString(36)
    );
  }

  function normalizeTitle(
    value,
    fallback
  ) {
    const title =
      String(value || "")
        .trim();

    return (
      title ||
      String(fallback || "")
    );
  }

  function isRepeatableType(
    type
  ) {
    return (
      CATALOG_BY_KEY.get(
        String(type || "")
      )
        ?.multiplicity ===
      "repeatable"
    );
  }

  function makeRepeatableId(
    type
  ) {
    return (
      String(type) +
      "__" +
      uid()
    );
  }

  /* =========================================================
     Экземпляр
  ========================================================= */

  function createInstanceObject(
    descriptor,
    options = {}
  ) {
    const repeatable =
      descriptor.multiplicity ===
      "repeatable";

    return {
      /*
        Первый старый экземпляр
        сохраняет id = type.

        Новые повторяемые получают
        уникальный id.
      */

      id:
        options.id ||
        (
          repeatable
            ? makeRepeatableId(
                descriptor.key
              )
            : descriptor.key
        ),

      type:
        descriptor.key,

      title:
        normalizeTitle(
          options.title,
          descriptor.title
        ),
    };
  }

  /* =========================================================
     Состояние по умолчанию
  ========================================================= */

  function createDefaultState(
    options = {}
  ) {
    const allCreated =
      options.allCreated !==
      false;

    const instances = [];

    CATALOG.forEach(
      (descriptor) => {
        if (
          descriptor.required
        ) {
          instances.push(
            createInstanceObject(
              descriptor,
              {
                id:
                  descriptor.key,
              }
            )
          );

          return;
        }

        if (!allCreated) {
          return;
        }

        /*
          Новые generic Date/Time
          не появляются автоматически
          в старом проекте.
        */

        if (
          descriptor
            .legacyDefaultCreated ===
          false
        ) {
          return;
        }

        /*
          Интерфейсное свойство тоже
          оставляем созданным, как раньше.
        */

        instances.push(
          createInstanceObject(
            descriptor,
            {
              /*
                Первый экземпляр любого
                существовавшего ранее типа
                сохраняет старый id.

                Это критично:
                tableProps.text,
                tableProps.file и т.д.
                продолжают работать.
              */

              id:
                descriptor.key,
            }
          )
        );
      }
    );

    return {
      version:
        STATE_VERSION,

      instances,
    };
  }

  /* =========================================================
     Миграция v1 -> v2
  ========================================================= */

  function migrateV1State(
    source
  ) {
    const instances = [];

    const oldItems =
      source?.items &&
      typeof source.items ===
        "object"
        ? source.items
        : {};

    CATALOG.forEach(
      (descriptor) => {
        const oldItem =
          oldItems[
            descriptor.key
          ];

        /*
          В старом проекте свойства,
          которых вообще не было
          в items, считаем созданными,
          кроме новых generic Date/Time.
        */

        let created;

        if (
          oldItem &&
          typeof oldItem
            .created ===
            "boolean"
        ) {
          created =
            oldItem.created;
        } else {
          created =
            descriptor
              .legacyDefaultCreated !==
            false;
        }

        if (
          descriptor.required
        ) {
          created = true;
        }

        if (!created) {
          return;
        }

        instances.push(
          createInstanceObject(
            descriptor,
            {
              id:
                descriptor.key,

              title:
                oldItem?.title ||
                descriptor.title,
            }
          )
        );
      }
    );

    return {
      version:
        STATE_VERSION,

      instances,
    };
  }

  /* =========================================================
     Нормализация v2
  ========================================================= */

  function normalizeV2State(
    source
  ) {
    const result = {
      version:
        STATE_VERSION,

      instances: [],
    };

    const usedIds =
      new Set();

    const usedSingleTypes =
      new Set();

    const sourceInstances =
      Array.isArray(
        source?.instances
      )
        ? source.instances
        : [];

    sourceInstances.forEach(
      (raw) => {
        if (
          !raw ||
          typeof raw !==
            "object"
        ) {
          return;
        }

        const type =
          String(
            raw.type || ""
          );

        const descriptor =
          CATALOG_BY_KEY.get(
            type
          );

        if (!descriptor) {
          return;
        }

        const repeatable =
          descriptor
            .multiplicity ===
          "repeatable";

        /*
          У одиночного типа может быть
          только один экземпляр.
        */

        if (
          !repeatable &&
          usedSingleTypes.has(
            type
          )
        ) {
          return;
        }

        let id =
          String(
            raw.id || ""
          ).trim();

        if (!id) {
          id =
            repeatable
              ? makeRepeatableId(
                  type
                )
              : type;
        }

        /*
          У одиночных всегда
          стабильный id = type.
        */

        if (!repeatable) {
          id = type;
        }

        if (
          usedIds.has(id)
        ) {
          if (!repeatable) {
            return;
          }

          id =
            makeRepeatableId(
              type
            );
        }

        usedIds.add(id);

        if (!repeatable) {
          usedSingleTypes.add(
            type
          );
        }

        result.instances.push({
          id,

          type,

          title:
            normalizeTitle(
              raw.title,
              descriptor.title
            ),
        });
      }
    );

    /*
      Обязательные свойства
      нельзя потерять даже из-за
      повреждённого сохранения.
    */

    CATALOG.forEach(
      (descriptor) => {
        if (
          !descriptor.required
        ) {
          return;
        }

        const exists =
          result.instances.some(
            (instance) =>
              instance.type ===
              descriptor.key
          );

        if (exists) {
          return;
        }

        result.instances.unshift(
          createInstanceObject(
            descriptor,
            {
              id:
                descriptor.key,
            }
          )
        );
      }
    );

    return result;
  }

  function normalizeState(
    source =
      global
        .projectPropertiesState
  ) {
    let nextState;

    /*
      Новый формат.
    */

if (
  source &&
  typeof source ===
    "object" &&
  Array.isArray(
    source.instances
  )
) {
  const sourceVersion =
    Number(
      source.version || 2
    );

  nextState =
    normalizeV2State(
      source
    );

  /*
    В версии 3 появились
    стандартные составные колонки
    даты и времени.

    Добавляем их только при миграции
    старого состояния.

    После перехода на v3 удалённое
    пользователем свойство уже
    автоматически не восстановится.
  */

  if (
    sourceVersion < 3
  ) {
    addV3DefaultInstances(
      nextState
    );
  }
}

    /*
      Старый v1.
    */

    else if (
      source &&
      typeof source ===
        "object" &&
      source.items &&
      typeof source.items ===
        "object"
    ) {
      nextState =
        migrateV1State(
          source
        );
    }

    /*
      Проект ещё никогда
      не имел реестра.
    */

    else {
      nextState =
        createDefaultState({
          allCreated: true,
        });
    }

    global
      .projectPropertiesState =
        nextState;

    return nextState;
  }

  function state() {
    return normalizeState(
      global
        .projectPropertiesState
    );
  }

  /* =========================================================
     События / сохранение
  ========================================================= */

  function exportState() {
    return clone(
      state()
    );
  }

  function save() {
    global.projectAutosave
      ?.saveNow?.();
  }

  function dispatchChange(
    instance,
    action
  ) {
    global.dispatchEvent(
      new CustomEvent(
        "project-properties-change",
        {
          detail: {
            /*
              key оставляем для
              обратной совместимости.

              Теперь это ID экземпляра.
            */

            key:
              instance?.id ||
              "",

            instanceId:
              instance?.id ||
              "",

            type:
              instance?.type ||
              "",

            action:
              action || "",

            state:
              exportState(),
          },
        }
      )
    );
  }

  /* =========================================================
     Чтение
  ========================================================= */

  function getInstance(
    instanceId
  ) {
    const id =
      String(
        instanceId || ""
      );

    if (!id) {
      return null;
    }

    return (
      state()
        .instances
        .find(
          (instance) =>
            instance.id === id
        ) ||
      null
    );
  }

  function getInstances() {
    return state()
      .instances
      .map(
        (instance) => ({
          ...instance,
        })
      );
  }

  function getInstancesByType(
    type
  ) {
    const target =
      String(type || "");

    return state()
      .instances
      .filter(
        (instance) =>
          instance.type ===
          target
      )
      .map(
        (instance) => ({
          ...instance,
        })
      );
  }

  function resolveInstance(
    ref
  ) {
    const value =
      String(ref || "");

    if (!value) {
      return null;
    }

    /*
      Сначала пробуем точный ID.
    */

    const exact =
      getInstance(value);

    if (exact) {
      return exact;
    }

    /*
      Старый код часто передаёт
      тип вместо instanceId.

      Для совместимости возвращаем
      первый экземпляр этого типа.
    */

    return (
      state()
        .instances
        .find(
          (instance) =>
            instance.type ===
            value
        ) ||
      null
    );
  }

  function getDescriptor(
    ref
  ) {
    const value =
      String(ref || "");

    if (!value) {
      return null;
    }

    /*
      Передан сам type.
    */

    const direct =
      CATALOG_BY_KEY.get(
        value
      );

    if (direct) {
      return direct;
    }

    /*
      Передан instanceId.
    */

    const instance =
      getInstance(value);

    if (!instance) {
      return null;
    }

    return (
      CATALOG_BY_KEY.get(
        instance.type
      ) ||
      null
    );
  }

  function isCreated(
    ref
  ) {
    return !!resolveInstance(
      ref
    );
  }

  function getTitle(
    ref
  ) {
    const instance =
      resolveInstance(
        ref
      );

    if (instance) {
      return instance.title;
    }

    return (
      getDescriptor(ref)
        ?.title ||
      ""
    );
  }

  function getCreated() {
    return CATALOG.filter(
      (descriptor) =>
        isCreated(
          descriptor.key
        )
    );
  }

  function getNotCreated() {
    return CATALOG.filter(
      (descriptor) =>
        !isCreated(
          descriptor.key
        )
    );
  }

function getCreatedPropertyInstances() {
  return getInstances()
    .filter(
      (instance) => {
        const descriptor =
          CATALOG_BY_KEY.get(
            instance.type
          );

        return (
          descriptor?.kind ===
            "property" ||

          descriptor?.kind ===
            "system"
        );
      }
    );
}

  /* =========================================================
     Создание экземпляра
  ========================================================= */

  function createInstance(
    type,
    options = {}
  ) {
    const descriptor =
      CATALOG_BY_KEY.get(
        String(type || "")
      );

    if (
      !descriptor ||
      descriptor.createable ===
        false
    ) {
      return null;
    }

    const repeatable =
      descriptor
        .multiplicity ===
      "repeatable";

    /*
      Одиночный уже существует.
    */

    if (!repeatable) {
      const existing =
        state()
          .instances
          .find(
            (instance) =>
              instance.type ===
              descriptor.key
          );

      if (existing) {
        return existing;
      }
    }

    const instance =
      createInstanceObject(
        descriptor,
        {
          id:
            options.id ||
            (
              repeatable
                ? makeRepeatableId(
                    descriptor.key
                  )
                : descriptor.key
            ),

          title:
            options.title ||
            descriptor.title,
        }
      );

    /*
      На случай вручную переданного
      конфликтующего ID.
    */

    if (
      getInstance(
        instance.id
      )
    ) {
      instance.id =
        repeatable
          ? makeRepeatableId(
              descriptor.key
            )
          : descriptor.key;
    }

    state()
      .instances
      .push(instance);

    if (
      options.save !== false
    ) {
      save();
    }

    if (
      options.dispatch !==
      false
    ) {
      dispatchChange(
        instance,
        "create"
      );
    }

    return instance;
  }

  /* =========================================================
     Удаление конкретного экземпляра
  ========================================================= */

  function removeInstance(
    instanceId,
    options = {}
  ) {
    const instance =
      getInstance(
        instanceId
      );

    if (!instance) {
      return false;
    }

    const descriptor =
      CATALOG_BY_KEY.get(
        instance.type
      );

    if (
      !descriptor ||
      descriptor.required ||
      descriptor.removable ===
        false
    ) {
      return false;
    }

    const currentState =
      state();

    const index =
      currentState
        .instances
        .findIndex(
          (item) =>
            item.id ===
            instance.id
        );

    if (index < 0) {
      return false;
    }

    currentState
      .instances
      .splice(
        index,
        1
      );

    if (
      options.save !== false
    ) {
      save();
    }

    if (
      options.dispatch !==
      false
    ) {
      dispatchChange(
        instance,
        "remove"
      );
    }

    return true;
  }

  /* =========================================================
     Переименование конкретного экземпляра
  ========================================================= */

  function setTitle(
    ref,
    title,
    options = {}
  ) {
    const instance =
      resolveInstance(
        ref
      );

    if (!instance) {
      return false;
    }

    const descriptor =
      CATALOG_BY_KEY.get(
        instance.type
      );

    if (
      !descriptor ||
      descriptor.renameable ===
        false
    ) {
      return false;
    }

    const nextTitle =
      normalizeTitle(
        title,
        descriptor.title
      );

    if (
      instance.title ===
      nextTitle
    ) {
      return false;
    }

    instance.title =
      nextTitle;

    if (
      options.save !== false
    ) {
      save();
    }

    if (
      options.dispatch !==
      false
    ) {
      dispatchChange(
        instance,
        "rename"
      );
    }

    return true;
  }

  function resetTitle(
    ref,
    options = {}
  ) {
    const instance =
      resolveInstance(
        ref
      );

    if (!instance) {
      return false;
    }

    const descriptor =
      CATALOG_BY_KEY.get(
        instance.type
      );

    if (!descriptor) {
      return false;
    }

    return setTitle(
      instance.id,
      descriptor.title,
      options
    );
  }

  /* =========================================================
     Старый API setCreated

     Оставляем, чтобы уже написанные
     property_panel_tabs.js и
     property_delete.js не упали.

     Для настоящего «Создать ещё»
     дальше будем использовать
     createInstance().
  ========================================================= */

  function setCreated(
    ref,
    created,
    options = {}
  ) {
    const value =
      String(ref || "");

    if (!value) {
      return false;
    }

    if (created) {
      /*
        Если экземпляр или тип
        уже существует, старый setCreated
        ничего не делает.
      */

      if (
        resolveInstance(value)
      ) {
        return false;
      }

      const createdInstance =
        createInstance(
          value,
          options
        );

      return !!createdInstance;
    }

    const instance =
      resolveInstance(
        value
      );

    if (!instance) {
      return false;
    }

    return removeInstance(
      instance.id,
      options
    );
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  global.projectProperties = {
    STATE_VERSION,

    normalizeState,
    createDefaultState,
    exportState,

    getCatalog() {
      return CATALOG.map(
        (descriptor) => ({
          ...descriptor,
        })
      );
    },

    getDescriptor,

    getInstance,
    getInstances,
    getInstancesByType,

    getCreatedPropertyInstances,

    getCreated,
    getNotCreated,

    isCreated,
    getTitle,

    isRepeatable(
      ref
    ) {
      const descriptor =
        getDescriptor(ref);

      return (
        descriptor
          ?.multiplicity ===
        "repeatable"
      );
    },

    createInstance,
    removeInstance,

    setCreated,
    setTitle,
    resetTitle,
  };

  normalizeState();
})();