// ui_tooltip.js
// Универсальная подсказка с автоматическим выбором стороны.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  const VIEWPORT_MARGIN = 8;
  const ANCHOR_GAP = 10;
  const ARROW_MARGIN = 14;

  const ALL_PLACEMENTS = [
    "right",
    "left",
    "bottom",
    "top",
  ];

  let sequence = 0;
  let activeTooltip = null;

  function clamp(
    value,
    min,
    max
  ) {
    if (max < min) {
      return min;
    }

    return Math.min(
      Math.max(value, min),
      max
    );
  }

  function getPlacements(
  preferredPlacements
) {
  const placements =
    Array.isArray(
      preferredPlacements
    )
      ? preferredPlacements.filter(
          (placement) =>
            ALL_PLACEMENTS.includes(
              placement
            )
        )
      : [];

  return placements.length
    ? placements
    : ALL_PLACEMENTS;
}

  function getAvailableSpace(
    anchorRect
  ) {
    return {
      right:
        window.innerWidth -
        anchorRect.right -
        ANCHOR_GAP -
        VIEWPORT_MARGIN,

      left:
        anchorRect.left -
        ANCHOR_GAP -
        VIEWPORT_MARGIN,

      bottom:
        window.innerHeight -
        anchorRect.bottom -
        ANCHOR_GAP -
        VIEWPORT_MARGIN,

      top:
        anchorRect.top -
        ANCHOR_GAP -
        VIEWPORT_MARGIN,
    };
  }

  function choosePlacement(
    placements,
    availableSpace,
    tooltipRect
  ) {
    const requiredSpace = {
      right:
        tooltipRect.width,

      left:
        tooltipRect.width,

      bottom:
        tooltipRect.height,

      top:
        tooltipRect.height,
    };

    const fittingPlacement =
      placements.find(
        (placement) =>
          availableSpace[
            placement
          ] >=
          requiredSpace[
            placement
          ]
      );

    if (fittingPlacement) {
      return fittingPlacement;
    }

    return placements.reduce(
      (
        bestPlacement,
        placement
      ) => {
        const available =
          availableSpace[
            placement
          ];

        const required =
          requiredSpace[
            placement
          ];

        const ratio =
          available /
          Math.max(
            required,
            1
          );

        if (
          ratio >
          bestPlacement.ratio
        ) {
          return {
            placement,
            ratio,
          };
        }

        return bestPlacement;
      },
      {
        placement:
          placements[0],
        ratio:
          -Infinity,
      }
    ).placement;
  }

  function positionTooltip(
    tooltip,
    anchor,
    placements
  ) {
    if (
      !tooltip?.isConnected ||
      !anchor?.isConnected
    ) {
      hideTooltip();
      return;
    }

    const anchorRect =
      anchor
        .getBoundingClientRect();

    const tooltipRect =
      tooltip
        .getBoundingClientRect();

    const placement =
      choosePlacement(
        placements,
        getAvailableSpace(
          anchorRect
        ),
        tooltipRect
      );

    const anchorCenterX =
      anchorRect.left +
      anchorRect.width / 2;

    const anchorCenterY =
      anchorRect.top +
      anchorRect.height / 2;

    let left;
    let top;

    if (
      placement === "right"
    ) {
      left =
        anchorRect.right +
        ANCHOR_GAP;

      top =
        anchorCenterY -
        tooltipRect.height / 2;
    } else if (
      placement === "left"
    ) {
      left =
        anchorRect.left -
        ANCHOR_GAP -
        tooltipRect.width;

      top =
        anchorCenterY -
        tooltipRect.height / 2;
    } else if (
      placement === "bottom"
    ) {
      left =
        anchorCenterX -
        tooltipRect.width / 2;

      top =
        anchorRect.bottom +
        ANCHOR_GAP;
    } else {
      left =
        anchorCenterX -
        tooltipRect.width / 2;

      top =
        anchorRect.top -
        ANCHOR_GAP -
        tooltipRect.height;
    }

    left = clamp(
      left,
      VIEWPORT_MARGIN,
      window.innerWidth -
        tooltipRect.width -
        VIEWPORT_MARGIN
    );

    top = clamp(
      top,
      VIEWPORT_MARGIN,
      window.innerHeight -
        tooltipRect.height -
        VIEWPORT_MARGIN
    );

    tooltip.dataset
      .placement =
        placement;

    tooltip.style.left =
      `${Math.round(left)}px`;

    tooltip.style.top =
      `${Math.round(top)}px`;

    const isVertical =
      placement === "right" ||
      placement === "left";

    const arrowOffset =
      isVertical
        ? clamp(
            anchorCenterY -
              top,
            ARROW_MARGIN,
            tooltipRect.height -
              ARROW_MARGIN
          )
        : clamp(
            anchorCenterX -
              left,
            ARROW_MARGIN,
            tooltipRect.width -
              ARROW_MARGIN
          );

    tooltip.style.setProperty(
      "--ui-tooltip-arrow-offset",
      `${Math.round(
        arrowOffset
      )}px`
    );
  }

  function hideTooltip() {
    if (!activeTooltip) {
      return;
    }

    const current =
      activeTooltip;

    activeTooltip = null;

    window.removeEventListener(
      "resize",
      current.updatePosition
    );

    window.removeEventListener(
      "scroll",
      current.updatePosition,
      true
    );

    current.observer
      ?.disconnect();

    if (
      current.trigger
        .getAttribute(
          "aria-describedby"
        ) ===
      current.tooltip.id
    ) {
      current.trigger
        .removeAttribute(
          "aria-describedby"
        );
    }

    current.tooltip.remove();
  }

  function showTooltip(
    trigger,
    options = {}
  ) {
    const text =
      String(
        options.text || ""
      ).trim();

    if (!text) {
      return;
    }

    const anchor =
      typeof options.anchor ===
      "function"
        ? options.anchor()
        : options.anchor ||
          trigger;

    if (
      !trigger?.isConnected ||
      !anchor?.isConnected
    ) {
      return;
    }

    hideTooltip();

    const tooltip =
      document.createElement(
        "div"
      );

    tooltip.id =
      options.id ||
      `ui-tooltip-${++sequence}`;

    tooltip.className =
      "ui-tooltip";

    tooltip.setAttribute(
      "role",
      "tooltip"
    );

    tooltip.textContent =
      text;

    document.body.appendChild(
      tooltip
    );

    const placements =
      getPlacements(
        options
          .preferredPlacements
      );

    const updatePosition =
      () => {
        positionTooltip(
          tooltip,
          anchor,
          placements
        );
      };

    const observer =
      new MutationObserver(
        () => {
          if (
            !trigger.isConnected ||
            !anchor.isConnected
          ) {
            hideTooltip();
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList:
          true,

        subtree:
          true,
      }
    );

    activeTooltip = {
      trigger,
      tooltip,
      updatePosition,
      observer,
    };

    trigger.setAttribute(
      "aria-describedby",
      tooltip.id
    );

    updatePosition();

    requestAnimationFrame(
      () => {
        if (
          activeTooltip
            ?.tooltip ===
          tooltip
        ) {
          tooltip.classList.add(
            "is-visible"
          );
        }
      }
    );

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );
  }

  function attachTooltip(
    trigger,
    options = {}
  ) {
    if (!trigger) {
      return () => {};
    }

    const normalizedOptions =
      typeof options ===
      "string"
        ? {
            text:
              options,
          }
        : options;

    const showDelay =
      Number.isFinite(
        normalizedOptions
          .showDelay
      )
        ? normalizedOptions
            .showDelay
        : 180;

    const hideDelay =
      Number.isFinite(
        normalizedOptions
          .hideDelay
      )
        ? normalizedOptions
            .hideDelay
        : 60;

    let showTimer = null;
    let hideTimer = null;

    function clearTimers() {
      window.clearTimeout(
        showTimer
      );

      window.clearTimeout(
        hideTimer
      );
    }

    function scheduleShow() {
      clearTimers();

      showTimer =
        window.setTimeout(
          () => {
            showTooltip(
              trigger,
              normalizedOptions
            );
          },
          showDelay
        );
    }

    function scheduleHide() {
      clearTimers();

      hideTimer =
        window.setTimeout(
          () => {
            if (
              activeTooltip
                ?.trigger ===
              trigger
            ) {
              hideTooltip();
            }
          },
          hideDelay
        );
    }

    trigger.addEventListener(
      "pointerenter",
      scheduleShow
    );

    trigger.addEventListener(
      "pointerleave",
      scheduleHide
    );

    trigger.addEventListener(
      "focusin",
      scheduleShow
    );

    trigger.addEventListener(
      "focusout",
      scheduleHide
    );

    return function detachTooltip() {
      clearTimers();

      trigger.removeEventListener(
        "pointerenter",
        scheduleShow
      );

      trigger.removeEventListener(
        "pointerleave",
        scheduleHide
      );

      trigger.removeEventListener(
        "focusin",
        scheduleShow
      );

      trigger.removeEventListener(
        "focusout",
        scheduleHide
      );

      if (
        activeTooltip
          ?.trigger ===
        trigger
      ) {
        hideTooltip();
      }
    };
  }

  window.uiTooltip = {
    attach:
      attachTooltip,

    show:
      showTooltip,

    hide:
      hideTooltip,
  };
})();