// property_rename.js
//
// Встроенное переименование свойства.
//
// Переименование запускается из
// property_context_menu.js.
//
// В панели редактируется название строки.
// В таблице редактируется заголовок столбца.
//
// Управление:
//
// - Enter — сохранить;
// - потеря фокуса — сохранить;
// - Escape — отменить.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const global = window;

  let renameState =
    null;

  /* =========================================================
     Helpers
  ========================================================= */

  function escapeSelector(
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
      /[^a-zA-Z0-9_-]/g,
      "\\$&"
    );
  }

  function getPropertyTitle(
    key
  ) {
    return (
      global.projectProperties
        ?.getTitle?.(
          key
        ) ||
      global.projectProperties
        ?.getDescriptor?.(
          key
        )
        ?.title ||
      key
    );
  }

  /* =========================================================
     Соответствие заголовка таблицы свойству
  ========================================================= */

  function getHeaderPropertyKey(
    header
  ) {
    const columnKey =
      String(
        header?.dataset
          ?.tableColumnKey || ""
      );

    if (
      columnKey.startsWith(
        "property:"
      )
    ) {
      return columnKey.slice(
        "property:".length
      );
    }

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
        Составная настройка нескольких
        свойств не получает один ключ.
      */

      if (
        settingKey.includes(
          "|"
        )
      ) {
        return "";
      }

      return settingKey;
    }

    return "";
  }

  /* =========================================================
     Поиск элемента с названием
  ========================================================= */

  function getPanelNameElement(
    key,
    sourceElement
  ) {
    const sourceRow =
      sourceElement?.closest?.(
        "[data-view-property]"
      );

    if (
      sourceRow?.dataset
        ?.viewProperty ===
      key
    ) {
      return sourceRow.querySelector(
        ".view-settings-control-name"
      );
    }

    const row =
      document.querySelector(
        (
          "#viewSettingsPanel " +
          '[data-view-property="' +
          escapeSelector(key) +
          '"]'
        )
      );

    return (
      row?.querySelector(
        ".view-settings-control-name"
      ) ||
      null
    );
  }

  function getTableNameElement(
    key,
    sourceElement
  ) {
    const sourceHeader =
      sourceElement?.closest?.(
        (
          "#tree " +
          ".structure-table " +
          "thead th"
        )
      );

    if (
      sourceHeader &&
      getHeaderPropertyKey(
        sourceHeader
      ) === key
    ) {
      return sourceHeader.querySelector(
        ".table-column-header-label"
      );
    }

    const headers =
      document.querySelectorAll(
        (
          "#tree " +
          ".structure-table " +
          "thead th" +
          "[data-table-column-key]"
        )
      );

    for (
      const header of headers
    ) {
      if (
        getHeaderPropertyKey(
          header
        ) !== key
      ) {
        continue;
      }

      return header.querySelector(
        ".table-column-header-label"
      );
    }

    return null;
  }

  function resolveNameElement(
    detail
  ) {
    if (
      detail.source ===
      "table"
    ) {
      return getTableNameElement(
        detail.key,
        detail.element
      );
    }

    return getPanelNameElement(
      detail.key,
      detail.element
    );
  }

  /* =========================================================
     Обновление всех видимых названий
  ========================================================= */

  function updatePanelTitles(
    key,
    title
  ) {
    document
      .querySelectorAll(
        (
          "#viewSettingsPanel " +
          '[data-view-property="' +
          escapeSelector(key) +
          '"]'
        )
      )
      .forEach(
        (row) => {
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
      );
  }

  function updateTableTitles(
    key,
    title
  ) {
    document
      .querySelectorAll(
        (
          "#tree " +
          ".structure-table " +
          "thead th" +
          "[data-table-column-key]"
        )
      )
      .forEach(
        (header) => {
          if (
            getHeaderPropertyKey(
              header
            ) !== key
          ) {
            return;
          }

          const label =
            header.querySelector(
              ".table-column-header-label"
            );

          if (label) {
            label.textContent =
              title;
          }
        }
      );
  }

  function updateVisibleTitles(
    key,
    title
  ) {
    updatePanelTitles(
      key,
      title
    );

    updateTableTitles(
      key,
      title
    );

    global.propertyPanelTabs
      ?.render?.();
  }

  /* =========================================================
     Завершение
  ========================================================= */

  function finishRename(
    commit
  ) {
    const state =
      renameState;

    if (!state) {
      return;
    }

    renameState =
      null;

    const nextTitle =
      String(
        state.input.value || ""
      )
        .trim();

state.input.remove();

state.label.classList.remove(
  "inline-edit-cell"
);

/*
  Возвращаем исходные inline-стили.
*/

if (
  state.labelStyle === null
) {
  state.label.removeAttribute(
    "style"
  );
} else {
  state.label.setAttribute(
    "style",
    state.labelStyle
  );
}

    state.container
      ?.classList
      ?.remove(
        "is-property-renaming"
      );

    document.body.classList.remove(
      "property-renaming"
    );

    /*
      Пустое название не сохраняем.
      Escape тоже возвращает прежний текст.
    */

    if (
      !commit ||
      !nextTitle
    ) {
      state.label.textContent =
        state.oldTitle;

      return;
    }

    const changed =
      global.projectProperties
        ?.setTitle?.(
          state.key,
          nextTitle
        );

    /*
      Даже если значение совпало со старым,
      синхронизируем все видимые места.
    */

    const savedTitle =
      getPropertyTitle(
        state.key
      );

    state.label.textContent =
      savedTitle;

    updateVisibleTitles(
      state.key,
      savedTitle
    );

    if (
      changed === false
    ) {
      return;
    }

    global.dispatchEvent(
      new CustomEvent(
        "property-title-change",
        {
          detail: {
            key:
              state.key,

            title:
              savedTitle,
          },
        }
      )
    );
  }

  /* =========================================================
     Начало редактирования
  ========================================================= */

  function startRename(
    detail
  ) {
    const key =
      String(
        detail?.key || ""
      );

    if (!key) {
      return false;
    }

    const descriptor =
      global.projectProperties
        ?.getDescriptor?.(
          key
        );

    if (
      !descriptor ||
      descriptor.renameable ===
        false
    ) {
      return false;
    }

    /*
      Если уже редактируется другое свойство,
      сначала сохраняем его.
    */

    if (renameState) {
      finishRename(true);
    }

    const label =
      resolveNameElement(
        detail
      );

    if (!label) {
      return false;
    }

    const oldTitle =
      getPropertyTitle(
        key
      );

    const container =
      label.parentElement;

      /*
        Запоминаем исходные стили,
        чтобы вернуть их после завершения.
      */

      const labelStyle =
        label.getAttribute("style");

      const labelRect =
        label.getBoundingClientRect();

      const labelDisplay =
        getComputedStyle(label).display;

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "text";

    input.className =
      "property-rename-input";

    if (
      detail.source ===
      "table"
    ) {
      input.classList.add(
        "property-rename-input--table"
      );
    } else {
      input.classList.add(
        "property-rename-input--panel"
      );
    }

    input.value =
      oldTitle;

    input.setAttribute(
      "aria-label",
      (
        "Новое название свойства «" +
        oldTitle +
        "»"
      )
    );

    /*
      Скрываем только текстовый label.

      Остальные элементы строки или заголовка,
      включая иконку и resize-ручку,
      продолжают существовать.
    */

   /*
  hidden может перекрываться стилями
  заголовка таблицы, поэтому используем
  отдельный класс с display: none !important.
*/

    /*
  Название становится постоянной
  внешней ячейкой редактора.
*/

label.classList.add(
  "inline-edit-cell"
);

if (
  labelDisplay === "inline"
) {
  label.style.display =
    "inline-block";
}

label.style.width =
  `${Math.max(
    1,
    labelRect.width
  )}px`;

label.style.minWidth =
  `${Math.max(
    1,
    labelRect.width
  )}px`;

label.style.maxWidth =
  `${Math.max(
    1,
    labelRect.width
  )}px`;

label.style.height =
  `${Math.max(
    1,
    labelRect.height
  )}px`;

label.style.boxSizing =
  "border-box";

input.classList.add(
  "inline-cell-input"
);

label.replaceChildren(
  input
);

    container
      ?.classList
      ?.add(
        "is-property-renaming"
      );

    document.body.classList.add(
      "property-renaming"
    );

    renameState = {
        key,

        source:
          detail.source,

        label,
        input,
        container,

        labelStyle,
        oldTitle,
      };

    /*
      Enter и Escape не должны попадать
      в общую систему хоткеев приложения.
    */

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();
          event.stopPropagation();

          finishRename(true);
          return;
        }

        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();
          event.stopPropagation();

          finishRename(false);
        }
      },
      true
    );

    input.addEventListener(
      "pointerdown",
      (event) => {
        event.stopPropagation();
      },
      true
    );

    input.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
      },
      true
    );

    input.addEventListener(
      "contextmenu",
      (event) => {
        event.stopPropagation();
      },
      true
    );

    input.addEventListener(
      "blur",
      () => {
        /*
          После Enter состояние уже очищено,
          поэтому повторного сохранения не будет.
        */

        if (
          renameState?.input ===
          input
        ) {
          finishRename(true);
        }
      }
    );

    requestAnimationFrame(
      () => {
        input.focus({
          preventScroll: true,
        });

        const end =
  input.value.length;

input.setSelectionRange(
  end,
  end
);
      }
    );

    return true;
  }

  /* =========================================================
     События
  ========================================================= */

  function handleRenameRequest(
    event
  ) {
    startRename(
      event.detail || {}
    );
  }

  function handleProjectTitleChange(
    event
  ) {
    const key =
      event.detail?.key;

    if (!key) {
      return;
    }

    updateVisibleTitles(
      key,
      getPropertyTitle(key)
    );
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    if (
      document.documentElement
        .dataset
        .propertyRenameBound ===
      "1"
    ) {
      return;
    }

    document.documentElement
      .dataset
      .propertyRenameBound =
        "1";

    global.addEventListener(
      "property-rename-request",
      handleRenameRequest
    );

    global.addEventListener(
      "project-properties-change",
      handleProjectTitleChange
    );

    global.addEventListener(
      "view-tabs-change",
      () => {
        if (renameState) {
          finishRename(true);
        }
      }
    );
  }

  global.propertyRename = {
    init,

    start:
      startRename,

    save() {
      finishRename(true);
    },

    cancel() {
      finishRename(false);
    },

    isActive() {
      return !!renameState;
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