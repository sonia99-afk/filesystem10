// table/table_column_reorder.js
//
// Перемещение колонок таблицы.
//
// Особенности:
//
// - перетаскивание запускается за заголовок;
// - resize-handle не запускает перемещение;
// - используется одна линия на всю высоту таблицы;
// - линия стоит на единой границе соседних колонок;
// - положение меняется после пересечения центра заголовка;
// - перемещаются th, td и col;
// - порядок сохраняется отдельно для вкладки таблицы.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const DRAG_THRESHOLD = 6;

  let dragState = null;
  let lastDragEndedAt = 0;

  /* =========================================================
     Активная вкладка таблицы
  ========================================================= */

  function getActiveTableItem() {
    const directItem =
      window.viewSettings
        ?.getActiveItem?.();

    if (
  directItem &&
  (
    directItem.kind === "table" ||
    directItem.kind === "structure-table"
  )
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

    const item =
      state.items.find(
        (candidate) => {
          return (
            candidate.id ===
            state.activeId
          );
        }
      ) ||
      state.items[0] ||
      null;

    return (
  item &&
  (
    item.kind === "table" ||
    item.kind === "structure-table"
  )
    ? item
    : null
);
  }

  /* =========================================================
     Хранилище порядка
  ========================================================= */

  function ensureOrderStore() {
    const item =
      getActiveTableItem();

    if (!item) {
      return {
        item: null,
        order: [],
      };
    }

    if (
      !item.settings ||
      typeof item.settings !==
        "object"
    ) {
      item.settings = {};
    }

    if (
      !Array.isArray(
        item.settings
          .tableColumnOrder
      )
    ) {
      item.settings
        .tableColumnOrder = [];
    }

    return {
      item,

      order:
        item.settings
          .tableColumnOrder,
    };
  }

  function getStoredOrder() {
    const {
      order,
    } = ensureOrderStore();

    return Array.isArray(order)
      ? [...order]
      : [];
  }

  /*
    Когда часть колонок скрыта, не удаляем
    их ключи из сохранённого порядка.

    Мы заменяем только видимые позиции,
    а скрытые сохраняем для будущего показа.
  */

  function mergeVisibleOrderIntoStored(
    storedOrder,
    visibleOrder
  ) {
    const cleanVisible =
      Array.from(
        new Set(
          visibleOrder.filter(
            Boolean
          )
        )
      );

    if (!storedOrder.length) {
      return cleanVisible;
    }

    const visibleSet =
      new Set(cleanVisible);

    const result = [];

    let visibleIndex = 0;

    storedOrder.forEach(
      (columnKey) => {
        if (
          visibleSet.has(
            columnKey
          )
        ) {
          const replacement =
            cleanVisible[
              visibleIndex
            ];

          visibleIndex += 1;

          if (
            replacement &&
            !result.includes(
              replacement
            )
          ) {
            result.push(
              replacement
            );
          }

          return;
        }

        if (
          columnKey &&
          !result.includes(
            columnKey
          )
        ) {
          result.push(
            columnKey
          );
        }
      }
    );

    while (
      visibleIndex <
      cleanVisible.length
    ) {
      const columnKey =
        cleanVisible[
          visibleIndex
        ];

      visibleIndex += 1;

      if (
        columnKey &&
        !result.includes(
          columnKey
        )
      ) {
        result.push(
          columnKey
        );
      }
    }

    return result;
  }

  function saveSchemaTextPropertyOrder(
    columnOrder
  ) {
    const state =
      window.viewTabs
        ?.normalizeState?.() ||
      window.viewTabsState;

    if (
      !state ||
      !Array.isArray(columnOrder)
    ) {
      return;
    }

    const textPropertyOrder = [];

    columnOrder.forEach(
      (columnKey) => {
        const value =
          String(columnKey || "");

        if (
          !value.startsWith(
            "property:"
          )
        ) {
          return;
        }

        const propertyId =
          value.slice(
            "property:".length
          );

        const instance =
          window.projectProperties
            ?.getInstance?.(
              propertyId
            );

        /*
          Сохраняем только дополнительные
          свойства типа text.
          Описание здесь не участвует.
        */

        if (
          instance?.type !== "text"
        ) {
          return;
        }

        if (
          !textPropertyOrder.includes(
            propertyId
          )
        ) {
          textPropertyOrder.push(
            propertyId
          );
        }
      }
    );

    state.schemaTextPropertyOrder =
      textPropertyOrder;
  }

    function saveVisibleOrder(
    visibleOrder
  ) {
    const {
      item,
      order: storedOrder,
    } = ensureOrderStore();

    if (!item) {
      return false;
    }

       item.settings
      .tableColumnOrder =
        mergeVisibleOrderIntoStored(
          storedOrder,
          visibleOrder
        );

    /*
      Передаём порядок текстовых столбцов
      режиму «Структура».
    */

    saveSchemaTextPropertyOrder(
      item.settings
        .tableColumnOrder
    );

    window.projectAutosave
      ?.saveNow?.();

    /*
      Сообщаем панели свойств,
      что порядок колонок изменился.
    */

    window.dispatchEvent(
      new CustomEvent(
        "table-column-order-change",
        {
          detail: {
            itemId:
              item.id || "",

            order: [
              ...item.settings
                .tableColumnOrder,
            ],
          },
        }
      )
    );

    return true;
  }

  /* =========================================================
     Ключи колонок
  ========================================================= */

  function fallbackColumnKey(
    header,
    columnIndex
  ) {
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

  /*
    Основные ключи уже создаются модулем resize.

    На случай отсутствующего data-атрибута
    берём ключ соответствующего col.
  */

  function ensureHeaderKeys(
    table
  ) {
    const headers =
      getHeaders(table);

    const columns =
      getColumns(table);

    headers.forEach(
      (
        header,
        columnIndex
      ) => {
        if (
          header.dataset
            .tableColumnKey
        ) {
          return;
        }

        const columnKey =
          columns[columnIndex]
            ?.dataset
            ?.tableColumnKey ||
          fallbackColumnKey(
            header,
            columnIndex
          );

        header.dataset
          .tableColumnKey =
            columnKey;
      }
    );

    return headers;
  }

  function getHeaderKey(
    header
  ) {
    return (
      header?.dataset
        ?.tableColumnKey ||
      ""
    );
  }

  /* =========================================================
     DOM таблицы
  ========================================================= */

  function getHeaderRow(
    table
  ) {
    return (
      table?.tHead
        ?.rows?.[0] ||
      null
    );
  }

  function getHeaders(
    table
  ) {
    const row =
      getHeaderRow(table);

    if (!row) {
      return [];
    }

    return Array.from(
      row.children
    ).filter(
      (element) =>
        element.tagName === "TH"
    );
  }

  function getColumnGroup(
    table
  ) {
    return (
      table.querySelector(
        ":scope > " +
        "colgroup.table-column-widths"
      ) ||
      table.querySelector(
        ":scope > colgroup"
      )
    );
  }

  function getColumns(
    table
  ) {
    const colgroup =
      getColumnGroup(table);

    if (!colgroup) {
      return [];
    }

    return Array.from(
      colgroup.children
    ).filter(
      (element) =>
        element.tagName === "COL"
    );
  }

  function getBodyRows(
    table
  ) {
    return Array.from(
      table.tBodies || []
    ).flatMap(
      (tbody) =>
        Array.from(
          tbody.rows || []
        )
    );
  }

  function getCurrentKeys(
    table
  ) {
    return getHeaders(table)
      .map(getHeaderKey)
      .filter(Boolean);
  }

  /* =========================================================
     Объединение сохранённого и текущего порядка
  ========================================================= */

  function mergeOrder(
    requestedOrder,
    currentKeys
  ) {
    const currentSet =
      new Set(currentKeys);

    const result = [];

    requestedOrder.forEach(
      (columnKey) => {
        if (
          currentSet.has(
            columnKey
          ) &&
          !result.includes(
            columnKey
          )
        ) {
          result.push(
            columnKey
          );
        }
      }
    );

    currentKeys.forEach(
      (columnKey) => {
        if (
          !result.includes(
            columnKey
          )
        ) {
          result.push(
            columnKey
          );
        }
      }
    );

    return result;
  }

  function arraysEqual(
    left,
    right
  ) {
    return (
      left.length ===
        right.length &&
      left.every(
        (
          value,
          index
        ) =>
          value ===
          right[index]
      )
    );
  }

  /* =========================================================
     Физическое перемещение DOM-колонок
  ========================================================= */

  function reorderTableDom(
    table,
    requestedOrder
  ) {
    const headerRow =
      getHeaderRow(table);

    if (!headerRow) {
      return [];
    }

    const headers =
      getHeaders(table);

    const currentKeys =
      headers
        .map(getHeaderKey);

    if (
      currentKeys.some(
        (columnKey) =>
          !columnKey
      )
    ) {
      return currentKeys;
    }

    const finalOrder =
      mergeOrder(
        requestedOrder,
        currentKeys
      );

    if (
      arraysEqual(
        finalOrder,
        currentKeys
      )
    ) {
      return finalOrder;
    }

    /*
      Карты создаются до перемещения,
      пока все индексы строк совпадают
      с текущим порядком заголовков.
    */

    const headerByKey =
      new Map();

    headers.forEach(
      (
        header,
        columnIndex
      ) => {
        headerByKey.set(
          currentKeys[
            columnIndex
          ],
          header
        );
      }
    );

    const bodyRows =
      getBodyRows(table);

    const cellsByRow =
      bodyRows.map(
        (row) => {
          const map =
            new Map();

          const cells =
            Array.from(
              row.children
            );

          currentKeys.forEach(
            (
              columnKey,
              columnIndex
            ) => {
              const cell =
                cells[
                  columnIndex
                ];

              if (cell) {
                map.set(
                  columnKey,
                  cell
                );
              }
            }
          );

          return {
            row,
            map,
          };
        }
      );

    const colgroup =
      getColumnGroup(table);

    const columns =
      getColumns(table);

    const columnByKey =
      new Map();

    columns.forEach(
      (
        column,
        columnIndex
      ) => {
        const columnKey =
          column.dataset
            .tableColumnKey ||
          currentKeys[
            columnIndex
          ];

        if (columnKey) {
          column.dataset
            .tableColumnKey =
              columnKey;

          columnByKey.set(
            columnKey,
            column
          );
        }
      }
    );

    /*
      appendChild существующего элемента
      не копирует его, а перемещает.
    */

    finalOrder.forEach(
      (columnKey) => {
        const header =
          headerByKey.get(
            columnKey
          );

        if (header) {
          headerRow.appendChild(
            header
          );
        }
      }
    );

    if (colgroup) {
      finalOrder.forEach(
        (columnKey) => {
          const column =
            columnByKey.get(
              columnKey
            );

          if (column) {
            colgroup.appendChild(
              column
            );
          }
        }
      );
    }

    cellsByRow.forEach(
      ({
        row,
        map,
      }) => {
        finalOrder.forEach(
          (columnKey) => {
            const cell =
              map.get(
                columnKey
              );

            if (cell) {
              row.appendChild(
                cell
              );
            }
          }
        );
      }
    );

    return finalOrder;
  }

  /* =========================================================
     Расчёт позиции вставки
  ========================================================= */

  /*
    Позиции вставки:

    0 — перед первой колонкой;
    1 — между первой и второй;
    ...
    N — после последней.

    Переход на следующую позицию происходит
    после пересечения центра очередного th.
  */

  function getDropSlot(
    headers,
    clientX
  ) {
    let slot = 0;

    headers.forEach(
      (header) => {
        const rect =
          header
            .getBoundingClientRect();

        const center =
          rect.left +
          rect.width / 2;

        if (
          clientX >= center
        ) {
          slot += 1;
        }
      }
    );

    return Math.max(
      0,
      Math.min(
        headers.length,
        slot
      )
    );
  }

  /*
    Для внутренних границ берём среднее:

    - правой границы левой колонки;
    - левой границы правой колонки.

    Поэтому индикатор не прыгает между
    двумя почти одинаковыми координатами.
  */

  function getBoundaryX(
    headers,
    slot
  ) {
    if (!headers.length) {
      return 0;
    }

    if (slot <= 0) {
      return headers[0]
        .getBoundingClientRect()
        .left;
    }

    if (
      slot >=
      headers.length
    ) {
      return headers[
        headers.length - 1
      ]
        .getBoundingClientRect()
        .right;
    }

    const leftRect =
      headers[
        slot - 1
      ]
        .getBoundingClientRect();

    const rightRect =
      headers[
        slot
      ]
        .getBoundingClientRect();

    return (
      leftRect.right +
      rightRect.left
    ) / 2;
  }

  /* =========================================================
     Индикатор
  ========================================================= */

  function createIndicator(
    table
  ) {
    const wrap =
      table.closest(
        ".table-view"
      ) ||
      table.parentElement;

    if (!wrap) {
      return null;
    }

    wrap
      .querySelector(
        ":scope > " +
        ".table-column-drop-indicator"
      )
      ?.remove();

    const indicator =
      document.createElement(
        "div"
      );

    indicator.className =
      "table-column-drop-indicator";

    indicator.setAttribute(
      "aria-hidden",
      "true"
    );

    wrap.appendChild(
      indicator
    );

    return indicator;
  }

  function hideIndicator(
    indicator
  ) {
    if (!indicator) {
      return;
    }

    indicator.classList.remove(
      "is-visible"
    );

    indicator.style.height =
      "0px";
  }

  function positionIndicator(
    table,
    indicator,
    boundaryX
  ) {
    if (
      !table ||
      !indicator
    ) {
      return;
    }

    const wrap =
      indicator.parentElement;

    if (!wrap) {
      return;
    }

    const wrapRect =
      wrap.getBoundingClientRect();

    const tableRect =
      table.getBoundingClientRect();

    const left =
      boundaryX -
      wrapRect.left +
      wrap.scrollLeft;

    const top =
      tableRect.top -
      wrapRect.top +
      wrap.scrollTop;

    indicator.style.left =
      `${Math.round(left)}px`;

    indicator.style.top =
      `${Math.round(top)}px`;

    indicator.style.height =
      `${Math.ceil(
        tableRect.height
      )}px`;

    indicator.classList.add(
      "is-visible"
    );
  }

  /* =========================================================
     Новый порядок после отпускания
  ========================================================= */

  function buildMovedOrder(
    currentKeys,
    sourceKey,
    dropSlot
  ) {
    const sourceIndex =
      currentKeys.indexOf(
        sourceKey
      );

    if (sourceIndex < 0) {
      return currentKeys;
    }

    const withoutSource =
      currentKeys.filter(
        (columnKey) =>
          columnKey !==
          sourceKey
      );

    let insertIndex =
      dropSlot;

    /*
      После удаления исходной колонки
      позиции справа сдвигаются на одну.
    */

    if (
      dropSlot >
      sourceIndex
    ) {
      insertIndex -= 1;
    }

    insertIndex =
      Math.max(
        0,
        Math.min(
          withoutSource.length,
          insertIndex
        )
      );

    withoutSource.splice(
      insertIndex,
      0,
      sourceKey
    );

    return withoutSource;
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

  function clearDragVisuals(
    state
  ) {
    state?.header
      ?.classList
      ?.remove(
        "table-column-dragging"
      );

    document.body.classList.remove(
      "table-column-reordering"
    );

    hideIndicator(
      state?.indicator
    );
  }

  function finishDrag(
    commit
  ) {
    const state =
      dragState;

    if (!state) {
      return;
    }

    /*
  Запоминаем только настоящий drag.

  Обычный pointerdown без движения
  остаётся обычным кликом.
*/

if (state.started) {
  lastDragEndedAt =
    performance.now();
}

    dragState = null;

    removeGlobalListeners();

    if (
      state.header
        ?.hasPointerCapture?.(
          state.pointerId
        )
    ) {
      state.header
        .releasePointerCapture(
          state.pointerId
        );
    }

    clearDragVisuals(
      state
    );

    if (
      !commit ||
      !state.started ||
      state.dropSlot === null
    ) {
      return;
    }

    const currentKeys =
      getCurrentKeys(
        state.table
      );

    const nextOrder =
      buildMovedOrder(
        currentKeys,
        state.sourceKey,
        state.dropSlot
      );

    if (
      arraysEqual(
        nextOrder,
        currentKeys
      )
    ) {
      return;
    }

    const appliedOrder =
      reorderTableDom(
        state.table,
        nextOrder
      );

    saveVisibleOrder(
      appliedOrder
    );
  }

  function handlePointerMove(
    event
  ) {
    const state =
      dragState;

    if (!state) {
      return;
    }

    if (
      event.pointerId !==
      state.pointerId
    ) {
      return;
    }

    const distance =
      Math.hypot(
        event.clientX -
          state.startX,

        event.clientY -
          state.startY
      );

    if (
      !state.started &&
      distance <
        DRAG_THRESHOLD
    ) {
      return;
    }

    if (!state.started) {
      state.started = true;

      state.header.classList.add(
        "table-column-dragging"
      );

      document.body.classList.add(
        "table-column-reordering"
      );
    }

    event.preventDefault();
    event.stopPropagation();

    const headers =
      getHeaders(
        state.table
      );

    if (!headers.length) {
      return;
    }

    const dropSlot =
      getDropSlot(
        headers,
        event.clientX
      );

      if (
  window.structureTableOcclusion
    ?.canUseDropSlot?.(
      headers,
      dropSlot,
      event.clientX
    ) === false
) {
  state.dropSlot = null;

  hideIndicator(
    state.indicator
  );

  return;
}

    state.dropSlot =
      dropSlot;

    const boundaryX =
      getBoundaryX(
        headers,
        dropSlot
      );

    positionIndicator(
      state.table,
      state.indicator,
      boundaryX
    );
  }

  function handlePointerUp(
    event
  ) {
    if (
      !dragState ||
      event.pointerId !==
        dragState.pointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    finishDrag(true);
  }

  function handlePointerCancel(
    event
  ) {
    if (
      !dragState ||
      event.pointerId !==
        dragState.pointerId
    ) {
      return;
    }

    finishDrag(false);
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key !== "Escape" ||
      !dragState
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    finishDrag(false);
  }

  function handleWindowBlur() {
    finishDrag(false);
  }

  /* =========================================================
     Начало перетаскивания
  ========================================================= */

  function startDrag(
    event,
    table,
    header,
    indicator
  ) {
    if (
      event.button !== 0 ||
      dragState
    ) {
      return;
    }

    /*
      Ручка изменения ширины не должна
      запускать перемещение столбца.
    */

    if (
      event.target.closest(
        ".table-column-resize-handle"
      )
    ) {
      return;
    }

    /*
      На случай будущего редактора заголовка.
    */

    if (
      event.target.closest(
        "input, textarea, select, button, [contenteditable='true']"
      )
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

    const sourceKey =
      getHeaderKey(
        header
      );

    if (!sourceKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragState = {
      table,
      header,
      indicator,

      sourceKey,

      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      started: false,

      dropSlot: null,
    };

    header.setPointerCapture?.(
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
     Mount
  ========================================================= */

  function mount(
    table
  ) {
    if (
      !table ||
      !table.matches(
        ".structure-table"
      )
    ) {
      return false;
    }

    /*
      Если mount вызван повторно для той же
      таблицы, снимаем прежние обработчики.
    */

    table
      .__tableColumnReorderCleanup
      ?.();

    if (dragState) {
      finishDrag(false);
    }

    ensureHeaderKeys(
      table
    );

    const storedOrder =
      getStoredOrder();

    if (storedOrder.length) {
      reorderTableDom(
        table,
        storedOrder
      );
    }

    const headers =
      getHeaders(table);

    if (!headers.length) {
      return false;
    }

    const indicator =
      createIndicator(
        table
      );

    if (!indicator) {
      return false;
    }

    const cleanups = [];

    headers.forEach(
      (header) => {
        const handlePointerDown =
          (event) => {
            startDrag(
              event,
              table,
              header,
              indicator
            );
          };

        header.addEventListener(
          "pointerdown",
          handlePointerDown
        );

        cleanups.push(
          () => {
            header.removeEventListener(
              "pointerdown",
              handlePointerDown
            );
          }
        );
      }
    );

    table
      .__tableColumnReorderCleanup =
        () => {
          cleanups.forEach(
            (cleanup) =>
              cleanup()
          );

          if (
            dragState?.table ===
            table
          ) {
            finishDrag(false);
          }

          indicator.remove();

          delete table
            .__tableColumnReorderCleanup;
        };

    table.classList.add(
      "table-column-reorder-active"
    );

    return true;
  }

  /* =========================================================
     Public API
  ========================================================= */

  window.tableColumnReorder = {
    mount,

    cancel() {
      finishDrag(false);
    },

    isActive() {
      return !!dragState;
    },

    wasRecentlyDragged(
  maxAge = 250
) {
  return (
    performance.now() -
      lastDragEndedAt <=
    maxAge
  );
},

    getStoredOrder,

    applyStoredOrder(
      table
    ) {
      if (!table) {
        return [];
      }

      ensureHeaderKeys(
        table
      );

      return reorderTableDom(
        table,
        getStoredOrder()
      );
    },
  };
})();