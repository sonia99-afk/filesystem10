// mark_property.js
// Свойство объекта "Отметка":
// - состояние объекта: не отмечено / отмечено
// - глобальное отображение кружков
// - меню настроек: Скрыть/Показать и Зачеркнуть/Не зачёркивать

(function () {
  if (typeof window === "undefined") return;

  window.__markMap = window.__markMap || Object.create(null);

  window.__markHiddenMap = window.__markHiddenMap || Object.create(null);

const hideTimers = Object.create(null);
const HIDE_DELAY_MS = 700;

  const DEFAULTS = {
    showMarks: false,
    hideMarked: false,
    strikeMarked: false,
  };

  const state = {
    showMarks: DEFAULTS.showMarks,
    hideMarked: DEFAULTS.hideMarked,
    strikeMarked: DEFAULTS.strikeMarked,
  };

  function host() {
    return document.getElementById("tree");
  }

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;
    if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
    if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function isMarked(id) {
    return !!(id && window.__markMap && window.__markMap[id]);
  }

  function setMarked(id, value, withHistory = true) {
    if (!id) return false;

    const next = !!value;
    const prev = isMarked(id);
    if (prev === next) return false;

    if (withHistory && typeof pushHistory === "function") {
      pushHistory();
    }

    window.__markMap ||= Object.create(null);

    if (next) window.__markMap[id] = true;
    else delete window.__markMap[id];

    decorateAllRows();
    return true;
  }

  function toggleMarked(id) {
    if (!id) return false;
    return setMarked(id, !isMarked(id), true);
  }

  function clearHideTimer(id) {
    if (hideTimers[id]) {
      clearTimeout(hideTimers[id]);
      delete hideTimers[id];
    }
  }
  
  function clearHiddenState(id) {
    clearHideTimer(id);
  
    if (window.__markHiddenMap) {
      delete window.__markHiddenMap[id];
    }
  }
  
  function scheduleHide(id) {
    if (!id) return;
    if (!state.hideMarked) return;
    if (!isMarked(id)) return;
  
    if (window.__markHiddenMap[id]) return;
    if (hideTimers[id]) return;
  
    hideTimers[id] = setTimeout(() => {
      delete hideTimers[id];
  
      window.__markHiddenMap[id] = true;
  
      decorateAllRows();
    }, HIDE_DELAY_MS);
  }
  
  function resetTransientState() {
  /*
    Таймеры скрытия относятся только
    к текущему runtime.

    При восстановлении проекта,
    Undo/Redo и переключении проекта
    они не должны переноситься дальше.
  */

  Object.keys(
    hideTimers
  ).forEach(
    clearHideTimer
  );

  window.__markHiddenMap =
    Object.create(null);
}

function clearAllHidden() {
  resetTransientState();
}

  function buildMarkDot(id) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "mark-dot" + (isMarked(id) ? " is-marked" : "");
    dot.dataset.markDot = "1";
    dot.dataset.id = id;
    dot.title = isMarked(id) ? "Отмечено" : "Не отмечено";
    dot.setAttribute("aria-label", dot.title);

    dot.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (typeof isTreeLocked === "function" && isTreeLocked()) return;
      if (isEditingNow()) return;

      if (typeof selectedId !== "undefined") selectedId = id;
      if (typeof treeHasFocus !== "undefined") treeHasFocus = true;

      toggleMarked(id);

      if (typeof render === "function") render();
    });

    return dot;
  }

  function decorateRow(row) {
    if (!row || !row.dataset?.id) return;

    row.querySelector(":scope > .mark-dot")?.remove();

    const marked = isMarked(row.dataset.id);
    const shouldStrike = state.strikeMarked && marked;

    const shouldHide = state.hideMarked && marked;
const isHidden = !!window.__markHiddenMap[row.dataset.id];

    row.classList.toggle("mark-row", !!state.showMarks);
    row.classList.toggle("is-marked-object", marked);
    row.classList.toggle("mark-strike-object", shouldStrike);

    const li = row.closest("li");
    const caps = li?.querySelector(":scope > .captions");

    if (caps) {
      caps.classList.toggle("mark-strike-object", shouldStrike);
    }

    if (shouldHide) {
      scheduleHide(row.dataset.id);
    } else {
      clearHiddenState(row.dataset.id);
    }
    
    if (li) {
      li.classList.toggle("mark-hidden-object", isHidden);
    }

    if (!state.showMarks) return;

    const dot = buildMarkDot(row.dataset.id);
    row.insertBefore(dot, row.firstChild);
  }

  function decorateAllRows() {
    const h = host();
    if (!h) return;

    h.querySelectorAll(".row[data-id]").forEach((row) => {
      if (row.closest(".structure-table")) return;

      if (
        row.classList.contains("hierarchy-node") ||
        row.classList.contains("hierarchy-horizontal-node") ||
        row.classList.contains("icicle-horizontal-node") ||
        row.classList.contains("icicle-vertical-node") ||
        row.classList.contains("leaf-node")
      ) {
        return;
      }

      decorateRow(row);
    });

    h
  .querySelectorAll(
    ".structure-table tbody tr[data-id]"
  )
  .forEach((tr) => {
    const id =
      tr.dataset.id || "";

    if (!id) {
      return;
    }

    /*
      В обычной таблице внутри строки
      остаётся ячейка названия .row.

      В объединённом виде название
      находится в левой структуре,
      поэтому row может отсутствовать.
    */

    const row =
      tr.querySelector(
        ".row[data-id]"
      );

    const marked =
      isMarked(id);

    const shouldStrike =
      state.strikeMarked &&
      marked;

    const shouldHide =
      state.hideMarked &&
      marked;

    const isHidden =
      !!window
        .__markHiddenMap[id];

    row?.classList.toggle(
      "is-marked-object",
      marked
    );

    row?.classList.toggle(
      "mark-strike-object",
      shouldStrike
    );

    tr.classList.toggle(
      "is-marked-object",
      marked
    );

    tr.classList.toggle(
      "mark-strike-object",
      shouldStrike
    );

    tr.classList.toggle(
      "mark-hidden-object",
      isHidden
    );

    if (shouldHide) {
      scheduleHide(id);
    } else {
      clearHiddenState(id);
    }
  });

requestAnimationFrame(() => {
  if (
    typeof layoutTrunks ===
    "function"
  ) {
    layoutTrunks();
  }

  relayoutTrunksIgnoringHidden();

  /*
    Метка добавляется внутрь строки
    и меняет её размеры. Поэтому после
    добавления, удаления или скрытия
    меток заново рассчитываем общий
    серый фон активного объекта.
  */

window.schemaActiveBlock
  ?.schedule?.();
});

    syncToolbar();
  }

  function setState(
  nextState = {},
  options = {}
) {
  const nextShowMarks =
    typeof nextState
      .showMarks === "boolean"
      ? nextState.showMarks
      : state.showMarks;

  const nextHideMarked =
    typeof nextState
      .hideMarked === "boolean"
      ? nextState.hideMarked
      : state.hideMarked;

  const nextStrikeMarked =
    typeof nextState
      .strikeMarked === "boolean"
      ? nextState.strikeMarked
      : state.strikeMarked;

  const changed =
    state.showMarks !==
      nextShowMarks ||

    state.hideMarked !==
      nextHideMarked ||

    state.strikeMarked !==
      nextStrikeMarked;

  if (!changed) {
    syncToolbar();
    return false;
  }

  const hideWasEnabled =
    state.hideMarked;

  /*
    Сначала одним действием
    меняем весь runtime-state.
  */

  state.showMarks =
    nextShowMarks;

  state.hideMarked =
    nextHideMarked;

  state.strikeMarked =
    nextStrikeMarked;

  /*
    Если скрытие выключили,
    возвращаем ранее скрытые
    объекты сразу.
  */

  if (
    hideWasEnabled &&
    !state.hideMarked
  ) {
    clearAllHidden();
  }

  /*
    При выключении Метки
    меню настроек больше
    не должно оставаться открытым.
  */

  if (!state.showMarks) {
    closeSettingsMenu();
  }

  /*
    Иногда state подготавливается
    перед общим render() вида.

    Тогда сейчас DOM трогать
    вообще не нужно.
  */

  if (
    options.decorate === false
  ) {
    syncToolbar();
    return true;
  }

  /*
    Все три значения применяем
    к DOM одним проходом.
  */

  decorateAllRows();

  return true;
}

function setShowMarks(
  value,
  options = {}
) {
  return setState(
    {
      showMarks:
        !!value,
    },
    options
  );
}

function toggleShowMarks() {
  return setShowMarks(
    !state.showMarks
  );
}

function setHideMarked(
  value,
  options = {}
) {
  return setState(
    {
      hideMarked:
        !!value,
    },
    options
  );
}

function toggleHideMarked() {
  return setHideMarked(
    !state.hideMarked
  );
}

function setStrikeMarked(
  value,
  options = {}
) {
  return setState(
    {
      strikeMarked:
        !!value,
    },
    options
  );
}

function toggleStrikeMarked() {
  return setStrikeMarked(
    !state.strikeMarked
  );
}

function setMode(mode) {
  if (mode === "hide") {
    setHideMarked(true);
    return;
  }

  if (mode === "show") {
    setHideMarked(false);
    return;
  }

  if (mode === "strike") {
    setStrikeMarked(true);
    return;
  }

  if (mode === "unstrike") {
    setStrikeMarked(false);
  }
}

  function getToggleBtn() {
    return document.getElementById("toggleMarks");
  }

  function getSettingsBtn() {
    return document.getElementById("markSettingsBtn");
  }

    function getSettingsMenu() {
    return document.getElementById("markSettingsMenu");
  }

function closeSettingsMenu() {
  const menu =
    getSettingsMenu();

  const btn =
    getSettingsBtn();

  menu?.classList.remove(
    "is-open",
    "is-table-popup"
  );

  menu?.setAttribute(
    "aria-hidden",
    "true"
  );

  btn?.classList.remove(
    "is-active"
  );

  window.uiAnchoredPopup
    ?.close?.(menu);
}

function toggleSettingsMenu() {
  if (!state.showMarks) {
    return;
  }

  const menu =
    getSettingsMenu();

  const btn =
    getSettingsBtn();

  if (!menu || !btn) {
    return;
  }

  const willOpen =
    !menu.classList.contains(
      "is-open"
    );

  if (!willOpen) {
    closeSettingsMenu();
    return;
  }

  menu.classList.add(
    "is-open"
  );

  menu.setAttribute(
    "aria-hidden",
    "false"
  );

  btn.classList.add(
    "is-active"
  );

  window.uiAnchoredPopup
    ?.open?.(
      menu,
      btn,
      {
        overlap: 12,
      }
    );
}


  function setItemText(item, text) {
    if (!item) return;

    const textEl = item.querySelector(".mark-settings-text");
    if (textEl) {
      textEl.textContent = text;
      return;
    }

    const spans = item.querySelectorAll("span");
    if (spans.length >= 2) {
      spans[1].textContent = text;
      return;
    }

    item.textContent = text;
  }

  function setItemIcon(item, iconHtml) {
    const iconEl = item.querySelector(".mark-settings-icon");
    if (iconEl) iconEl.innerHTML = iconHtml;
  }

  function syncToolbar() {
    const toggleBtn = getToggleBtn();
    const settingsBtn = getSettingsBtn();
    const menu = getSettingsMenu();

    if (toggleBtn) {
      toggleBtn.classList.toggle("is-active", state.showMarks);
      toggleBtn.title = state.showMarks ? "Скрыть отметки" : "Показать отметки";
    }

    if (settingsBtn) {
      settingsBtn.disabled = !state.showMarks;
      settingsBtn.classList.toggle("is-inactive", !state.showMarks);
      settingsBtn.title = state.showMarks
        ? "Настройки отображения отмеченных объектов"
        : "Сначала включите отметки";
    }

    if (menu) {
      const hideItem = menu.querySelector('[data-mark-mode="hide"]');
      const strikeItem = menu.querySelector('[data-mark-mode="strike"]');
      const strikeDisabled = state.hideMarked;

      if (hideItem) {
        // setItemText(hideItem, state.hideMarked ? "Показать" : "Скрыть");
        setItemText(
          hideItem,
          state.hideMarked ? UI.labels.marks.show : UI.labels.marks.hide
        );
        setItemIcon(
          hideItem,
          // state.hideMarked
          //   ? '<img src="icons/Показать.png" width="14" height="14">'
          //   : '<img src="icons/Скрыть.png" width="14" height="14">'
                  state.hideMarked
          ? UI.iconImg(UI.icons.marks.show)
          : UI.iconImg(UI.icons.marks.hide)
        );
      }

      if (strikeItem) {    
        // setItemText(
        //   strikeItem,
          // state.strikeMarked ? "Не зачёркивать" : "Зачеркнуть"
          setItemText(
            strikeItem,
            state.strikeMarked
              ? UI.labels.marks.unstrike
              : UI.labels.marks.strike
          );
      
        setItemIcon(
          strikeItem,
          // state.strikeMarked
          //   ? '<img class="mark-settings-img" src="icons/Текст.png" width="14" height="14">'
          //   : '<img class="mark-settings-img" src="icons/Зачеркнутный.png" width="14" height="14">'
          state.strikeMarked
            ? UI.iconImg(UI.icons.marks.text, "mark-settings-img")
            : UI.iconImg(UI.icons.marks.strike, "mark-settings-img")
        );

        strikeItem.classList.toggle("is-disabled", strikeDisabled);
        strikeItem.setAttribute(
          "aria-disabled",
          strikeDisabled ? "true" : "false"
        );
      }
    }
  }

  function bindToolbar() {
  const settingsBtn =
    getSettingsBtn();

  const menu =
    getSettingsMenu();

  /*
    Сам toggleMarks здесь больше
    НЕ обрабатываем.

    Его владельцем теперь является:

      view_settings.js
        ↓
      setPropertySetting("marks", ...)
        ↓
      item.settings
        ↓
      applyActiveSettingsToView()
        ↓
      markProperty.setShowMarks()
  */

  /* =========================================================
     Кнопка настроек Метки
  ========================================================= */

  if (
    settingsBtn &&
    !settingsBtn.__markBound
  ) {
    settingsBtn.__markBound =
      true;

    settingsBtn.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        toggleSettingsMenu();
      }
    );
  }

  /* =========================================================
     Меню Метки
  ========================================================= */

  if (
    menu &&
    !menu.__markBound
  ) {
    menu.__markBound =
      true;

    menu.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        const item =
          event.target
            ?.closest?.(
              "[data-mark-mode]"
            );

        if (!item) {
          return;
        }

        const action =
          item.dataset
            .markMode;

        /*
          Заблокированный пункт
          ничего не делает.
        */

        if (
          item.classList
            .contains(
              "is-disabled"
            ) ||

          item.getAttribute(
            "aria-disabled"
          ) === "true"
        ) {
          return;
        }

        /* -------------------------
           Скрыть / Показать
        ------------------------- */

        if (
          action ===
          "hide"
        ) {
          if (
            window.viewSettings
              ?.setMarkOptionSetting
          ) {
            const settings =
              window.viewSettings
                ?.getActiveSettings?.();

            const current =
              !!settings
                ?.propertyOptions
                ?.marks
                ?.hideMarked;

            window.viewSettings
              .setMarkOptionSetting(
                "hideMarked",
                !current
              );
          } else {
            /*
              Старый fallback,
              если viewSettings
              почему-то отсутствует.
            */

            toggleHideMarked();
          }
        }

        /* -------------------------
           Зачеркнуть / Не зачёркивать
        ------------------------- */

        if (
          action ===
          "strike"
        ) {
          if (
            window.viewSettings
              ?.setMarkOptionSetting
          ) {
            const settings =
              window.viewSettings
                ?.getActiveSettings?.();

            const current =
              !!settings
                ?.propertyOptions
                ?.marks
                ?.strikeMarked;

            window.viewSettings
              .setMarkOptionSetting(
                "strikeMarked",
                !current
              );
          } else {
            /*
              Старый fallback,
              если viewSettings
              почему-то отсутствует.
            */

            toggleStrikeMarked();
          }
        }

        closeSettingsMenu();
      }
    );
  }

  /* =========================================================
     Закрытие меню при клике снаружи
  ========================================================= */

  if (
    !document
      .__markOutsideBound
  ) {
    document
      .__markOutsideBound =
        true;

    document.addEventListener(
      "click",
      (event) => {
        const tools =
          document.getElementById(
            "markTools"
          );

        if (
          tools &&
          tools.contains(
            event.target
          )
        ) {
          return;
        }

        if (
          getSettingsMenu()
            ?.contains(
              event.target
            )
        ) {
          return;
        }

        closeSettingsMenu();
      }
    );

    /* =======================================================
       Escape закрывает меню
    ======================================================= */

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        closeSettingsMenu();
      }
    );
  }

  /*
    Приводим внешний вид кнопок
    к текущему runtime-состоянию.
  */

  syncToolbar();
}

  function relayoutTrunksIgnoringHidden() {
    const h = host();
    if (!h) return;
  
    h.querySelectorAll("ul").forEach((ul) => {
      const trunk = ul.querySelector(":scope > .trunk");
      if (!trunk) return;
  
      const rows = Array.from(ul.children)
        .filter((el) => el.tagName === "LI")
        .filter((li) => !li.classList.contains("mark-hidden-object"))
        .map((li) => li.querySelector(":scope > .row"))
        .filter(Boolean);
  
      if (rows.length <= 1) {
        trunk.style.height = "0px";
        return;
      }
  
      const ulRect = ul.getBoundingClientRect();
      const firstRect = rows[0].getBoundingClientRect();
      const lastRect = rows[rows.length - 1].getBoundingClientRect();
  
      const top = firstRect.top - ulRect.top + firstRect.height / 2;
      const bottom = lastRect.top - ulRect.top + lastRect.height / 2;
  
      trunk.style.top = `${top}px`;
      trunk.style.height = `${Math.max(0, bottom - top)}px`;
    });
  }

  if (typeof window.render === "function" && !window.render.__markPatched) {
    const _render = window.render;

    window.render = function patchedRenderWithMarks() {
      _render();
      requestAnimationFrame(decorateAllRows);
    };

    window.render.__markPatched = true;
  }

  function init() {
    bindToolbar();
    requestAnimationFrame(decorateAllRows);
  }

  window.markProperty = {
    isMarked,
    setMarked,
    toggleMarked,
    buildMarkDot,

    setState,
    resetTransientState,

    getState() {
      return { ...state };
    },

    setShowMarks,
    setMode,

setHideMarked,
setStrikeMarked,

    closeSettingsMenu,

    refresh: decorateAllRows,

    getMap() {
      return { ...(window.__markMap || {}) };
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
