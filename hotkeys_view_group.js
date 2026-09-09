// hotkeys_view_group.js
//
// Четыре независимые области навигационных хоткеев:
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
     Имена групп
  ========================================================= */

  const GROUP = Object.freeze({
    LISTS: "lists",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    TABLE: "table",

    /*
      Старое имя сохраняем как псевдоним
      группы списков.

      Это нужно для совместимости
      со старым кодом проекта.
    */
    MAIN: "lists",
  });

  /* =========================================================
     Текущая ориентация
  ========================================================= */

  function getOrientation() {
    return (
      window.viewOrientation ||
      window.VIEW_ORIENTATION
        ?.HORIZONTAL ||
      "horizontal"
    );
  }

  function isHorizontalOrientation() {
    const orientation =
      getOrientation();

    return (
      orientation ===
        window.VIEW_ORIENTATION
          ?.HORIZONTAL ||
      orientation === "horizontal"
    );
  }

  function isVerticalOrientation() {
    const orientation =
      getOrientation();

    return (
      orientation ===
        window.VIEW_ORIENTATION
          ?.VERTICAL ||
      orientation === "vertical"
    );
  }

  /* =========================================================
     Определение типа отображения
  ========================================================= */

  function isTableView() {
    const view =
      window.currentView;

    return (
      view === window.VIEW?.TABLE ||
      view === "table"
    );
  }

  function isSchemaView() {
    const view =
      window.currentView;

    return (
      view === window.VIEW?.SCHEMA ||
      view === "schema"
    );
  }

  function isListView() {
    const view =
      window.currentView;

    return (
      view === window.VIEW?.LIST ||
      view === "list"
    );
  }

  function isHierarchyView() {
    const view =
      window.currentView;

    return (
      view ===
        window.VIEW?.HIERARCHY ||
      view === "hierarchy"
    );
  }

  function isAicycleView() {
    const view =
      window.currentView;

    return (
      view ===
        window.VIEW?.AICYCLE ||
      view === "aicycle"
    );
  }

  function isOrientedView() {
    return (
      isHierarchyView() ||
      isAicycleView()
    );
  }

  /* =========================================================
     Активная группа
  ========================================================= */

  function getActiveGroup() {
    if (isTableView()) {
      return GROUP.TABLE;
    }

    if (
      isOrientedView() &&
      isVerticalOrientation()
    ) {
      return GROUP.VERTICAL;
    }

    if (
      isOrientedView() &&
      isHorizontalOrientation()
    ) {
      return GROUP.HORIZONTAL;
    }

    if (
      isSchemaView() ||
      isListView()
    ) {
      return GROUP.LISTS;
    }

    /*
      Для режимов без отдельной навигационной
      схемы сохраняем прежнее безопасное
      поведение основной группы.
    */

    return GROUP.LISTS;
  }

  function isActive(group) {
    return (
      getActiveGroup() === group
    );
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.hotkeysViewGroup = {
    GROUP,

    getActiveGroup,
    isActive,

    isLists() {
      return isActive(
        GROUP.LISTS
      );
    },

    isHorizontal() {
      return isActive(
        GROUP.HORIZONTAL
      );
    },

    isVertical() {
      return isActive(
        GROUP.VERTICAL
      );
    },

    isTable() {
      return isActive(
        GROUP.TABLE
      );
    },

    /*
      Старые app2.js, level_nav.js
      и branch_nav.js вызывают isMain().

      Теперь старое имя main соответствует
      только группе «Списки».
    */

    isMain() {
      return isActive(
        GROUP.LISTS
      );
    },
  };
})();