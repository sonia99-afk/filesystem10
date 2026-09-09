// ui_anchored_popup.js

(function () {
  const popupStates = new WeakMap();

  const STYLE_PROPERTIES = [
    "position",
    "left",
    "right",
    "top",
    "bottom",
    "z-index",
  ];

  function savePopupState(popup) {
    const styles = {};

    STYLE_PROPERTIES.forEach((property) => {
      styles[property] = {
        value:
          popup.style.getPropertyValue(
            property
          ),

        priority:
          popup.style.getPropertyPriority(
            property
          ),
      };
    });

    return {
      parent: popup.parentNode,
      nextSibling: popup.nextSibling,
      styles,
      anchor: null,
      options: null,
      updatePosition: null,
    };
  }

  function restorePopupState(
    popup,
    state
  ) {
    const {
      parent,
      nextSibling,
      styles,
    } = state;

    if (parent) {
      if (
        nextSibling &&
        nextSibling.parentNode ===
          parent
      ) {
        parent.insertBefore(
          popup,
          nextSibling
        );
      } else {
        parent.appendChild(popup);
      }
    }

    STYLE_PROPERTIES.forEach(
      (property) => {
        const saved =
          styles[property];

        if (saved.value) {
          popup.style.setProperty(
            property,
            saved.value,
            saved.priority
          );
        } else {
          popup.style.removeProperty(
            property
          );
        }
      }
    );

    delete popup.dataset.uiPlacement;
  }

  function getOverflow(
    position,
    popupWidth,
    popupHeight,
    padding
  ) {
    const right =
      position.left + popupWidth;

    const bottom =
      position.top + popupHeight;

    return (
      Math.max(
        0,
        padding - position.left
      ) +
      Math.max(
        0,
        padding - position.top
      ) +
      Math.max(
        0,
        right -
          (window.innerWidth -
            padding)
      ) +
      Math.max(
        0,
        bottom -
          (window.innerHeight -
            padding)
      )
    );
  }

  function positionPopup(
    popup,
    anchor,
    options = {}
  ) {
    if (
      !popup?.isConnected ||
      !anchor?.isConnected
    ) {
      return;
    }

    const overlap =
      options.overlap ?? 12;

    const padding =
      options.viewportPadding ?? 8;

    const anchorRect =
      anchor.getBoundingClientRect();

    const popupRect =
      popup.getBoundingClientRect();

    const width = popupRect.width;
    const height = popupRect.height;

    /*
      Порядок приоритета:

      1. Справа и снизу.
      2. Слева и снизу.
      3. Справа и сверху.
      4. Слева и сверху.
    */

    const placements = [
      {
        name: "bottom-right",

        left:
          anchorRect.right -
          overlap,

        top:
          anchorRect.bottom -
          overlap,
      },

      {
        name: "bottom-left",

        left:
          anchorRect.left +
          overlap -
          width,

        top:
          anchorRect.bottom -
          overlap,
      },

      {
        name: "top-right",

        left:
          anchorRect.right -
          overlap,

        top:
          anchorRect.top +
          overlap -
          height,
      },

      {
        name: "top-left",

        left:
          anchorRect.left +
          overlap -
          width,

        top:
          anchorRect.top +
          overlap -
          height,
      },
    ];

    let selected =
      placements.find(
        (placement) =>
          getOverflow(
            placement,
            width,
            height,
            padding
          ) === 0
      );

    /*
      Если меню не помещается ни в
      одной позиции, выбираем позицию
      с наименьшим выходом за экран.
    */

    if (!selected) {
      selected = placements.reduce(
        (best, placement) => {
          const overflow =
            getOverflow(
              placement,
              width,
              height,
              padding
            );

          if (
            !best ||
            overflow < best.overflow
          ) {
            return {
              ...placement,
              overflow,
            };
          }

          return best;
        },
        null
      );
    }

    const maximumLeft =
      Math.max(
        padding,
        window.innerWidth -
          width -
          padding
      );

    const maximumTop =
      Math.max(
        padding,
        window.innerHeight -
          height -
          padding
      );

    const left = Math.min(
      maximumLeft,
      Math.max(
        padding,
        selected.left
      )
    );

    const top = Math.min(
      maximumTop,
      Math.max(
        padding,
        selected.top
      )
    );

    popup.style.left =
      `${Math.round(left)}px`;

    popup.style.top =
      `${Math.round(top)}px`;

    popup.dataset.uiPlacement =
      selected.name;
  }

  function positionInsidePanel(
  popup,
  anchor,
  container,
  options = {}
) {
  const overlap =
    options.overlap ?? 12;

  const padding =
    options.viewportPadding ?? 8;

  const anchorRect =
    anchor.getBoundingClientRect();

  const popupRect =
    popup.getBoundingClientRect();

  const containerRect =
    container.getBoundingClientRect();

  const width =
    popupRect.width;

  const height =
    popupRect.height;

  const placements = [
    {
      name: "bottom-right",

      left:
        anchorRect.right -
        overlap,

      top:
        anchorRect.bottom -
        overlap,
    },

    {
      name: "bottom-left",

      left:
        anchorRect.left +
        overlap -
        width,

      top:
        anchorRect.bottom -
        overlap,
    },

    {
      name: "top-right",

      left:
        anchorRect.right -
        overlap,

      top:
        anchorRect.top +
        overlap -
        height,
    },

    {
      name: "top-left",

      left:
        anchorRect.left +
        overlap -
        width,

      top:
        anchorRect.top +
        overlap -
        height,
    },
  ];

  function getPanelOverflow(
    position
  ) {
    const minimumLeft =
      containerRect.left +
      padding;

    const minimumTop =
      containerRect.top +
      padding;

    const maximumRight =
      containerRect.right -
      padding;

    const maximumBottom =
      containerRect.bottom -
      padding;

    return (
      Math.max(
        0,
        minimumLeft -
          position.left
      ) +

      Math.max(
        0,
        minimumTop -
          position.top
      ) +

      Math.max(
        0,
        position.left +
          width -
          maximumRight
      ) +

      Math.max(
        0,
        position.top +
          height -
          maximumBottom
      )
    );
  }

  let selected =
    placements.find(
      (placement) =>
        getPanelOverflow(
          placement
        ) === 0
    );

  if (!selected) {
    selected =
      placements.reduce(
        (best, placement) => {
          const overflow =
            getPanelOverflow(
              placement
            );

          if (
            !best ||
            overflow <
              best.overflow
          ) {
            return {
              ...placement,
              overflow,
            };
          }

          return best;
        },
        null
      );
  }

  const minimumLeft =
    containerRect.left +
    padding;

  const minimumTop =
    containerRect.top +
    padding;

  const maximumLeft =
    Math.max(
      minimumLeft,
      containerRect.right -
        width -
        padding
    );

  const maximumTop =
    Math.max(
      minimumTop,
      containerRect.bottom -
        height -
        padding
    );

  const viewportLeft =
    Math.min(
      maximumLeft,
      Math.max(
        minimumLeft,
        selected.left
      )
    );

  const viewportTop =
    Math.min(
      maximumTop,
      Math.max(
        minimumTop,
        selected.top
      )
    );

  const offsetParent =
    popup.offsetParent ||
    container;

  const parentRect =
    offsetParent
      .getBoundingClientRect();

  popup.style.left =
    `${
      Math.round(
        viewportLeft -
        parentRect.left +
        offsetParent.scrollLeft
      )
    }px`;

  popup.style.top =
    `${
      Math.round(
        viewportTop -
        parentRect.top +
        offsetParent.scrollTop
      )
    }px`;

  popup.dataset.uiPlacement =
    selected.name;
}

function openInsidePanel(
  popup,
  anchor,
  container,
  options = {}
) {
  close(popup);

  const state =
    savePopupState(popup);

  state.anchor =
    anchor;

  state.options =
    options;

  popupStates.set(
    popup,
    state
  );

  /*
    popup не переносим в body.
    Он остаётся внутри своей строки.
  */

  popup.style.position =
    "absolute";

  popup.style.right =
    "auto";

  popup.style.bottom =
    "auto";

  popup.style.left =
    "0px";

  popup.style.top =
    "0px";

  popup.style.zIndex =
    String(
      options.zIndex ?? 14000
    );

  state.updatePosition =
    () => {
      if (
        !anchor.isConnected ||
        !container.isConnected
      ) {
        close(popup);
        return;
      }

      positionInsidePanel(
        popup,
        anchor,
        container,
        options
      );
    };

  state.updatePosition();

  /*
    При прокрутке позицию не
    пересчитываем: окно прокручивается
    вместе со своей строкой.
  */

  window.addEventListener(
    "resize",
    state.updatePosition
  );

  return true;
}

  function close(popup) {
    if (!popup) return;

    const state =
      popupStates.get(popup);

    if (!state) return;

    window.removeEventListener(
      "resize",
      state.updatePosition
    );

    document.removeEventListener(
      "scroll",
      state.updatePosition,
      true
    );

    restorePopupState(
      popup,
      state
    );

    popupStates.delete(popup);
  }

  function open(
    popup,
    anchor,
    options = {}
  ) {
    if (
      !popup ||
      !anchor?.getBoundingClientRect
    ) {
      return false;
    }

    const panelBody =
  anchor.closest?.(
    (
      "#viewSettingsPanel " +
      ".view-settings-body"
    )
  );

if (panelBody) {
  return openInsidePanel(
    popup,
    anchor,
    panelBody,
    options
  );
}

    /*
      Если окно уже было открыто,
      сначала возвращаем его домой.
    */

    close(popup);

    const state =
      savePopupState(popup);

    state.anchor = anchor;
    state.options = options;

    popupStates.set(
      popup,
      state
    );

    document.body.appendChild(popup);

    popup.style.position = "fixed";
    popup.style.right = "auto";
    popup.style.bottom = "auto";
    popup.style.left = "0px";
    popup.style.top = "0px";

    popup.style.zIndex =
      String(
        options.zIndex ?? 14000
      );

    state.updatePosition = () => {
      if (!anchor.isConnected) {
        close(popup);
        return;
      }

      positionPopup(
        popup,
        anchor,
        options
      );
    };

    state.updatePosition();

    window.addEventListener(
      "resize",
      state.updatePosition
    );

    /*
      true нужен, чтобы отслеживать
      прокрутку внутренних контейнеров.
    */

    document.addEventListener(
      "scroll",
      state.updatePosition,
      true
    );

    return true;
  }

  window.uiAnchoredPopup = {
    open,
    close,
  };
})();