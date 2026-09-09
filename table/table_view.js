// table/table_view.js
// Рендер табличного отображения.
//
// Учитывает индивидуальные настройки
// активной вкладки таблицы и скрывает
// отключённые колонки.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  /* =========================================================
     Проверка настройки свойства
  ========================================================= */

  function isViewPropertyEnabled(
    propertyKey
  ) {
    /*
      Название нельзя выключить.
    */

    if (propertyKey === "name") {
      return true;
    }

    const checker =
      window.viewSettings
        ?.isPropertyEnabled;

    /*
      Пока viewSettings не загружен,
      сохраняем прежнее поведение:
      показываем все колонки.
    */

    if (
      typeof checker !==
      "function"
    ) {
      return true;
    }

    return (
      checker.call(
        window.viewSettings,
        propertyKey
      ) !== false
    );
  }

  /* =========================================================
     Соответствие сложных колонок настройкам
  ========================================================= */

  function getColumnSettingKeys(
    column
  ) {
    if (!column) {
      return [];
    }

    /*
  Динамическая колонка конкретного
  экземпляра свойства.

  Например:

  key        = text__abc
  instanceId = text__abc

  Для legacy-таймера:

  key        = timer
  instanceId = timerDuration
*/

if (
  column.instanceId
) {
  return [
    column.instanceId,
  ];
}

/*
  Составные колонки даты/времени
  имеют собственную настройку
  отображения.

  Данные при этом по-прежнему
  читаются из startDate/startTime/
  endDate/endTime.
*/

if (
  column.inputType ===
    "dateRange" ||

  column.inputType ===
    "timeRange" ||

  column.inputType ===
    "dateTimePair" ||

  column.inputType ===
    "dateTimeRangePair"
) {
  return column.key
    ? [column.key]
    : [];
}

    /*
      Обе таймерные колонки используют
      внутри данных один ключ "timer",
      но в панели у них отдельные настройки.
    */

    if (
      column.inputType ===
      "timerDuration"
    ) {
      return [
        "timerDuration",
      ];
    }

    if (
      column.inputType ===
      "timerRemaining"
    ) {
      return [
        "timerRemaining",
      ];
    }

    /*
      Для остальных колонок ключ таблицы
      совпадает с ключом настройки.
    */

    return column.key
      ? [column.key]
      : [];
  }

  /* =========================================================
     Полная схема колонок таблицы
  ========================================================= */

  function getTableColumnDescriptors() {
    const propertyColumns =
      typeof window
        .getAllTablePropertyColumns ===
      "function"
        ? window
            .getAllTablePropertyColumns()
        : [];

    return [
      /*
        ID пока остаётся служебной
        постоянно видимой колонкой.
      */

     {
  title: "ID",

  settingKeys: [
    "id",
  ],
},

      {
        title: "Отметка",
        settingKeys: [
          "marks",
        ],
      },

      {
        title: "Нумерация",
        settingKeys: [
          "ordinals",
        ],
      },

      {
        title: "Иконка",
        settingKeys: [
          "icon",
        ],
      },

      {
        title: "Обложка",
        settingKeys: [
          "cover",
        ],
      },

      /*
        Уровень пока остаётся служебной
        постоянно видимой колонкой.
      */

      {
  title: "Уровень",

  settingKeys: [
    "level",
  ],
},

      {
        title: "Название",
        settingKeys: [
          "name",
        ],
        alwaysVisible: true,
      },

      {
        title: "Описание",
        settingKeys: [
          "captions",
        ],
      },

      /*
        Остальные колонки берём из
        существующей конфигурации таблицы.
      */

      ...propertyColumns.map(
        (column) => {
          return {
            title:
              column.title || "",

            column,

            settingKeys:
              getColumnSettingKeys(
                column
              ),
          };
        }
      ),
    ];
  }

  /* =========================================================
     Видимость одной колонки
  ========================================================= */

  function isColumnVisible(
    descriptor
  ) {
    if (
      descriptor
        ?.alwaysVisible
    ) {
      return true;
    }

    const settingKeys =
      Array.isArray(
        descriptor?.settingKeys
      )
        ? descriptor.settingKeys
        : [];

    /*
      Колонка без связанной настройки
      остаётся видимой.
    */

    if (!settingKeys.length) {
      return true;
    }

    /*
      Для составной колонки должны быть
      включены все необходимые свойства.

      Например, колонка диапазона дат
      исчезнет, если отключена хотя бы
      одна из двух дат.
    */

    return settingKeys.every(
      (key) =>
        isViewPropertyEnabled(
          key
        )
    );
  }


  /* =========================================================
   Стабильный ключ ширины колонки
========================================================= */

function getTableColumnWidthKey(
  descriptor,
  descriptorIndex
) {

    const explicitKey =
    String(
      descriptor?.tableColumnKey ||
      ""
    );

  if (explicitKey) {
    return explicitKey;
  }
  const column =
    descriptor?.column;

    /*
  Для экземпляра свойства ключ ширины
  и порядка должен быть уникальным.
*/

if (
  column?.instanceId
) {
  return (
    "property:" +
    column.instanceId
  );
}

  /*
    Обе таймерные колонки используют
    один внутренний key "timer",
    поэтому разделяем их вручную.
  */

  if (
    column?.inputType ===
    "timerDuration"
  ) {
    return "property:timerDuration";
  }

  if (
    column?.inputType ===
    "timerRemaining"
  ) {
    return "property:timerRemaining";
  }

  if (column?.key) {
    return (
      "property:" +
      column.key
    );
  }

  const settingKeys =
    Array.isArray(
      descriptor?.settingKeys
    )
      ? descriptor.settingKeys
      : [];

  if (settingKeys.length) {
    return (
      "setting:" +
      settingKeys.join("|")
    );
  }

  /*
    Для системных колонок:
    ID и Уровень.
  */

  const title =
    String(
      descriptor?.title || ""
    )
      .trim()
      .toLowerCase();

  return (
    "system:" +
    (
      title ||
      descriptorIndex
    )
  );
}

/* =========================================================
   Проектное название колонки
========================================================= */

function getTableColumnPropertyKey(
  descriptor
) {
  const column =
    descriptor?.column;

  /*
    У двух таймерных столбцов один
    внутренний ключ данных "timer",
    но разные проектные свойства.
  */

  if (
    column?.inputType ===
    "timerDuration"
  ) {
    return "timerDuration";
  }

  if (
    column?.inputType ===
    "timerRemaining"
  ) {
    return "timerRemaining";
  }

  if (column?.key) {
    return column.key;
  }

  const settingKeys =
    Array.isArray(
      descriptor?.settingKeys
    )
      ? descriptor.settingKeys
      : [];

  /*
    Один заголовок можно связать
    с одним проектным названием.

    Для составного набора из нескольких
    исходных свойств оставляем title
    самого дескриптора.
  */

  if (
    settingKeys.length === 1
  ) {
    return settingKeys[0];
  }

  return "";
}

function getTableColumnDisplayTitle(
  descriptor
) {
  const propertyKey =
    getTableColumnPropertyKey(
      descriptor
    );

  if (propertyKey) {
    const projectTitle =
      window.projectProperties
        ?.getTitle?.(
          propertyKey
        );

    if (projectTitle) {
      return projectTitle;
    }
  }

  return (
    descriptor?.title ||
    ""
  );
}
  /* =========================================================
     Шапка таблицы
  ========================================================= */

  function buildTableHead(
    descriptors
  ) {
    const thead =
      document.createElement(
        "thead"
      );

    const row =
      document.createElement(
        "tr"
      );

descriptors.forEach(
  (
    descriptor,
    descriptorIndex
  ) => {
        if (
          !isColumnVisible(
            descriptor
          )
        ) {
          return;
        }

        const th =
          document.createElement(
            "th"
          );

th.dataset
  .tableColumnKey =
    getTableColumnWidthKey(
      descriptor,
      descriptorIndex
    );



const headerLabel =
  document.createElement(
    "span"
  );

headerLabel.className =
  "table-column-header-label";

headerLabel.textContent =
  getTableColumnDisplayTitle(
    descriptor
  );

th.appendChild(
  headerLabel
);

row.appendChild(th);
      }
    );

    thead.appendChild(row);

    return thead;
  }

  /* =========================================================
     Удаление отключённых ячеек из строки
  ========================================================= */

  function removeHiddenCellsFromRow(
    row,
    descriptors
  ) {
    if (!row) {
      return;
    }

    /*
      Идём справа налево.

      Так удаление одной ячейки
      не изменит индексы ячеек,
      которые ещё нужно проверить.
    */

    for (
      let index =
        descriptors.length - 1;

      index >= 0;

      index -= 1
    ) {
      const descriptor =
        descriptors[index];

      if (
        isColumnVisible(
          descriptor
        )
      ) {
        continue;
      }

      row.children[index]
        ?.remove();
    }
  }

  function applyTableTextInterfaceSettings(
  table
) {
  if (!table) {
    return;
  }

  const interfaceSettings =
    window.viewSettings
      ?.getActiveSettings?.()
      ?.interface || {};

  const autoHeight =
    interfaceSettings
      .autoTextCellHeight === true;

  const wrapText =
    autoHeight &&
    interfaceSettings
      .wrapTextByCellWidth === true;

  const verticalAlign =
  [
    "top",
    "middle",
    "bottom",
  ].includes(
    interfaceSettings
      .tableVerticalAlign
  )
    ? interfaceSettings
        .tableVerticalAlign
    : "middle";

  table.classList.toggle(
    "auto-text-cell-height",
    autoHeight
  );

  table.classList.toggle(
    "wrap-text-by-cell-width",
    wrapText
  );

  table.classList.remove(
  "table-vertical-align-top",
  "table-vertical-align-middle",
  "table-vertical-align-bottom"
);

table.classList.add(
  `table-vertical-align-${
    verticalAlign
  }`
);
}

  /* =========================================================
     Рендер таблицы
  ========================================================= */

  window.renderTableView =
    function renderTableView() {
      syncProjectsSidebar();

      const host =
        document.getElementById(
          "tree"
        );

      if (!host) {
        return;
      }

      const wrap =
        document.createElement(
          "div"
        );

      wrap.className =
        "table-view";

      const table =
        document.createElement(
          "table"
        );

      table.className =
        "structure-table";

        applyTableTextInterfaceSettings(
          table
        );

      /*
        Единая схема нужна одновременно
        для шапки и для строк таблицы.
      */

      const descriptors =
        getTableColumnDescriptors();

      table.appendChild(
        buildTableHead(
          descriptors
        )
      );

      const tbody =
        document.createElement(
          "tbody"
        );

      const displayRoot =
        window.objectFocus
          ?.getFocusedRootNode?.() ||
        root;

      const displayRootOrdinalPath =
        window.objectFocus
          ?.getFocusedRootOrdinalPath?.() ||
        [];

      const rows =
        flattenTableRows(
          displayRoot,
          displayRootOrdinalPath
        );

      rows.forEach(
        (item) => {
          /*
            renderTableRow по-прежнему
            создаёт полную строку.

            После этого удаляем из неё
            ячейки отключённых колонок.
          */

          const row =
            renderTableRow(
              item.node,
              item.ordinalPath
            );

          removeHiddenCellsFromRow(
            row,
            descriptors
          );

          tbody.appendChild(row);
        }
      );

      table.appendChild(tbody);
      wrap.appendChild(table);

      /*
        Сохраняем прежнюю защиту
        от резкого изменения ширины
        во время перестроения таблицы.
      */

      const oldMinWidth =
        host.style.minWidth;

      const oldScrollWidth =
        host.scrollWidth;

      if (oldScrollWidth) {
        host.style.minWidth =
          `${oldScrollWidth}px`;
      }

      host.replaceChildren(
        wrap
      );

      /*
  Таблица уже вставлена в DOM.

  Теперь можно измерить реальную ширину
  заголовков и добавить ручки расширения.
*/

window.tableColumnResize
  ?.mount?.(
    table
  );

  window.tableColumnReorder
  ?.mount?.(
    table
  );

      requestAnimationFrame(
        () => {
          host.style.minWidth =
            oldMinWidth;
        }
      );

      layoutTableCollapseColumn(
        host,
        wrap
      );

      ensureTableCellTabNavigation();
      ensureTableTimerCellsEnterHotkey();
      ensureTableUploadCellsEnterHotkey();

      if (treeHasFocus) {
        const selectedRow =
          host.querySelector(
            `.row[data-id="${cssEscape(
              selectedId
            )}"]`
          );

        selectedRow?.focus({
          preventScroll: true,
        });
      }

      updateTableDescendantRowHighlights();

      requestAnimationFrame(
        () => {
          updateTableDescendantRowHighlights();

          ensureTableDescendantHighlightWatcher();
        }
      );
    };

    /*
  Публичные части табличного рендера.

  Объединённый вид использует эти же функции,
  поэтому схема колонок, настройки ширины
  и заголовки не дублируются.
*/

window.tableViewRenderer = {
  getColumnDescriptors:
    getTableColumnDescriptors,

  isColumnVisible,

  getColumnWidthKey:
    getTableColumnWidthKey,

  getColumnPropertyKey:
    getTableColumnPropertyKey,

  getColumnDisplayTitle:
    getTableColumnDisplayTitle,

  buildHead:
    buildTableHead,

  removeHiddenCells:
    removeHiddenCellsFromRow,

  applyTextSettings:
    applyTableTextInterfaceSettings,
};

  /* =========================================================
     Мгновенное обновление после тумблера
  ========================================================= */

  if (
    !window
      .__tableViewPropertySettingsBound
  ) {
    window
      .__tableViewPropertySettingsBound =
        true;

    window.addEventListener(
      "view-property-settings-change",
      (event) => {

        const property =
  event.detail
    ?.property || "";

/*
  Заголовки уровней — это настройка интерфейса,
  а не колонка таблицы.

  level_headers.js сам выполняет рендер
  и монтирует строку N/A. Повторный рендер
  таблицы здесь удалял эту строку.
*/

if (
  property ===
  "levelHeaders"
) {
  return;
}
        /*
          В другом отображении таблицу
          перестраивать не нужно.
        */

        if (
          String(
            window.currentView || ""
          ) !== "table"
        ) {
          return;
        }

        const changedItemId =
          event.detail
            ?.itemId || "";

        const activeItemId =
          window.viewSettings
            ?.getActiveItem?.()
            ?.id || "";

        /*
          Защита на случай, если событие
          относится уже к другой вкладке.
        */

        if (
          changedItemId &&
          activeItemId &&
          changedItemId !==
            activeItemId
        ) {
          return;
        }

        requestAnimationFrame(
          () => {
            window
              .renderTableView
              ?.();
          }
        );
      }
    );
  }

  if (
  !window
    .__tableTextInterfaceSettingsBound
) {
  window
    .__tableTextInterfaceSettingsBound =
      true;

  window.addEventListener(
    "view-interface-settings-change",
    (event) => {
      const setting =
        event.detail
          ?.setting || "";

      if (
  setting !==
    "autoTextCellHeight" &&
  setting !==
    "wrapTextByCellWidth" &&
  setting !==
    "tableVerticalAlign"
) {
  return;
}

      if (
        String(
          window.currentView || ""
        ) !== "table"
      ) {
        return;
      }

      const table =
        document.querySelector(
          "#tree .structure-table"
        );

      applyTableTextInterfaceSettings(
        table
      );
    }
  );
}
})();