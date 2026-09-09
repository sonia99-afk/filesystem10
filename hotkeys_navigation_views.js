// hotkeys_navigation_views.js
//
// Переключает строки блока «Выбор»
// в панели настройки горячих клавиш.
//
// Этот переключатель не меняет реальное
// отображение приложения.
//
// Доступны четыре группы:
//
// 1. lists
//    Структура и Лист.
//
// 2. horizontal
//    Горизонтальная иерархия
//    и горизонтальный айсикл.
//
// 3. vertical
//    Вертикальная иерархия
//    и вертикальный айсикл.
//
// 4. table
//    Таблица.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  /* =========================================================
     Доступные группы
  ========================================================= */

  const GROUP = Object.freeze({
    LISTS: "lists",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    TABLE: "table",
  });

  const ALLOWED_GROUPS = new Set([
    GROUP.LISTS,
    GROUP.HORIZONTAL,
    GROUP.VERTICAL,
    GROUP.TABLE,
  ]);

  /*
    Пока HTML ещё содержит старое имя schema,
    считаем его псевдонимом группы lists.

    Благодаря этому файл можно заменить
    до изменения HTML — текущая панель
    продолжит работать.
  */

  const GROUP_ALIASES = Object.freeze({
    schema: GROUP.LISTS,
    main: GROUP.LISTS,
  });

  let selectedGroup =
    GROUP.LISTS;

  /* =========================================================
     Нормализация имени группы
  ========================================================= */

  function normalizeGroup(group) {
    const value =
      String(group || "").trim();

    if (!value) {
      return "";
    }

    return (
      GROUP_ALIASES[value] ||
      value
    );
  }

  function isAllowedGroup(group) {
    return ALLOWED_GROUPS.has(
      normalizeGroup(group)
    );
  }

  /* =========================================================
     Получение элементов панели
  ========================================================= */

  function getButtons() {
    return Array.from(
      document.querySelectorAll(
        ".hotkeys-group-switcher " +
        "[data-hotkeys-group]"
      )
    );
  }

  function getLabelColumns() {
    return Array.from(
      document.querySelectorAll(
        "[data-hotkeys-group-label]"
      )
    );
  }

  function getSelectionRows() {
    return Array.from(
      document.querySelectorAll(
        "[data-selection-view]"
      )
    );
  }

  /* =========================================================
     Группы одной строки

     Пока используется одно значение:

     data-selection-view="lists"

     Но также поддерживается несколько:

     data-selection-view="lists horizontal"

     Это пригодится для переходного этапа.
  ========================================================= */

  function getElementGroups(
    element,
    datasetName
  ) {
    const raw =
      String(
        element?.dataset?.[
          datasetName
        ] || ""
      );

    return raw
      .split(/[\s,]+/)
      .map(normalizeGroup)
      .filter(Boolean);
  }

  function elementBelongsToGroup(
    element,
    datasetName,
    group
  ) {
    const normalizedGroup =
      normalizeGroup(group);

    return getElementGroups(
      element,
      datasetName
    ).includes(normalizedGroup);
  }

  /* =========================================================
     Синхронизация кнопок
  ========================================================= */

  function syncButtons() {
    getButtons().forEach(
      (button) => {
        const buttonGroup =
          normalizeGroup(
            button.dataset
              .hotkeysGroup
          );

        const isActive =
          buttonGroup ===
          selectedGroup;

        button.classList.toggle(
          "is-active",
          isActive
        );

        /*
          Старый класс active оставляем
          для совместимости со старыми
          стилями кнопок.
        */

        button.classList.toggle(
          "active",
          isActive
        );

        button.setAttribute(
          "aria-pressed",
          isActive
            ? "true"
            : "false"
        );
      }
    );
  }

  /* =========================================================
     Синхронизация подписей видов
  ========================================================= */

  function syncLabelColumns() {
    getLabelColumns().forEach(
      (column) => {
        const isActive =
          elementBelongsToGroup(
            column,
            "hotkeysGroupLabel",
            selectedGroup
          );

        column.classList.toggle(
          "is-active",
          isActive
        );
      }
    );
  }

  /* =========================================================
     Синхронизация строк таблицы
  ========================================================= */

  function syncRows() {
    getSelectionRows().forEach(
      (row) => {
        const isVisible =
          elementBelongsToGroup(
            row,
            "selectionView",
            selectedGroup
          );

        row.hidden =
          !isVisible;
      }
    );

    /*
      После смены группы заново
      показываем актуальные значения
      горячих клавиш и конфликты.
    */

    window.syncHotkeysTable?.();
  }

  function syncAll() {
    syncButtons();
    syncLabelColumns();
    syncRows();
  }

  /* =========================================================
     Выбор группы
  ========================================================= */

  function selectGroup(group) {
    const normalizedGroup =
      normalizeGroup(group);

    if (
      !ALLOWED_GROUPS.has(
        normalizedGroup
      )
    ) {
      return false;
    }

    selectedGroup =
      normalizedGroup;

    syncAll();

    return true;
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    getButtons().forEach(
      (button) => {
        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            selectGroup(
              button.dataset
                .hotkeysGroup
            );
          }
        );
      }
    );

    selectGroup(
      GROUP.LISTS
    );
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.hotkeysNavigationViews = {
    GROUP,

    selectGroup,

    getSelectedGroup() {
      return selectedGroup;
    },

    /*
      Оставляем для совместимости,
      если старый код вызывает
      getVisibleGroup().
    */

    getVisibleGroup() {
      return selectedGroup;
    },

    /*
      Совместимость со старым API.

      Функция может получить как имя группы,
      так и условное имя отображения.
    */

    selectView(view) {
      const normalizedView =
        normalizeGroup(view);

      if (
        isAllowedGroup(
          normalizedView
        )
      ) {
        selectGroup(
          normalizedView
        );

        return;
      }

      const value =
        String(view || "")
          .toLowerCase();

      if (value === "table") {
        selectGroup(
          GROUP.TABLE
        );

        return;
      }

      if (
        value === "vertical" ||
        value ===
          "hierarchy-vertical" ||
        value ===
          "aicycle-vertical"
      ) {
        selectGroup(
          GROUP.VERTICAL
        );

        return;
      }

      if (
        value === "horizontal" ||
        value ===
          "hierarchy-horizontal" ||
        value ===
          "aicycle-horizontal"
      ) {
        selectGroup(
          GROUP.HORIZONTAL
        );

        return;
      }

      selectGroup(
        GROUP.LISTS
      );
    },

    getSelectedView() {
      return selectedGroup;
    },

    normalizeGroup,
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