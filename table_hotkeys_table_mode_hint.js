(function () {
  if (typeof window === "undefined") return;

  const STYLE_ID = "table-hotkeys-table-mode-hint-style";
  const MARK_ATTR = "data-table-mode-disabled";

  /*
    В табличном режиме серыми оставляем только:
    - перемещение объектов по дереву
    - выбор по уровню
    - выбор по ветке

    Мультивыделение НЕ серим.
  */
  const DISABLED_ACTIONS = [
    // Перемещение по дереву
    "moveUp",
    "moveDown",

    // Выбор по уровню
    "levelNavUp",
    "levelNavDown",

    // Выбор по ветке
    "branchNavLeft",
    "branchNavRight",
  ];

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      body.view-table tr.hk-table-mode-disabled > td {
        background: rgba(128, 128, 128, 0.16) !important;
        color: rgba(0, 0, 0, 0.5) !important;
      }

      body.view-table tr.hk-table-mode-disabled > td.hk-table-mode-keep-normal {
        background: inherit !important;
        color: inherit !important;
      }

      body.view-table tr.hk-table-mode-disabled > td * {
        color: inherit !important;
      }

      body.view-table tr.hk-table-mode-disabled td[data-action] {
        color: rgba(0, 0, 0, 0.5) !important;
      }

      body.view-table tr.hk-table-mode-disabled td[${MARK_ATTR}="true"]::after {
        content: "";
      }

      body.view-table tr.hk-table-mode-disabled {
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
  }

  function getActionCell(action) {
    return document.querySelector(`td[data-action="${action}"]`);
  }

  function clearMarks() {
    document.querySelectorAll("tr.hk-table-mode-disabled").forEach((tr) => {
      tr.classList.remove("hk-table-mode-disabled");

      Array.from(tr.children).forEach((td) => {
        td.classList.remove("hk-table-mode-keep-normal");
        td.removeAttribute(MARK_ATTR);
        td.removeAttribute("title");
      });
    });

    document.querySelectorAll(`td[${MARK_ATTR}]`).forEach((td) => {
      td.classList.remove("hk-table-mode-keep-normal");
      td.removeAttribute(MARK_ATTR);
      td.removeAttribute("title");
    });
  }

  function markRow(tr) {
    if (!tr) return;

    tr.classList.add("hk-table-mode-disabled");

    Array.from(tr.children).forEach((td) => {
      td.setAttribute(MARK_ATTR, "true");
      td.title = "Недоступно в табличном режиме";
    });
  }

  function markAction(action) {
    const td = getActionCell(action);
    if (!td) return;

    td.setAttribute(MARK_ATTR, "true");
    td.title = "Недоступно в табличном режиме";

    markRow(td.closest("tr"));
  }

  /*
    В строках moveUp/moveDown часть ячеек общая для секции.
    Оставляем их обычными, как было раньше.
  */
  function unmarkMoveSectionSharedCells() {
    const moveUpCell = getActionCell("moveUp");
    const row = moveUpCell?.closest("tr");
    if (!row) return;

    Array.from(row.children).forEach((td) => {
      const text = (td.textContent || "").trim();

      if (
        text === "Перемещение" ||
        text === "Зажать ЛКМ > Переместить" ||
        text === "нет, не нужно"
      ) {
        td.classList.add("hk-table-mode-keep-normal");
        td.removeAttribute(MARK_ATTR);
        td.removeAttribute("title");
      }
    });
  }

  function applyMarks() {
    clearMarks();

    DISABLED_ACTIONS.forEach(markAction);

    unmarkMoveSectionSharedCells();
  }

  function init() {
    ensureStyle();
    applyMarks();

    const observer = new MutationObserver(() => {
      applyMarks();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();