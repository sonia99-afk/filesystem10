// schema_active_block.js

(function () {
  if (typeof window === "undefined") {
    return;
  }

  let scheduledFrame = 0;
  let selectionFrame = 0;
  let observer = null;
  let observedTree = null;

  const HORIZONTAL_PADDING = 3;
  const VERTICAL_PADDING = 2;

  function getTree() {
    return document.getElementById(
      "tree"
    );
  }

  function getEditorState() {
  let activeView;
  let hasTreeFocus = false;
  let activeId = null;
  let schemaView;

  try {
    activeView =
      typeof currentView !==
      "undefined"
        ? currentView
        : window.currentView;
  } catch (error) {
    activeView =
      window.currentView;
  }

  try {
    hasTreeFocus =
      typeof treeHasFocus !==
      "undefined"
        ? treeHasFocus
        : window.treeHasFocus;
  } catch (error) {
    hasTreeFocus =
      window.treeHasFocus;
  }

  try {
    activeId =
      typeof selectedId !==
      "undefined"
        ? selectedId
        : window.selectedId;
  } catch (error) {
    activeId =
      window.selectedId;
  }

  try {
    schemaView =
      typeof VIEW !==
      "undefined"
        ? VIEW.SCHEMA
        : window.VIEW?.SCHEMA;
  } catch (error) {
    schemaView =
      window.VIEW?.SCHEMA;
  }

  return {
    activeView,
    hasTreeFocus,
    activeId,
    schemaView,
  };
}

function isSchemaView() {
  const state =
    getEditorState();

  if (
    state.activeView !== undefined
  ) {
    return (
      state.activeView ===
        state.schemaView ||
      state.activeView ===
        window.VIEW?.STRUCTURE_TABLE
    );
  }

  return (
    document.body.classList.contains(
      "view-schema"
    ) ||
    document.body.classList.contains(
      "view-structure-table"
    )
  );
}

  function getInterfaceSettings() {
    return (
      window.viewSettings
        ?.getActiveSettings?.()
        ?.interface ||
      {}
    );
  }

function getExternalElementsState() {
  const settings =
    getInterfaceSettings();

  return {
    enabled:
      settings.showCalloutElement ===
      true,

    mode:
      settings.calloutElementScope ===
      "all"
        ? "all"
        : "one",
  };
}

  function isVisible(element) {
    if (
      !element ||
      !element.getClientRects()
        .length
    ) {
      return false;
    }

    const style =
      getComputedStyle(
        element
      );

    return (
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  /*
    Элементы перед названием идут
    в следующем порядке:

    1. Отметка.
    2. Нумерация.
  */

  function getPrefixElements(row) {
    return [
      row.querySelector(
        ":scope > .mark-dot"
      ),

      row.querySelector(
        ":scope > .ordinal-badge"
      ),
    ].filter(isVisible);
  }

  function getContentStartElement(
    row,
    externalState
  ) {
    const prefixElements =
      getPrefixElements(
        row
      );

    const label =
      row.querySelector(
        ":scope > .label"
      );

    let externalCount = 0;

    if (
      externalState.enabled
    ) {
      externalCount =
        externalState.mode ===
        "one"
          ? Math.min(
              1,
              prefixElements.length
            )
          : prefixElements.length;
    }

    /*
      Выносные элементы выключены:
      externalCount = 0,
      поэтому начало будет от отметки.

      Режим «Один»:
      отметка вынесена,
      начало будет от нумерации.

      Режим «Все»:
      отметка и нумерация вынесены,
      начало будет от названия.
    */

    return (
      prefixElements[
        externalCount
      ] ||
      label ||
      row
    );
  }

  function getDetailBlocks(li) {
    return [
      li.querySelector(
        ":scope > .captions"
      ),

      li.querySelector(
        ":scope > .schema-text-properties"
      ),
    ].filter(isVisible);
  }

  function resetDetailOffsets(
    detailBlocks
  ) {
    detailBlocks.forEach(
      (element) => {
        element.style.marginLeft =
          "0px";
      }
    );
  }

  /*
    Выравниваем описание и текстовые
    свойства у всех объектов, а не только
    у активного.
  */

  function alignAllDetails(
    tree,
    externalState
  ) {
    const rows =
      tree.querySelectorAll(
        ".row[data-id]"
      );

    const items = [];

    rows.forEach(
      (row) => {
        if (
          row.closest(
            ".structure-table"
          )
        ) {
          return;
        }

        const li =
          row.closest("li");

        if (!li) {
          return;
        }

        const detailBlocks =
          getDetailBlocks(
            li
          );

        if (
          !detailBlocks.length
        ) {
          return;
        }

        resetDetailOffsets(
          detailBlocks
        );

        items.push({
          row,
          detailBlocks,
        });
      }
    );

    /*
      Все записи в DOM уже выполнены выше.
      Теперь читаем геометрию одним пакетом,
      чтобы браузер не пересчитывал всю
      структуру отдельно для каждого объекта.
    */

    const measurements =
      items.map(
        ({
          row,
          detailBlocks,
        }) => {
          const startElement =
            getContentStartElement(
              row,
              externalState
            );

          return {
            detailBlocks,
            contentStartLeft:
              startElement
                .getBoundingClientRect()
                .left,

            detailLefts:
              detailBlocks.map(
                (element) =>
                  element
                    .getBoundingClientRect()
                    .left
              ),
          };
        }
      );

    /*
      После чтения геометрии снова только
      записываем стили. Между объектами больше
      нет чередования write -> read.
    */

    measurements.forEach(
      ({
        detailBlocks,
        detailLefts,
        contentStartLeft,
      }) => {
        detailBlocks.forEach(
          (element, index) => {
            const shift =
              Math.max(
                0,
                Math.round(
                  contentStartLeft -
                  detailLefts[index]
                )
              );

            element.style.marginLeft =
              `${shift}px`;
          }
        );
      }
    );
  }

  function removeActiveBlocks(
    tree,
    exceptLi = null
  ) {
    tree
      .querySelectorAll(
        ".schema-active-block"
      )
      .forEach(
        (block) => {
          if (
            exceptLi &&
            block.parentElement ===
              exceptLi
          ) {
            return;
          }

          block.remove();
        }
      );

    tree
      .querySelectorAll(
        ".schema-active-block-owner"
      )
      .forEach(
        (li) => {
          if (li !== exceptLi) {
            li.classList.remove(
              "schema-active-block-owner"
            );
          }
        }
      );
  }

  function createOrGetActiveBlock(
    li,
    row
  ) {
    let block =
      li.querySelector(
        ":scope > .schema-active-block"
      );

    if (!block) {
      block =
        document.createElement(
          "span"
        );

      block.className =
        "schema-active-block";

      block.setAttribute(
        "aria-hidden",
        "true"
      );

      li.insertBefore(
        block,
        row
      );
    }

    li.classList.add(
      "schema-active-block-owner"
    );

    return block;
  }

  function layoutActiveBlock(
    tree,
    externalState
  ) {
const editorState =
  getEditorState();

if (
  !editorState.hasTreeFocus ||
  !editorState.activeId
) {
      removeActiveBlocks(
        tree
      );

      return;
    }

    const escapedId =
      window.CSS?.escape
        ? CSS.escape(
            String(
  editorState.activeId
)
          )
        : String(
            window.selectedId
          ).replace(
            /[^a-zA-Z0-9_-]/g,
            "\\$&"
          );

    const row =
      tree.querySelector(
        `.row[data-id="${escapedId}"]`
      );

    if (
      !row ||
      !isVisible(row)
    ) {
      removeActiveBlocks(
        tree
      );

      return;
    }

    const li =
      row.closest("li");

    if (!li) {
      removeActiveBlocks(
        tree
      );

      return;
    }

    const startElement =
      getContentStartElement(
        row,
        externalState
      );

    const detailBlocks =
      getDetailBlocks(
        li
      );

    const rowRect =
      row.getBoundingClientRect();

    const startRect =
      startElement
        .getBoundingClientRect();

    const liRect =
      li.getBoundingClientRect();

    const detailRects =
      detailBlocks.map(
        (element) =>
          element
            .getBoundingClientRect()
      );

    const left =
      startRect.left;

    const right =
      Math.max(
        rowRect.right,

        ...detailRects.map(
          (rect) =>
            rect.right
        )
      );

    const top =
      rowRect.top;

    const bottom =
      Math.max(
        rowRect.bottom,

        ...detailRects.map(
          (rect) =>
            rect.bottom
        )
      );

    /*
      Старый фон удаляем только после всех
      измерений. Иначе изменение DOM прямо
      перед getBoundingClientRect() само
      провоцирует принудительный reflow.
    */

    removeActiveBlocks(
      tree,
      li
    );

    const block =
      createOrGetActiveBlock(
        li,
        row
      );

    block.style.left =
      `${
        Math.floor(
          left -
          liRect.left
        ) -
        HORIZONTAL_PADDING
      }px`;

    block.style.top =
      `${
        Math.floor(
          top -
          liRect.top
        ) -
        VERTICAL_PADDING
      }px`;

    block.style.width =
      `${
        Math.max(
          0,
          Math.ceil(
            right -
            left
          )
        ) +
        HORIZONTAL_PADDING * 2
      }px`;

    block.style.height =
      `${
        Math.max(
          0,
          Math.ceil(
            bottom -
            top
          )
        ) +
        VERTICAL_PADDING * 2
      }px`;
  }

  function resetAllDetailOffsets(
    tree
  ) {
    tree
      .querySelectorAll(
        [
          ".captions",
          ".schema-text-properties",
        ].join(",")
      )
      .forEach(
        (element) => {
          element.style
            .marginLeft = "";
        }
      );
  }

  function layout() {
    if (scheduledFrame) {
      cancelAnimationFrame(
        scheduledFrame
      );

      scheduledFrame = 0;
    }

    if (selectionFrame) {
      cancelAnimationFrame(
        selectionFrame
      );

      selectionFrame = 0;
    }

    const tree =
      getTree();

    observeTree();

    if (!tree) {
      return;
    }

    if (!isSchemaView()) {
      removeActiveBlocks(
        tree
      );

      resetAllDetailOffsets(
        tree
      );

      return;
    }

    const externalState =
      getExternalElementsState();

    /*
      Сначала выставляем правильные
      отступы описаний и свойств.
      Только после этого измеряем фон.
    */

    alignAllDetails(
      tree,
      externalState
    );

    layoutActiveBlock(
      tree,
      externalState
    );
  }

  /*
    Быстрый путь для ArrowUp / ArrowDown:
    выравнивание всех описаний уже выполнено
    при render(). При смене выбранного объекта
    нужно пересчитать только его серый фон.
  */

  function layoutSelection() {
    if (selectionFrame) {
      cancelAnimationFrame(
        selectionFrame
      );

      selectionFrame = 0;
    }

    if (scheduledFrame) {
      return;
    }

    const tree =
      getTree();

    observeTree();

    if (!tree) {
      return;
    }

    if (!isSchemaView()) {
      removeActiveBlocks(
        tree
      );

      return;
    }

    layoutActiveBlock(
      tree,
      getExternalElementsState()
    );
  }

  function schedule() {
    if (selectionFrame) {
      cancelAnimationFrame(
        selectionFrame
      );

      selectionFrame = 0;
    }

    if (scheduledFrame) {
      return;
    }

    scheduledFrame =
      requestAnimationFrame(
        layout
      );
  }

  function scheduleSelection() {
    if (
      scheduledFrame ||
      selectionFrame
    ) {
      return;
    }

    selectionFrame =
      requestAnimationFrame(
        layoutSelection
      );
  }

  function getChangedClasses(
    mutation
  ) {
    const before =
      new Set(
        String(
          mutation.oldValue || ""
        )
          .split(/\s+/)
          .filter(Boolean)
      );

    const after =
      new Set(
        String(
          mutation.target
            ?.className || ""
        )
          .split(/\s+/)
          .filter(Boolean)
      );

    return new Set(
      [
        ...before,
        ...after,
      ].filter(
        (className) =>
          before.has(className) !==
          after.has(className)
      )
    );
  }

  function isInternalMutation(
    mutation
  ) {
    if (
      mutation.type ===
      "attributes"
    ) {
      const changed =
        getChangedClasses(
          mutation
        );

      return (
        changed.size === 1 &&
        changed.has(
          "schema-active-block-owner"
        )
      );
    }

    if (
      mutation.type !==
      "childList"
    ) {
      return false;
    }

    const changedNodes = [
      ...mutation.addedNodes,
      ...mutation.removedNodes,
    ];

    return (
      changedNodes.length > 0 &&
      changedNodes.every(
        (node) =>
          node.nodeType === 1 &&
          node.classList?.contains(
            "schema-active-block"
          )
      )
    );
  }

  function isSelectionMutation(
    mutation
  ) {
    if (
      mutation.type !==
      "attributes" ||
      !mutation.target
        ?.matches?.(
          ".row[data-id]"
        )
    ) {
      return false;
    }

    const changed =
      getChangedClasses(
        mutation
      );

    return (
      changed.size === 1 &&
      changed.has("sel")
    );
  }

  function handleMutations(
    mutations
  ) {
    const meaningful =
      mutations.filter(
        (mutation) =>
          !isInternalMutation(
            mutation
          )
      );

    if (!meaningful.length) {
      return;
    }

    if (
      meaningful.every(
        isSelectionMutation
      )
    ) {
      scheduleSelection();
      return;
    }

    schedule();
  }

  function observeTree() {
    const tree =
      getTree();

    if (
      !tree ||
      tree === observedTree
    ) {
      return;
    }

    observer?.disconnect();

    observedTree = tree;

    observer =
      new MutationObserver(
        handleMutations
      );

    observer.observe(
      tree,
      {
        childList: true,
        subtree: true,

        attributes: true,
        attributeFilter: [
          "class",
        ],

        attributeOldValue: true,
      }
    );
  }

  function init() {
    observeTree();
    schedule();
  }

  window.addEventListener(
    "resize",
    schedule
  );

  /*
    Скролл не меняет взаимное положение
    фона, строки и блока свойств, поэтому
    отдельный геометрический проход при
    каждом scroll-событии не требуется.

    Охватываем изменение настроек
    интерфейса независимо от того,
    перерисовывает ли их view_settings.
  */

  [
    "view-interface-settings-change",
    "view-settings-change",
    "view-property-settings-change",
  ].forEach(
    (eventName) => {
      window.addEventListener(
        eventName,
        schedule
      );
    }
  );

  window.schemaActiveBlock = {
    layout,
    schedule,
    layoutSelection,
    scheduleSelection,
    updateSelection:
      scheduleSelection,
    alignAll:
      schedule,
  };

  /*
    Временные алиасы для совместимости
    со старым кодом.
  */

  window.layoutSchemaActiveBlock =
    layout;

  window.applyCaptionOrdinalOffsets =
    layout;

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