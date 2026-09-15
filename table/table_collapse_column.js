// table/table_collapse_column.js
// Кнопки сворачивания / разворачивания строк в табличном режиме.
//
// Отвечает за боковую колонку кнопок:
// - [-] если объект раскрыт
// - [+] если объект свернут
//
// Кнопки появляются при наведении на строку таблицы.

(function () {
  if (typeof window === "undefined") return;

  function getNodeById(id) {
    if (!id || typeof findWithParent !== "function") return null;

    return findWithParent(root, id)?.node || null;
  }

  function hasChildren(node) {
    return !!node?.children?.length;
  }

  function isCollapsed(id) {
    return !!window.collapseNodes?.isCollapsed?.(id);
  }

  function clearCollapseButtons(host) {
    host?.querySelectorAll(".table-collapse-col").forEach((el) => {
      el.remove();
    });
  }

  function setButtonVisibilityHandlers(row, button) {
    row.addEventListener("mouseenter", () => {
      button.classList.add("is-visible");
    });

    row.addEventListener("mouseleave", () => {
      if (!button.matches(":hover")) {
        button.classList.remove("is-visible");
      }
    });

    button.addEventListener("mouseleave", () => {
      button.classList.remove("is-visible");
    });
  }

  function makeCollapseButton(id) {
  const button =
    document.createElement(
      "button"
    );

  const collapsed =
    isCollapsed(id);

  button.type =
    "button";

  button.className =
    "table-collapse-col" +
    (
      collapsed
        ? " is-collapsed"
        : ""
    );

  button.dataset.id =
    id;

  window.visibilityControls?.apply(
    button,
    {
      kind:
        collapsed
          ? "expand"
          : "collapse",

      label:
        collapsed
          ? "Развернуть"
          : "Свернуть",

      alwaysVisible:
        collapsed,
    }
  );

  button.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.selectedId =
        id;

      window.treeHasFocus =
        true;

      window.collapseNodes
        ?.toggle?.(
          id
        );
    }
  );

  return button;
}

  function positionButton(
  button,
  row,
  hostBox
) {
  const target =
    row.closest(
      "tr[data-id]"
    ) ||
    row.closest("tr") ||
    row;

  const rowBox =
    target.getBoundingClientRect();

  const buttonHeight =
    button
      .getBoundingClientRect()
      .height || 20;

  const top =
    rowBox.top -
    hostBox.top +
    (
      rowBox.height -
      buttonHeight
    ) / 2;

  button.style.top =
    `${Math.round(top)}px`;
}

  function layoutTableCollapseColumn(host, wrap) {
    if (!host || !wrap) return;

    clearCollapseButtons(host);

    const hostBox = host.getBoundingClientRect();

    wrap.querySelectorAll(".row[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const node = getNodeById(id);

      if (!hasChildren(node)) return;

      const button = makeCollapseButton(id);

      setButtonVisibilityHandlers(
  row,
  button
);

host.appendChild(
  button
);

positionButton(
  button,
  row,
  hostBox
);
    });
  }

  window.tableCollapseColumn = {
    layout: layoutTableCollapseColumn,
    clear: clearCollapseButtons,
  };

  window.layoutTableCollapseColumn = layoutTableCollapseColumn;
})();