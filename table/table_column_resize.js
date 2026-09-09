// table/table_column_resize.js
//
// Изменение ширины колонок таблицы.
//
// Механика соответствует прототипу:
//
// - используется colgroup;
// - таблица работает через table-layout: fixed;
// - колонка может быть уже своего содержимого;
// - минимальная ширина — 25 px;
// - ширина сохраняется отдельно для активной вкладки;
// - ширина восстанавливается после каждого render;
// - содержимое ячеек и их обработчики не перестраиваются.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const MIN_COLUMN_WIDTH = 25;
  const MAX_COLUMN_WIDTH = 10000;

  let resizeState = null;

  /* =========================================================
     Общие helpers
  ========================================================= */

  function normalizeWidth(
    width
  ) {
    return Math.max(
      MIN_COLUMN_WIDTH,
      Math.min(
        MAX_COLUMN_WIDTH,
        Math.round(
          Number(width) || 0
        )
      )
    );
  }

  function escapeSelector(
    value
  ) {
    const text =
      String(value || "");

    if (
      window.CSS &&
      typeof window.CSS.escape ===
        "function"
    ) {
      return window.CSS.escape(
        text
      );
    }

    return text.replace(
      /[^a-zA-Z0-9_-]/g,
      "\\$&"
    );
  }

  /* =========================================================
     Активная вкладка таблицы
  ========================================================= */

  function getActiveTableItem() {
    /*
      Модуль запускается только
      в табличном отображении.

      Поэтому достаточно получить
      текущую активную вкладку.
    */

    const directItem =
      window.viewSettings
        ?.getActiveItem?.();

    if (
      directItem &&
      typeof directItem ===
        "object"
    ) {
      return directItem;
    }

    const state =
      window.viewTabs
        ?.normalizeState?.() ||
      window.viewTabsState;

    if (
      !state ||
      !Array.isArray(
        state.items
      )
    ) {
      return null;
    }

    return (
      state.items.find(
        (item) =>
          item.id ===
          state.activeId
      ) ||
      state.items[0] ||
      null
    );
  }

  /* =========================================================
     Хранилище ширин
  ========================================================= */

  function getWidthsStore() {
    const item =
      getActiveTableItem();

    if (!item) {
      return null;
    }

    if (
      !item.settings ||
      typeof item.settings !==
        "object"
    ) {
      item.settings = {};
    }

    if (
      !item.settings
        .tableColumnWidths ||
      typeof item.settings
        .tableColumnWidths !==
        "object" ||
      Array.isArray(
        item.settings
          .tableColumnWidths
      )
    ) {
      item.settings
        .tableColumnWidths = {};
    }

    return item.settings
      .tableColumnWidths;
  }

  function getSavedWidth(
    columnKey
  ) {
    if (!columnKey) {
      return null;
    }

    const store =
      getWidthsStore();

    if (!store) {
      return null;
    }

    const width =
      Number(
        store[columnKey]
      );

    if (
      !Number.isFinite(width)
    ) {
      return null;
    }

    return normalizeWidth(width);
  }

  function saveWidth(
    columnKey,
    width
  ) {
    if (!columnKey) {
      return false;
    }

    const store =
      getWidthsStore();

    if (!store) {
      return false;
    }

    store[columnKey] =
      normalizeWidth(width);

    /*
      Запускаем существующее
      автосохранение проекта.
    */

    window.projectAutosave
      ?.saveNow?.();

    return true;
  }

  /* =========================================================
     Стабильный ключ колонки
  ========================================================= */

  function getColumnKey(
    header,
    columnIndex
  ) {
    const storedKey =
      header?.dataset
        ?.tableColumnKey;

    if (storedKey) {
      return storedKey;
    }

    /*
      Запасной ключ.

      Основной вариант —
      data-table-column-key,
      который задаётся в table_view.js.
    */

    const title =
      String(
        header?.textContent || ""
      )
        .trim()
        .toLowerCase();

    if (title) {
      return (
        "title:" +
        title
      );
    }

    return (
      "column:" +
      String(columnIndex)
    );
  }

  /* =========================================================
     Заголовки и colgroup
  ========================================================= */

  function getHeaders(
    table
  ) {
    return Array.from(
      table.querySelectorAll(
        "thead th"
      )
    );
  }

  function getColumns(
    colgroup
  ) {
    if (!colgroup) {
      return [];
    }

    return Array.from(
      colgroup.querySelectorAll(
        "col[data-table-column-key]"
      )
    );
  }

  function getColumn(
    colgroup,
    columnKey
  ) {
    if (
      !colgroup ||
      !columnKey
    ) {
      return null;
    }

    return colgroup.querySelector(
      'col[data-table-column-key="' +
        escapeSelector(
          columnKey
        ) +
        '"]'
    );
  }

  function getColumnWidth(
    column
  ) {
    if (!column) {
      return 0;
    }

    return (
      Number.parseFloat(
        column.style.width
      ) || 0
    );
  }

  /* =========================================================
     Ширина всей таблицы
  ========================================================= */

  function updateTableWidth(
    table,
    colgroup
  ) {
    const totalWidth =
      getColumns(
        colgroup
      ).reduce(
        (
          total,
          column
        ) => {
          return (
            total +
            getColumnWidth(
              column
            )
          );
        },
        0
      );

    if (totalWidth <= 0) {
      return;
    }

    const width =
      Math.round(
        totalWidth
      );

    /*
      В fixed-layout браузеру нужна
      явная ширина всей таблицы.

      Она равна сумме ширин col.
    */

    table.style.width =
      `${width}px`;

    table.style.minWidth =
      `${width}px`;
  }

  /* =========================================================
     Создание colgroup
  ========================================================= */

  /*
  Измеряет колонки, у которых ширина
  должна определяться фиксированным
  объектом внутри ячейки, а не названием
  заголовка таблицы.

  Сейчас это:
  - ID;
  - Метка;
  - Уровень;
  - Обложка;
  - Доп. изображение.
*/
function measureContentSizedColumnWidth(
  table,
  columnIndex
) {
  if (
    !table ||
    columnIndex < 0
  ) {
    return 0;
  }

  const cells =
    Array.from(
      table.querySelectorAll(
        "tbody > tr"
      )
    )
      .map(
        (row) =>
          row.cells[
            columnIndex
          ] || null
      )
      .filter(
        (cell) =>
          cell?.classList.contains(
            "table-content-sized-cell"
          )
      );

  if (!cells.length) {
    return 0;
  }

  let maximumWidth = 0;

  cells.forEach((cell) => {
    const content =
      cell.firstElementChild;

    if (!content) {
      return;
    }

    const cellStyle =
      getComputedStyle(cell);

    const contentWidth =
      content
        .getBoundingClientRect()
        .width;

    const paddingWidth =
      (
        Number.parseFloat(
          cellStyle.paddingLeft
        ) || 0
      ) +
      (
        Number.parseFloat(
          cellStyle.paddingRight
        ) || 0
      );

    /*
  У таблицы border-collapse: collapse.

  Левая и правая границы не складываются
  как две независимые границы. Берём
  только максимальную из них.
*/
const borderLeftWidth =
  Number.parseFloat(
    cellStyle.borderLeftWidth
  ) || 0;

const borderRightWidth =
  Number.parseFloat(
    cellStyle.borderRightWidth
  ) || 0;

const borderWidth =
  Math.max(
    borderLeftWidth,
    borderRightWidth
  );

    maximumWidth =
      Math.max(
        maximumWidth,
        Math.ceil(
          contentWidth +
          paddingWidth +
          borderWidth
        )
      );
  });

  return maximumWidth > 0
    ? normalizeWidth(
        maximumWidth
      )
    : 0;
}

  function createColgroup(
    table,
    headers
  ) {
    /*
      На случай повторного mount
      очищаем предыдущую конфигурацию.
    */

    table
      .querySelector(
        ":scope > " +
          "colgroup.table-column-widths"
      )
      ?.remove();

    table.classList.remove(
      "table-column-widths-active"
    );

    table.style.removeProperty(
      "width"
    );

    table.style.removeProperty(
      "min-width"
    );

    /*
      Сначала измеряем таблицу
      в её прежнем auto-layout.

      Эти значения станут начальными
      ширинами колонок.
    */

    const measuredWidths =
  headers.map(
    (
      header,
      columnIndex
    ) => {
      const contentWidth =
        measureContentSizedColumnWidth(
          table,
          columnIndex
        );

      /*
        Для отмеченных пяти колонок
        используем ширину содержимого.

        Для всех остальных сохраняем
        прежнее измерение по заголовку.
      */
      return normalizeWidth(
        contentWidth ||
        header
          .getBoundingClientRect()
          .width
      );
    }
  );

    const colgroup =
      document.createElement(
        "colgroup"
      );

    colgroup.className =
      "table-column-widths";

    headers.forEach(
      (
        header,
        columnIndex
      ) => {
        const columnKey =
          getColumnKey(
            header,
            columnIndex
          );

        const savedWidth =
          getSavedWidth(
            columnKey
          );

        const width =
          savedWidth !== null
            ? savedWidth
            : measuredWidths[
                columnIndex
              ];

        const column =
          document.createElement(
            "col"
          );

        column.dataset
          .tableColumnKey =
            columnKey;

        column.style.width =
          `${width}px`;

        colgroup.appendChild(
          column
        );
      }
    );

    table.prepend(
      colgroup
    );

    /*
      Только после измерения переводим
      таблицу в fixed-layout.
    */

    table.classList.add(
      "table-column-widths-active"
    );

    updateTableWidth(
      table,
      colgroup
    );

    return colgroup;
  }

  /* =========================================================
     Фиксация текущих ширин
  ========================================================= */

  function freezeCurrentWidths(
    table,
    colgroup
  ) {
    const headers =
      getHeaders(table);

    const columns =
      getColumns(colgroup);

    headers.forEach(
      (
        header,
        columnIndex
      ) => {
        const column =
          columns[
            columnIndex
          ];

        if (!column) {
          return;
        }

        /*
          Берём именно фактическую
          ширину заголовка перед resize.
        */

        const width =
          normalizeWidth(
            header
              .getBoundingClientRect()
              .width
          );

        column.style.width =
          `${width}px`;
      }
    );

    updateTableWidth(
      table,
      colgroup
    );
  }

  /* =========================================================
     Изменение одной колонки
  ========================================================= */

  function setColumnWidth(
    table,
    colgroup,
    columnKey,
    width
  ) {
    const column =
      getColumn(
        colgroup,
        columnKey
      );

    if (!column) {
      return 0;
    }

    const nextWidth =
      normalizeWidth(width);

    /*
      Меняем только col.

      Именно поэтому содержимое td
      больше не определяет ширину колонки.
    */

    column.style.width =
      `${nextWidth}px`;

    updateTableWidth(
      table,
      colgroup
    );

    return nextWidth;
  }

  function getTableColgroup(
  table
) {
  return (
    table?.querySelector(
      ":scope > " +
      "colgroup.table-column-widths"
    ) ||
    null
  );
}

function getHeaderByColumnKey(
  table,
  columnKey
) {
  if (
    !table ||
    !columnKey
  ) {
    return null;
  }

  return table.querySelector(
    'thead th[data-table-column-key="' +
      escapeSelector(
        columnKey
      ) +
      '"]'
  );
}

function getCurrentColumnWidth(
  table,
  columnKey
) {
  const colgroup =
    getTableColgroup(
      table
    );

  const column =
    getColumn(
      colgroup,
      columnKey
    );

  if (column) {
    return normalizeWidth(
      getColumnWidth(
        column
      )
    );
  }

  const header =
    getHeaderByColumnKey(
      table,
      columnKey
    );

  if (!header) {
    return 0;
  }

  return normalizeWidth(
    header
      .getBoundingClientRect()
      .width
  );
}

function applyColumnWidth(
  table,
  columnKey,
  width,
  options = {}
) {
  if (
    !table ||
    !columnKey
  ) {
    return 0;
  }

  let colgroup =
    getTableColgroup(
      table
    );

  /*
    Если colgroup ещё не создан,
    подключаем к таблице существующий
    модуль изменения ширины.
  */

  if (!colgroup) {
    mount(
      table
    );

    colgroup =
      getTableColgroup(
        table
      );
  }

  if (!colgroup) {
    return 0;
  }

  const nextWidth =
    setColumnWidth(
      table,
      colgroup,
      columnKey,
      width
    );

  if (
    nextWidth > 0 &&
    options.save !== false
  ) {
    saveWidth(
      columnKey,
      nextWidth
    );
  }

  return nextWidth;
}

function measureAutoFitWidth(
  table,
  columnKey
) {
  const header =
    getHeaderByColumnKey(
      table,
      columnKey
    );

  const colgroup =
    getTableColgroup(
      table
    );

  if (
    !header ||
    !colgroup
  ) {
    return 0;
  }

  const nextSibling =
    colgroup.nextSibling;

  const hadActiveClass =
    table.classList.contains(
      "table-column-widths-active"
    );

  const oldWidth =
    table.style.getPropertyValue(
      "width"
    );

  const oldWidthPriority =
    table.style.getPropertyPriority(
      "width"
    );

  const oldMinWidth =
    table.style.getPropertyValue(
      "min-width"
    );

  const oldMinWidthPriority =
    table.style.getPropertyPriority(
      "min-width"
    );

  let measuredWidth = 0;

  /*
    Временно возвращаем таблицу
    в естественный auto-layout.

    Изменения выполняются синхронно,
    поэтому пользователь не должен
    увидеть промежуточное состояние.
  */

  try {
    colgroup.remove();

    table.classList.remove(
      "table-column-widths-active"
    );

    table.style.removeProperty(
      "width"
    );

    table.style.removeProperty(
      "min-width"
    );

    const columnIndex =
  getHeaders(table)
    .indexOf(header);

const contentWidth =
  measureContentSizedColumnWidth(
    table,
    columnIndex
  );

measuredWidth =
  normalizeWidth(
    contentWidth ||
    header
      .getBoundingClientRect()
      .width
  );
  } finally {
    const restoreBefore =
      nextSibling?.parentNode ===
      table
        ? nextSibling
        : table.firstChild;

    table.insertBefore(
      colgroup,
      restoreBefore
    );

    table.classList.toggle(
      "table-column-widths-active",
      hadActiveClass
    );

    if (oldWidth) {
      table.style.setProperty(
        "width",
        oldWidth,
        oldWidthPriority
      );
    } else {
      table.style.removeProperty(
        "width"
      );
    }

    if (oldMinWidth) {
      table.style.setProperty(
        "min-width",
        oldMinWidth,
        oldMinWidthPriority
      );
    } else {
      table.style.removeProperty(
        "min-width"
      );
    }
  }

  return measuredWidth;
}

function autoFitColumn(
  table,
  columnKey,
  options = {}
) {
  const width =
    measureAutoFitWidth(
      table,
      columnKey
    );

  if (!width) {
    return 0;
  }

  return applyColumnWidth(
    table,
    columnKey,
    width,
    options
  );
}



  /* =========================================================
     Глобальные обработчики
  ========================================================= */

  function removeGlobalListeners() {
    window.removeEventListener(
      "pointermove",
      handlePointerMove,
      true
    );

    window.removeEventListener(
      "pointerup",
      handlePointerUp,
      true
    );

    window.removeEventListener(
      "pointercancel",
      handlePointerCancel,
      true
    );

    window.removeEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    window.removeEventListener(
      "blur",
      handleWindowBlur,
      true
    );
  }

  /* =========================================================
     Завершение взаимодействия
  ========================================================= */

  function finishResize(
    commit
  ) {
    const state =
      resizeState;

    if (!state) {
      return;
    }

    resizeState = null;

    removeGlobalListeners();

    state.handle.classList.remove(
      "is-active"
    );

    document.body.classList.remove(
      "table-column-resizing"
    );

    if (!commit) {
      setColumnWidth(
        state.table,
        state.colgroup,
        state.columnKey,
        state.startWidth
      );

      return;
    }

    saveWidth(
      state.columnKey,
      state.currentWidth
    );
  }

  /* =========================================================
     Pointer move / up
  ========================================================= */

  function handlePointerMove(
    event
  ) {
    const state =
      resizeState;

    if (!state) {
      return;
    }

    if (
      event.pointerId !==
      state.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const delta =
      event.clientX -
      state.startX;

    state.currentWidth =
      setColumnWidth(
        state.table,
        state.colgroup,
        state.columnKey,
        state.startWidth +
          delta
      );
  }

  function handlePointerUp(
    event
  ) {
    if (!resizeState) {
      return;
    }

    if (
      event.pointerId !==
      resizeState.pointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const state =
      resizeState;

    if (
      state.handle
        .hasPointerCapture?.(
          event.pointerId
        )
    ) {
      state.handle
        .releasePointerCapture(
          event.pointerId
        );
    }

    finishResize(true);
  }

  function handlePointerCancel(
    event
  ) {
    if (!resizeState) {
      return;
    }

    if (
      event.pointerId !==
      resizeState.pointerId
    ) {
      return;
    }

    finishResize(false);
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key !== "Escape" ||
      !resizeState
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    finishResize(false);
  }

  function handleWindowBlur() {
    finishResize(false);
  }

  /* =========================================================
     Начало resize
  ========================================================= */

  function startResize(
    event,
    table,
    colgroup,
    header,
    handle,
    columnIndex
  ) {
    if (
      event.button !== 0 ||
      resizeState
    ) {
      return;
    }

    if (
  window.structureTableOcclusion
    ?.isHeaderCovered?.(
      header
    )
) {
  event.preventDefault();
  event.stopPropagation();
  return;
}

    event.preventDefault();
    event.stopPropagation();

    /*
      Перед изменением ширины фиксируем
      все текущие размеры колонок.
    */

    freezeCurrentWidths(
      table,
      colgroup
    );

    const columnKey =
      getColumnKey(
        header,
        columnIndex
      );

    const column =
      getColumn(
        colgroup,
        columnKey
      );

    if (!column) {
      return;
    }

    const startWidth =
      normalizeWidth(
        getColumnWidth(
          column
        ) ||
        header
          .getBoundingClientRect()
          .width
      );

    resizeState = {
      table,
      colgroup,
      header,
      handle,

      columnIndex,
      columnKey,

      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startWidth,

      currentWidth:
        startWidth,
    };

    handle.classList.add(
      "is-active"
    );

    document.body.classList.add(
      "table-column-resizing"
    );

    handle.setPointerCapture?.(
      event.pointerId
    );

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      true
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp,
      true
    );

    window.addEventListener(
      "pointercancel",
      handlePointerCancel,
      true
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    window.addEventListener(
      "blur",
      handleWindowBlur,
      true
    );
  }

  /* =========================================================
     Ручки изменения ширины
  ========================================================= */

  function appendResizeHandles(
    table,
    colgroup,
    headers
  ) {
    headers.forEach(
      (
        header,
        columnIndex
      ) => {
        header
          .querySelector(
            ":scope > " +
              ".table-column-resize-handle"
          )
          ?.remove();

        const handle =
          document.createElement(
            "span"
          );

        handle.className =
          "table-column-resize-handle";

        handle.dataset
          .columnIndex =
            String(columnIndex);

        handle.setAttribute(
          "aria-hidden",
          "true"
        );

        handle.title =
          "Изменить ширину колонки";

        handle.addEventListener(
          "pointerdown",
          (event) => {
            startResize(
              event,
              table,
              colgroup,
              header,
              handle,
              columnIndex
            );
          }
        );

        header.appendChild(
          handle
        );
      }
    );
  }

  /* =========================================================
     Подключение к таблице
  ========================================================= */

  function mount(table) {
    if (
      !table ||
      !table.matches(
        ".structure-table"
      )
    ) {
      return false;
    }

    /*
      Новый render мог произойти
      во время незавершённого resize.
    */

    if (resizeState) {
      finishResize(false);
    }

    const headers =
      getHeaders(table);

    if (!headers.length) {
      return false;
    }

    const colgroup =
      createColgroup(
        table,
        headers
      );

    appendResizeHandles(
      table,
      colgroup,
      headers
    );

    return true;
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.tableColumnResize = {
    mount,

    cancel() {
      finishResize(false);
    },

    isActive() {
      return !!resizeState;
    },

    getMinimumWidth() {
      return MIN_COLUMN_WIDTH;
    },

    getMaximumWidth() {
  return MAX_COLUMN_WIDTH;
},

    getSavedWidth(
      columnKey
    ) {
      return getSavedWidth(
        columnKey
      );
    },

    getCurrentWidth(
  table,
  columnKey
) {
  return getCurrentColumnWidth(
    table,
    columnKey
  );
},

setWidth(
  table,
  columnKey,
  width,
  options
) {
  return applyColumnWidth(
    table,
    columnKey,
    width,
    options
  );
},

autoFit(
  table,
  columnKey,
  options
) {
  return autoFitColumn(
    table,
    columnKey,
    options
  );
},
  };
})();