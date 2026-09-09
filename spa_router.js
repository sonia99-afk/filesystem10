// spa_router.js
// SPA-router для переключения отображений без перезагрузки страницы.
// Подгружает JS/CSS режимов лениво, только когда режим реально открыт.

(function () {
    if (typeof window === "undefined") return;
  
    const loadedScripts = new Set();
    const loadedStyles = new Set();
  
    const VIEW_ASSETS = {
      schema: {
        css: [],
        js: [],
      },
  
      table: {
        css: [
          "css/views/table/table_base.css",
          "css/views/table/table_column_resize.css",
          "css/views/table/table_column_width_dialog.css",
          "css/views/table/table_column_reorder.css",
          "css/views/table/table_cells.css",

          "css/views/table/table_collapse_column.css",
          "css/views/table/table_name_cell.css",
          "css/views/table/table_dropdown_cells.css",
          "css/views/table/table_datetime_cells.css",
          "css/views/table/table_date_picker.css",
          "css/views/table/table_time_picker.css",
          "css/views/table/table_rich_text_cells.css",
          "css/views/table/table_upload_cells.css",
          "css/views/table/table_timer_cells.css",
          "css/views/table/table_guard_fields.css",
          "css/views/table/table_drag_drop.css",

          "css/views/table/table_view.css",
          "css/views/table/table_multi_select.css"
        ],
        js: [
          "table/table_props.js",
          "table/table_columns.js",
          "table/table_tags.js",

          "table/table_dropdown_cells.js",
          "table/table_datetime_cells.js",
          "table/table_date_picker.js",
          "table/table_time_picker.js",
          "table/table_direct_cells.js",
          "table/table_rich_text_cells.js",
          "table/table_builtin_cells.js",
          "table/table_cell_editors.js",

          "table/table_tab_navigation.js",
          "table/table_collapse_column.js",
          "table/table_column_resize.js",
          "table/table_column_width_dialog.js",
          "table/table_column_reorder.js",
          "table/table_descendant_highlight.js",

          "table/table_upload_cells.js",
          "table/table_upload_hotkeys.js",
          "table/table_timer_cells.js",

          "table/table_property_cells.js",
          "table/table_rows.js",

          "table/table_view.js",
          "table/table_cell_nav.js",
          "table/table_hotkeys.js",
          "table/table_drag_drop.js",
          "table/table_multi_select.js",
          "table/table_autoscroll.js"
          
        ],
      },

      list: {
        css: ["css/views/list_view.css"],
        js: ["list_view.js"],
      },
  
      hierarchy: {
        css: [
          "css/views/hierarchy_view.css",
          "css/views/hierarchy_horizontal_view.css",
        ],
        js: [
          "hierarchy_view.js",
          "hierarchy_horizontal_view.js",
        ],
      },
  
      aicycle: {
        css: [
          "css/views/icicle_horizontal_view.css",
          "css/views/icicle_vertical_view.css",
        ],
        js: [
          "icicle_horizontal_view.js",
          "icicle_vertical_view.js",
        ],
      },
  
      text: {
        css: ["css/views/text.css"],
        js: ["tg_export_mode.js"],
      },
    };

    /*
  Объединённый вид переиспользует
  существующие файлы таблицы.

  Его собственные JS и CSS загружаются
  только при открытии этого маршрута.
*/

VIEW_ASSETS["structure-table"] = {
  css: [
    ...VIEW_ASSETS.table.css,
    "css/views/structure_table/structure_table.css",
  ],

  js: [
    ...VIEW_ASSETS.table.js,
    "structure_table/structure_table_row_sync.js",
    "structure_table/structure_table_view.js",
  ],
};
  
    function normalizeView(view) {
      if (!view) return VIEW.SCHEMA;
  
      if (view === "schema") return VIEW.SCHEMA;
      if (view === "hierarchy") return VIEW.HIERARCHY;
      if (view === "aicycle") return VIEW.AICYCLE;
      if (view === "table") return VIEW.TABLE;
      if (view === "structure-table") {
  return VIEW.STRUCTURE_TABLE;
}
      if (view === "list") return VIEW.LIST;
      if (view === "text") return VIEW.TEXT;
  
      return view;
    }
  
    function viewToUrlValue(view) {
      const v = normalizeView(view);
  
      if (v === VIEW.SCHEMA) return "schema";
      if (v === VIEW.HIERARCHY) return "hierarchy";
      if (v === VIEW.AICYCLE) return "aicycle";
      if (v === VIEW.TABLE) return "table";
      if (v === VIEW.STRUCTURE_TABLE) {
  return "structure-table";
}
      if (v === VIEW.LIST) return "list";
      if (v === VIEW.TEXT) return "text";
  
      return "schema";
    }
  
    function setUrl(
  view,
  mode = "push",
  options = {}
) {
  const url =
    new URL(
      window.location.href
    );

  const value =
    viewToUrlValue(view);

  const tabId =
    String(
      options.tabId || ""
    );

  const projectId =
    String(
      options.projectId ||
      window.projectAutosave
        ?.getActiveProjectId?.() ||
      ""
    );

  if (projectId) {
    url.searchParams.set(
      "project",
      projectId
    );
  }

  /*
    Когда есть конкретная вкладка,
    view оставляем даже для schema.
  */

  if (
    value === "schema" &&
    !tabId
  ) {
    url.searchParams.delete(
      "view"
    );
  } else {
    url.searchParams.set(
      "view",
      value
    );
  }

  if (tabId) {
    url.searchParams.set(
      "tab",
      tabId
    );
  } else {
    url.searchParams.delete(
      "tab"
    );
  }

  const next =
    url.pathname +
    url.search +
    url.hash;

  const current =
    window.location.pathname +
    window.location.search +
    window.location.hash;

  if (next === current) {
    return;
  }

  const historyState = {
    project:
      projectId || null,

    view:
      value,

    tab:
      tabId || null,
  };

  if (mode === "replace") {
    history.replaceState(
      historyState,
      "",
      next
    );
  } else {
    history.pushState(
      historyState,
      "",
      next
    );
  }
}
  
    function loadCss(href) {
      if (loadedStyles.has(href)) return Promise.resolve();
  
      const already = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
      ).some((link) => {
        const attr = link.getAttribute("href") || "";
        return attr === href || attr.endsWith("/" + href);
      });
  
      if (already) {
        loadedStyles.add(href);
        return Promise.resolve();
      }
  
      return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
  
        link.onload = () => {
          loadedStyles.add(href);
          resolve();
        };
  
        link.onerror = () => {
          reject(new Error("Не удалось загрузить CSS: " + href));
        };
  
        document.head.appendChild(link);
      });
    }
  
    function loadScript(src) {
      if (loadedScripts.has(src)) return Promise.resolve();
  
      const already = Array.from(document.scripts).some((script) => {
        const attr = script.getAttribute("src") || "";
        return attr === src || attr.endsWith("/" + src);
      });
  
      if (already) {
        loadedScripts.add(src);
        return Promise.resolve();
      }
  
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
  
        script.onload = () => {
          loadedScripts.add(src);
          resolve();
        };
  
        script.onerror = () => {
          reject(new Error("Не удалось загрузить JS: " + src));
        };
  
        document.body.appendChild(script);
      });
    }
  
    async function loadAssetsForView(view) {
      const key = viewToUrlValue(view);
      const assets = VIEW_ASSETS[key];
  
      if (!assets) return;
  
      for (const href of assets.css || []) {
        await loadCss(href);
      }
  
      for (const src of assets.js || []) {
        await loadScript(src);
      }
    }
  
    function applyBodyViewClass(view) {
      const target = normalizeView(view);
  
      document.body.classList.toggle("view-schema", target === VIEW.SCHEMA);
      document.body.classList.toggle("view-hierarchy", target === VIEW.HIERARCHY);
      document.body.classList.toggle(
  "view-table",
  window.isTableLikeView
    ? window.isTableLikeView(target)
    : target === VIEW.TABLE
);

document.body.classList.toggle(
  "view-structure-table",
  target === VIEW.STRUCTURE_TABLE
);

document.body.classList.remove("table-page");
    }
  
    function openSchema(options = {}) {
      currentView = VIEW.SCHEMA;
      treeHasFocus = true;
  
      applyBodyViewClass(VIEW.SCHEMA);
  
      if (typeof setTelegramMode === "function") {
        setTelegramMode(false);
      }
  
      if (options.updateUrl !== false) {
        setUrl(VIEW.SCHEMA, options.replaceUrl ? "replace" : "push");
      }
  
      if (
  options.render !== false
) {
  render?.();
}

if (
  options.sync !== false
) {
  syncViewButtons?.();
}
    }
  
    async function openTable(options = {}) {
      await loadAssetsForView(VIEW.TABLE);
  
      currentView =
  VIEW.TABLE;

treeHasFocus =
  true;
  
      applyBodyViewClass(VIEW.TABLE);
  
      if (typeof setTelegramMode === "function") {
        setTelegramMode(false);
      }
  
      if (options.updateUrl !== false) {
        setUrl(VIEW.TABLE, options.replaceUrl ? "replace" : "push");
      }
  
      if (
  options.render !== false
) {
  render?.();
}

if (
  options.sync !== false
) {
  syncViewButtons?.();
}
    }

    async function openStructureTable(options = {}) {
  await loadAssetsForView(VIEW.STRUCTURE_TABLE);

  currentView =
  VIEW.STRUCTURE_TABLE;

treeHasFocus =
  true;

  applyBodyViewClass(VIEW.STRUCTURE_TABLE);

  if (typeof setTelegramMode === "function") {
    setTelegramMode(false);
  }

  if (options.updateUrl !== false) {
    setUrl(
      VIEW.STRUCTURE_TABLE,
      options.replaceUrl ? "replace" : "push"
    );
  }

  if (
  options.render !== false
) {
  render?.();
}

if (
  options.sync !== false
) {
  syncViewButtons?.();
}
}
  
    async function openRegularView(view, options = {}) {
      const target = normalizeView(view);
  
      await loadAssetsForView(target);
  
      applyBodyViewClass(target);
  
      currentView =
  target;

treeHasFocus =
  true;

if (
  target === VIEW.TEXT
) {
  if (
    typeof setTelegramMode ===
      "function"
  ) {
    setTelegramMode(true);
  }
} else {
  if (
    typeof setTelegramMode ===
      "function"
  ) {
    setTelegramMode(false);
  }
}

if (
  options.render !== false
) {
  render?.();
}
  
      if (options.updateUrl !== false) {
        setUrl(target, options.replaceUrl ? "replace" : "push");
      }
  
      if (
  options.sync !== false
) {
  syncViewButtons?.();
}
    }
  
    async function open(view, options = {}) {
      const target = normalizeView(view);
  
      if (target === VIEW.SCHEMA) {
        openSchema(options);
        return;
      }

     if (target === VIEW.TABLE) {
  await openTable(options);
  return;
}

if (target === VIEW.STRUCTURE_TABLE) {
  await openStructureTable(options);
  return;
}

await openRegularView(target, options);
    }
  
    function getViewFromUrl() {
      const params = new URLSearchParams(location.search);
      return params.get("view") || "schema";
    }
  
    function openFromUrl() {
      open(getViewFromUrl(), {
        updateUrl: false,
        replaceUrl: true,
      });
    }
  
  
   window.appRouter = {
  open,
  openSchema,
  openTable,
  openStructureTable,
  openRegularView,
  loadCss,
  loadScript,
  loadAssetsForView,
  setUrl,
};
  })();
