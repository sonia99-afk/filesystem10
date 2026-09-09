// horizontal_nav.js
//
// Независимая навигация для:
//
// - горизонтальной иерархии;
// - горизонтального айсикла.
//
// Действия:
//
// По списку:
// horizontalListUp
// horizontalListDown
//
// По уровню:
// horizontalLevelUp
// horizontalLevelDown
//
// По ветке:
// horizontalBranchLeft
// horizontalBranchRight

(function () {
  if (typeof window === "undefined") {
    return;
  }

  /* =========================================================
     Активна ли горизонтальная группа
  ========================================================= */

  function isHorizontalGroupActive() {
    return !!window
      .hotkeysViewGroup
      ?.isHorizontal?.();
  }

  /* =========================================================
     Проверка редактирования
  ========================================================= */

  function isEditingNow() {
    const activeElement =
      document.activeElement;

    if (!activeElement) {
      return false;
    }

    const tag =
      String(
        activeElement.tagName || ""
      ).toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      activeElement
        .isContentEditable ||
      !!activeElement.closest?.(
        ".edit"
      ) ||
      !!activeElement.closest?.(
        ".table-cell-editor"
      ) ||
      !!activeElement.closest?.(
        ".table-rich-cell-editor"
      )
    );
  }

  /* =========================================================
     Остановка события
  ========================================================= */

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();

    /*
      stopImmediatePropagation не используем.

      После первого нажатия событие должно
      попасть в hotkey_hold_repeat.js.

      На следующем шаге мы добавим туда
      отдельный repeat для horizontal.
    */
  }

  /* =========================================================
     Навигация по списку
  ========================================================= */

  function moveList(direction) {
    if (
      direction !== -1 &&
      direction !== 1
    ) {
      return false;
    }

    if (
      typeof window.moveSelection ===
      "function"
    ) {
      window.moveSelection(
        direction
      );

      return true;
    }

    if (
      typeof moveSelection ===
      "function"
    ) {
      moveSelection(
        direction
      );

      return true;
    }

    return false;
  }

  /* =========================================================
     Выполнение действия
  ========================================================= */

  function runAction(action) {
    switch (action) {
      case "horizontalListUp":
        return moveList(-1);

      case "horizontalListDown":
        return moveList(1);

      /*
        Навигация среди объектов
        одного уровня.

        Используем уже существующую
        логику level_nav.js.
      */

      case "horizontalLevelUp":
        return !!window
          .levelNav
          ?.up?.();

      case "horizontalLevelDown":
        return !!window
          .levelNav
          ?.down?.();

      /*
        Навигация по текущей ветке.

        Используем уже существующую
        логику branch_nav.js.
      */

      case "horizontalBranchLeft":
        return !!window
          .branchNav
          ?.left?.();

      case "horizontalBranchRight":
        return !!window
          .branchNav
          ?.right?.();

      default:
        return false;
    }
  }

  /* =========================================================
     Обработка первого нажатия
  ========================================================= */

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        !isHorizontalGroupActive()
      ) {
        return;
      }

      /*
        Повторные системные keydown
        будет обрабатывать общий repeat.
      */

      if (event.repeat) {
        return;
      }

      if (
        window.hotkeysMode ===
        "custom"
      ) {
        return;
      }

      if (isEditingNow()) {
        return;
      }

      if (
        typeof treeHasFocus !==
          "undefined" &&
        !treeHasFocus
      ) {
        return;
      }

      if (
        typeof selectedId !==
          "undefined" &&
        !selectedId
      ) {
        return;
      }

      const matcher =
        typeof window.isHotkey ===
        "function"
          ? window.isHotkey
          : (
              typeof isHotkey ===
              "function"
                ? isHotkey
                : null
            );

      if (!matcher) {
        return;
      }

      const actions = [
        "horizontalListUp",
        "horizontalListDown",

        "horizontalLevelUp",
        "horizontalLevelDown",

        "horizontalBranchLeft",
        "horizontalBranchRight",
      ];

      for (
        const action of actions
      ) {
        if (
          !matcher(
            event,
            action
          )
        ) {
          continue;
        }

        stopEvent(event);
        runAction(action);

        return;
      }
    },
    true
  );

  /* =========================================================
     Публичный API

     Он понадобится для удержания клавиш.
  ========================================================= */

  window.horizontalNav = {
    run: runAction,

    listUp() {
      return runAction(
        "horizontalListUp"
      );
    },

    listDown() {
      return runAction(
        "horizontalListDown"
      );
    },

    levelUp() {
      return runAction(
        "horizontalLevelUp"
      );
    },

    levelDown() {
      return runAction(
        "horizontalLevelDown"
      );
    },

    branchLeft() {
      return runAction(
        "horizontalBranchLeft"
      );
    },

    branchRight() {
      return runAction(
        "horizontalBranchRight"
      );
    },
  };
})();