(function () {
    if (typeof window === "undefined") return;
  
    window.__blockBgMap = window.__blockBgMap || Object.create(null);
  
    function host() {
      return document.getElementById("tree");
    }
  
    function cssEscapeLocal(s) {
      const v = String(s);
      if (window.CSS && typeof CSS.escape === "function") return CSS.escape(v);
      return v.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
    }
  
    function rowById(id) {
      const h = host();
      if (!h || !id) return null;
      return h.querySelector(`.row[data-id="${cssEscapeLocal(id)}"]`);
    }
  
    function applyBgToRow(row) {
      if (!row) return;
  
      const id = row.dataset?.id;
      if (!id) return;
  
      const bg = window.__blockBgMap?.[id] || "";
      row.style.backgroundColor = bg || "";
    }
  
    function applyBgToAllRows() {
      const h = host();
      if (!h) return;
  
      h.querySelectorAll(".row[data-id]").forEach(applyBgToRow);
    }
  
    function getTargetIds() {
      const h = host();
      if (!h) return [];
    
      const multiIds = Array.from(h.querySelectorAll(".row.multi"))
        .map((row) => row.dataset?.id)
        .filter(Boolean);
    
      if (multiIds.length) return [...new Set(multiIds)];
    
      if (typeof selectedId !== "undefined" && selectedId) {
        return [selectedId];
      }
    
      return [];
    }
    
    function applyBlockBgToSelected(color) {
      const ids = getTargetIds();
      if (!ids.length) return;
    
      const nextColor = color === "transparent" ? "" : String(color || "").trim();
    
      let hasChanges = false;
    
      for (const id of ids) {
        const prevColor = window.__blockBgMap?.[id] || "";
        if (prevColor !== nextColor) {
          hasChanges = true;
          break;
        }
      }
    
      if (!hasChanges) return;
    
      if (typeof pushHistory === "function") {
        pushHistory();
      }
    
      if (!window.__blockBgMap) {
        window.__blockBgMap = Object.create(null);
      }
    
      for (const id of ids) {
        if (nextColor) {
          window.__blockBgMap[id] = nextColor;
        } else {
          delete window.__blockBgMap[id];
        }
      }
    
      if (typeof render === "function") {
        render();
      } else {
        ids.forEach((id) => applyBgToRow(rowById(id)));
      }
    }
  
    window.addEventListener("color-tools-change", (e) => {
      const detail = e.detail || {};
      if (detail.kind !== "block") return;
    
      const ae = document.activeElement;
    
      if (
        ae &&
        ae.classList?.contains("edit-caption") &&
        ae.isContentEditable
      ) {
        return;
      }
    
      applyBlockBgToSelected(detail.value || "");
    });
  
    if (typeof window.render === "function" && !window.render.__blockBgPatched) {
      const _render = window.render;
      window.render = function patchedRenderWithBlockBg() {
        _render();
        applyBgToAllRows();
      };
      window.render.__blockBgPatched = true;
    }
  
    window.blockBgFormatting = {
      applyToSelected: applyBlockBgToSelected,
      refresh: applyBgToAllRows,
      getMap() {
        return { ...(window.__blockBgMap || {}) };
      }
    };
  })();
