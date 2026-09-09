// property_delete.js

(function () {
  if (typeof window === "undefined") {
    return;
  }

  const global = window;

  let pendingKey = "";

  function walkNodes(node, callback) {
    if (!node) {
      return;
    }

    callback(node);

    (node.children || []).forEach(
      (child) => {
        walkNodes(
          child,
          callback
        );
      }
    );
  }

  function clearPropertyData(
    key
  ) {

    const descriptor =
  global.projectProperties
    ?.getDescriptor?.(
      key
    );

/*
  Составная колонка не имеет
  собственных данных.

  Удаляется только сам вариант
  отображения, но startDate,
  startTime, endDate и endTime
  остаются нетронутыми.
*/

if (
  descriptor?.composite ===
  true
) {
  return;
}
    /*
      Описание хранится не в tableProps,
      а в captions.
    */

    if (key === "captions") {
      walkNodes(
        global.root,
        (node) => {
          node.captions = [];
          node.captionsBgColor = "";
        }
      );

      return;
    }

    /*
      Метка хранится в side-map.
    */

    if (key === "marks") {
      global.__markMap =
        Object.create(null);

      global.__markHiddenMap =
        Object.create(null);

      return;
    }

    /*
      Нумерация не хранит собственных
      данных у объектов.
    */

    if (key === "ordinals") {
      return;
    }

    /*
      Остальные обычные свойства
      сейчас лежат в node.tableProps.
    */

    walkNodes(
      global.root,
      (node) => {
        if (
          !node.tableProps ||
          typeof node.tableProps !==
            "object"
        ) {
          return;
        }

        delete node
          .tableProps[key];

        /*
          В обеих таймерных колонках
          внутреннее значение хранится
          под общим ключом timer.
        */

        if (
          key ===
            "timerDuration" ||
          key ===
            "timerRemaining"
        ) {
          delete node
            .tableProps
            .timer;
        }
      }
    );
  }

  function disablePropertyEverywhere(
    key
  ) {
    const state =
      global.viewTabs
        ?.normalizeState?.() ||
      global.viewTabsState;

    if (
      !state ||
      !Array.isArray(
        state.items
      )
    ) {
      return;
    }

    state.items.forEach(
      (item) => {
        const settings =
          item?.settings;

        if (!settings) {
          return;
        }

        if (
          settings.properties &&
          key in
            settings.properties
        ) {
          settings
            .properties[key] =
              false;
        }

        if (
          key ===
          "levelHeaders"
        ) {
          if (
            settings.interface
          ) {
            settings
              .interface
              .levelHeaders =
                false;
          }
        }
      }
    );
  }

  function canDeleteProperty(
    key
  ) {
    const descriptor =
      global.projectProperties
        ?.getDescriptor?.(
          key
        );

    if (!descriptor) {
      return false;
    }

    return (
      descriptor.removable !==
      false &&
      descriptor.required !==
      true
    );
  }

  function getTitle(
    key
  ) {
    return (
      global.projectProperties
        ?.getTitle?.(
          key
        ) ||
      key
    );
  }

  function removeProperty(
    key
  ) {
    if (
      !canDeleteProperty(
        key
      )
    ) {
      return false;
    }

    /*
      Один общий снимок ДО всех
      изменений для Undo.
    */

    global.pushHistory?.();

    clearPropertyData(
      key
    );

    disablePropertyEverywhere(
      key
    );

    global.projectProperties
      ?.setCreated?.(
        key,
        false,
        {
          save: false,
        }
      );

    global.projectAutosave
      ?.saveNow?.();

    global.viewSettings
      ?.applyActiveSettingsToView?.();

    global.viewSettings
      ?.sync?.();

    global.propertyPanelTabs
      ?.render?.();

    global.render?.();

    global.dispatchEvent(
      new CustomEvent(
        "project-property-delete",
        {
          detail: {
            key,
          },
        }
      )
    );

    return true;
  }

  /* =========================================================
     Модальное окно
  ========================================================= */

  function createModal() {
    const backdrop =
      document.createElement(
        "div"
      );

    backdrop.id =
      "propertyDeleteBackdrop";

    backdrop.className =
      "property-delete-backdrop";

    backdrop.hidden =
      true;

    const modal =
      document.createElement(
        "div"
      );

    modal.className =
      "property-delete-modal";

    modal.setAttribute(
      "role",
      "dialog"
    );

    modal.setAttribute(
      "aria-modal",
      "true"
    );

    const title =
      document.createElement(
        "div"
      );

    title.className =
      "property-delete-title";

    title.textContent =
      "Удалить свойство?";

    const text =
      document.createElement(
        "div"
      );

    text.id =
      "propertyDeleteText";

    text.className =
      "property-delete-text";

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "property-delete-actions";

    const cancel =
      document.createElement(
        "button"
      );

    cancel.type =
      "button";

    cancel.className =
      "ui-action-button ui-action-button--soft";

    cancel.textContent =
      "Отмена";

    const confirm =
      document.createElement(
        "button"
      );

    confirm.type =
      "button";

    confirm.className =
      "ui-action-button property-delete-confirm";

    confirm.textContent =
      "Удалить";

    cancel.addEventListener(
      "click",
      close
    );

    confirm.addEventListener(
      "click",
      () => {
        const key =
          pendingKey;

        close();

        if (key) {
          removeProperty(
            key
          );
        }
      }
    );

    backdrop.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.target ===
          backdrop
        ) {
          close();
        }
      }
    );

    actions.append(
      cancel,
      confirm
    );

    modal.append(
      title,
      text,
      actions
    );

    backdrop.appendChild(
      modal
    );

    document.body.appendChild(
      backdrop
    );

    return backdrop;
  }

  function getModal() {
    return (
      document.getElementById(
        "propertyDeleteBackdrop"
      ) ||
      createModal()
    );
  }

  function open(
    key
  ) {
    if (
      !canDeleteProperty(
        key
      )
    ) {
      return;
    }

    pendingKey =
      key;

    const modal =
      getModal();

    const text =
      modal.querySelector(
        "#propertyDeleteText"
      );

    const title =
      getTitle(
        key
      );

    text.textContent =
      `Удалить свойство «${title}»? Все значения этого свойства будут удалены у всех объектов.`;

    modal.hidden =
      false;

    modal.classList.add(
      "is-open"
    );
  }

  function close() {
    const modal =
      document.getElementById(
        "propertyDeleteBackdrop"
      );

    if (!modal) {
      return;
    }

    modal.hidden =
      true;

    modal.classList.remove(
      "is-open"
    );

    pendingKey =
      "";
  }

  global.propertyDelete = {
    open,
    close,
    remove:
      removeProperty,
    canDelete:
      canDeleteProperty,
  };

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        close();
      }
    }
  );
})();