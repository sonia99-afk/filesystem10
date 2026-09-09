// Arrow-hold repeat that cooperates with existing hotkey system
(function () {
  const INITIAL_DELAY = 450;
  const REPEAT_MS = 60;

  let heldCode = null;
  let heldAction = null;
  let tStart = null;
  let tRepeat = null;
  

  const downKeys = new Set();

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  function isTableViewActive() {
  return window.currentView === window.VIEW?.TABLE;
}

  function isModifierKey(e) {
    return (
      e.key === "Shift" ||
      e.key === "Alt" ||
      e.key === "Control" ||
      e.key === "Meta" ||
      e.key === "OS"
    );
  }

  function isMacPlatform() {
    return !!window.hotkeys?.getPlatformInfo?.().isMac;
  }

  function stop() {
    heldCode = null;
    heldAction = null;

    if (tStart) {
      clearTimeout(tStart);
      tStart = null;
    }

    if (tRepeat) {
      clearInterval(tRepeat);
      tRepeat = null;
    }
  }

  function canRunNow() {
    if (typeof isTreeLocked === "function" && isTreeLocked()) return false;
    if (typeof treeHasFocus !== "undefined" && !treeHasFocus) return false;
    if (typeof selectedId === "undefined" || !selectedId) return false;
    return true;
  }

  

  function runAction(action) {
    if (!canRunNow()) {
      stop();
      return;
    }

    switch (action) {
      case "rangeUp":
        return window.multiSelect?.handleRangeKey?.(-1);

      case "rangeDown":
        return window.multiSelect?.handleRangeKey?.(+1);

      case "deepUp":
        return window.multiSelectDeep?.handleDeepRangeKey?.(-1);

      case "deepDown":
        return window.multiSelectDeep?.handleDeepRangeKey?.(+1);

      case "navUp":
        return typeof moveSelection === "function" ? moveSelection(-1) : undefined;

      case "navDown":
        return typeof moveSelection === "function" ? moveSelection(+1) : undefined;

      case "navLeft":
        return typeof goParent === "function" ? goParent(selectedId) : undefined;

      case "navRight":
        return typeof goDeeper === "function" ? goDeeper(selectedId) : undefined;

      case "moveUp":
        return typeof moveByVisibleOrder === "function" ? moveByVisibleOrder(-1) : undefined;

      case "moveDown":
        return typeof moveByVisibleOrder === "function" ? moveByVisibleOrder(+1) : undefined;

      case "levelNavUp":
        return window.levelNav?.up?.();

      case "levelNavDown":
        return window.levelNav?.down?.();

      case "branchNavLeft":
        return window.branchNav?.left?.();

      case "branchNavRight":
        return window.branchNav?.right?.();

      case "levelMoveUp":
        return window.levelMove?.up?.();

      case "levelMoveDown":
        return window.levelMove?.down?.();

      case "branchMoveLeft":
        return window.branchMove?.left?.();

      case "branchMoveRight":
        return window.branchMove?.right?.();

      case "branchRangeLeft":
        return window.multiSelectBranch?.handleBranchRangeKey?.(-1);

      case "branchRangeRight":
        return window.multiSelectBranch?.handleBranchRangeKey?.(+1);
    }
  }

  function step(action) {
    if (!heldCode || !downKeys.has(heldCode)) {
      stop();
      return;
    }

    runAction(action);
    
  }

  function startRepeat(action, code) {
    stop();

    heldAction = action;
    heldCode = code;

    tStart = setTimeout(() => {
      if (!heldAction || !heldCode) return;

      tRepeat = setInterval(() => {
        step(heldAction);
      }, REPEAT_MS);
    }, INITIAL_DELAY);
  }

  function resolveArrowActionFromEvent(e) {
    const code = e.code;

    if (
      code !== "ArrowUp" &&
      code !== "ArrowDown" &&
      code !== "ArrowLeft" &&
      code !== "ArrowRight"
    ) {
      return null;
    }

    if (typeof isHotkey !== "function") return null;
    if (window.hotkeysMode === "custom") return null;

    if (isHotkey(e, "rangeUp")) return "rangeUp";
    if (isHotkey(e, "rangeDown")) return "rangeDown";
    if (isHotkey(e, "deepUp")) return "deepUp";
    if (isHotkey(e, "deepDown")) return "deepDown";

    if (isHotkey(e, "indent")) return "indent";
    if (isHotkey(e, "outdent")) return "outdent";

    if (isHotkey(e, "moveUp")) return "moveUp";
    if (isHotkey(e, "moveDown")) return "moveDown";

    if (isHotkey(e, "levelNavUp")) return "levelNavUp";
    if (isHotkey(e, "levelNavDown")) return "levelNavDown";

    if (isHotkey(e, "branchNavLeft")) return "branchNavLeft";
    if (isHotkey(e, "branchNavRight")) return "branchNavRight";

    if (isHotkey(e, "levelMoveUp")) return "levelMoveUp";
    if (isHotkey(e, "levelMoveDown")) return "levelMoveDown";

    if (isHotkey(e, "branchMoveLeft")) return "branchMoveLeft";
    if (isHotkey(e, "branchMoveRight")) return "branchMoveRight";

    if (isHotkey(e, "branchRangeLeft")) return "branchRangeLeft";
    if (isHotkey(e, "branchRangeRight")) return "branchRangeRight";

    if (isHotkey(e, "navLeft")) return "navLeft";
    if (isHotkey(e, "navRight")) return "navRight";
    if (isHotkey(e, "navUp")) return "navUp";
    if (isHotkey(e, "navDown")) return "navDown";

    return null;
  }

  window.addEventListener(
  "keydown",
  (e) => {
    if (isTableViewActive()) return;
    if (isTypingTarget(e.target)) return;
  
      const isVerticalArrow =
  e.code === "ArrowUp" ||
  e.code === "ArrowDown" ||
  e.key === "ArrowUp" ||
  e.key === "ArrowDown";

// ВАЖНО:
// делаем preventDefault ДО resolveArrowActionFromEvent(),
// потому что на повторных keydown isHotkey() возвращает false из-за e.repeat.
if (isVerticalArrow && canRunNow()) {
  e.preventDefault();
}
  
      const action = resolveArrowActionFromEvent(e);
      if (!action) return;
      if (!canRunNow()) return;
  
      e.preventDefault();
  
      if (e.code) downKeys.add(e.code);
  
      if (e.repeat) return;
  
      startRepeat(action, e.code);
    },
    true
  );

  window.addEventListener(
    "keyup",
    (e) => {
      if (e.code) downKeys.delete(e.code);

      if (!heldCode) return;

      if (e.code === heldCode) {
        stop();
        return;
      }

      if (isModifierKey(e)) {
        stop();
      }
    },
    true
  );

  window.addEventListener("blur", () => {
    downKeys.clear();
    stop();
  });

  window.addEventListener("focus", () => {
    downKeys.clear();
    stop();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      downKeys.clear();
      stop();
    }
  });

  window.addEventListener("mouseup", stop, true);
})();