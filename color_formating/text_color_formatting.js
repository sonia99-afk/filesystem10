(function () {
    if (typeof window === "undefined") return;

// =========================
// Constants / actions
// =========================
  
    const EMPTY_COLOR_FMT = { text: "", bg: "" };
  
    const TEXT_ACTIONS = [
      "textColor1",
      "textColor2",
      "textColor3",
      "textColor4",
      "textColor5",
      "textColor6",
      "textColor7",
      "textColor8",
      "textColor9",
      "textColor0",
    ];
    
    const BLOCK_BG_ACTIONS = [
      "bgColor1",
      "bgColor2",
      "bgColor3",
      "bgColor4",
      "bgColor5",
      "bgColor6",
      "bgColor7",
      "bgColor8",
      "bgColor9",
      "bgColor0",
    ];

    window.__colorFmtMap = window.__colorFmtMap || Object.create(null);
  
// =========================
// DOM / state helpers
// =========================

    function host() {
      return document.getElementById("tree");
    }
  
    function getNodeById(id) {
      if (!id || typeof findWithParent !== "function" || typeof root === "undefined") return null;
      const found = findWithParent(root, id);
      return found ? found.node : null;
    }
  
    function isEditingNow() {
      const ae = document.activeElement;
      if (!ae) return false;
      if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
      if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
      if (ae.isContentEditable) return true;
      return false;
    }
  
    function activeRichEditor() {
      const ae = document.activeElement;
      if (!ae) return null;
    
      if (ae.classList?.contains("edit-rich") && ae.isContentEditable) return ae;
      if (ae.classList?.contains("edit-caption") && ae.isContentEditable) return ae;
    
      return null;
    }
  
    function getTargetRows() {
  const h = host();
  if (!h) return [];

  const multi = Array.from(h.querySelectorAll(".row.multi"));
  if (multi.length) return multi;

  // Табличный режим: выбрана именно ячейка с названием.
  const tableNameCell = h.querySelector(
    "td.table-cell-selected.table-name-cell.row[data-id]"
  );

  if (tableNameCell) {
    return [tableNameCell];
  }

  // Старый режим дерева.
  const sel = h.querySelector(".row.sel");
  return sel ? [sel] : [];
}

// =========================
// Color format storage
// =========================
  
    function cloneColorFmt(fmt) {
      return {
        text: fmt?.text || "",
        bg: fmt?.bg || "",
      };
    }
  
    function getColorFmt(id) {
      return cloneColorFmt(window.__colorFmtMap[id] || EMPTY_COLOR_FMT);
    }
  
    function setColorFmt(id, fmt) {
      window.__colorFmtMap[id] = cloneColorFmt(fmt || EMPTY_COLOR_FMT);
      return window.__colorFmtMap[id];
    }
  
    function emptyColorFmt() {
      return { text: "", bg: "" };
    }

// =========================
// HTML sanitize / color wrappers
// =========================
  
    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  
    function unwrapColorEverywhere(rootEl, cls) {
      rootEl.querySelectorAll(`span.${cls}`).forEach((el) => {
        el.classList.remove(cls);
    
        if (cls === "rt-color") {
          el.style.removeProperty("--rt-color");
        }
        if (cls === "rt-bg") {
          el.style.removeProperty("--rt-bg");
        }
    
        const stillHasColorFmt =
          el.classList.contains("rt-color") ||
          el.classList.contains("rt-bg");
    
        const stillHasTextFmt =
          el.classList.contains("rt-b") ||
          el.classList.contains("rt-i") ||
          el.classList.contains("rt-u") ||
          el.classList.contains("rt-s");
    
        if (!stillHasColorFmt && !stillHasTextFmt) {
          el.replaceWith(...Array.from(el.childNodes));
          return;
        }
    
        const styleParts = [];
        const color = el.style.getPropertyValue("--rt-color") || "";
        const bg = el.style.getPropertyValue("--rt-bg") || "";
    
        if (color) styleParts.push(`--rt-color:${color}`);
        if (bg) styleParts.push(`--rt-bg:${bg}`);
    
        if (styleParts.length) {
          el.setAttribute("style", styleParts.join(";"));
        } else {
          el.removeAttribute("style");
        }
      });
    }
    
    function applyColorToWholeHtmlPreservingFmt(html, text, kind, color) {
      const baseHtml = normalizeRichHtmlKeepingColor(html || escapeHtml(text || ""));
      const tmp = document.createElement("div");
      tmp.innerHTML = baseHtml || escapeHtml(text || "");
    
      if (kind === "text") {
        unwrapColorEverywhere(tmp, "rt-color");
      } else if (kind === "bg") {
        unwrapColorEverywhere(tmp, "rt-bg");
      }
    
      let inner = tmp.innerHTML;
    
      if (kind === "text" && color) {
        inner = `<span class="rt-color" style="--rt-color:${color};">${inner}</span>`;
      }
    
      if (kind === "bg" && color) {
        inner = `<span class="rt-bg" style="--rt-bg:${color};">${inner}</span>`;
      }
    
      return normalizeRichHtmlKeepingColor(inner);
    }

    function normalizeRichHtmlKeepingColor(html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html || "";
  
      function sanitizeElement(el) {
        const tag = (el.tagName || "").toLowerCase();
  
        if (tag === "span") {
          const keep =
            el.classList.contains("rt-b") ||
            el.classList.contains("rt-i") ||
            el.classList.contains("rt-u") ||
            el.classList.contains("rt-s") ||
            el.classList.contains("rt-color") ||
            el.classList.contains("rt-bg");
  
          if (!keep) {
            el.replaceWith(...Array.from(el.childNodes));
            return;
          }
  
          const styleParts = [];
          if (el.classList.contains("rt-color")) {
            const color = el.style.getPropertyValue("--rt-color") || "";
            if (color) styleParts.push(`--rt-color:${color}`);
          }
          if (el.classList.contains("rt-bg")) {
            const bg = el.style.getPropertyValue("--rt-bg") || "";
            if (bg) styleParts.push(`--rt-bg:${bg}`);
          }
  
          if (styleParts.length) {
            el.setAttribute("style", styleParts.join(";"));
          } else {
            el.removeAttribute("style");
          }
          return;
        }
  
        if (tag === "br") return;
        if (tag === "b" || tag === "strong" || tag === "i" || tag === "em" || tag === "u" || tag === "s" || tag === "strike" || tag === "del") return;
  
        el.replaceWith(...Array.from(el.childNodes));
      }
  
      function walk(node) {
        for (const ch of Array.from(node.childNodes)) {
          if (ch.nodeType === Node.ELEMENT_NODE) {
            walk(ch);
            sanitizeElement(ch);
          }
        }
      }
  
      walk(tmp);
      return tmp.innerHTML;
    }
  
    function detectWholeNodeColorFmtFromHtml(html, text) {
      const tmp = document.createElement("div");
      tmp.innerHTML = normalizeRichHtmlKeepingColor(html || escapeHtml(text || ""));
  
      function collectCoverage(kindClass, cssVarName) {
        const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
        let total = 0;
        let covered = 0;
        const values = new Set();
  
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const value = node.nodeValue || "";
          if (!value) continue;
  
          total += value.length;
  
          let p = node.parentNode;
          let matched = false;
          while (p && p !== tmp) {
            if (p.nodeType === 1 && p.classList?.contains(kindClass)) {
              const v = p.style?.getPropertyValue(cssVarName)?.trim() || "";
              values.add(v);
              covered += value.length;
              matched = true;
              break;
            }
            p = p.parentNode;
          }
  
          if (!matched) values.add("");
        }
  
        if (total === 0) return "";
        if (values.size === 1) return Array.from(values)[0] || "";
        return "__mixed__";
      }
  
      return {
        text: collectCoverage("rt-color", "--rt-color"),
        bg: collectCoverage("rt-bg", "--rt-bg"),
      };
    }

// =========================
// Whole-node color applying
// =========================
  
    function getWholeColorFmtForNode(node) {
      if (!node) return emptyColorFmt();
  
      if (node.nameHtml) {
        const fmt = detectWholeNodeColorFmtFromHtml(node.nameHtml, node.name || "");
        return {
          text: fmt.text === "__mixed__" ? "" : fmt.text,
          bg: fmt.bg === "__mixed__" ? "" : fmt.bg,
        };
      }
  
      return getColorFmt(node.id);
    }
  
    function applyColorToWholeNode(node, kind, color) {
      if (!node) return false;
    
      const curFmt = getWholeColorFmtForNode(node);
      const nextFmt = {
        text: kind === "text" ? (color || "") : (curFmt.text || ""),
        bg: kind === "bg" ? (color || "") : (curFmt.bg || ""),
      };
    
      const baseHtml =
        window.__fmtSync?.buildRichHtmlFromNode?.(node) ||
        node.nameHtml ||
        "";

      const nextHtml = applyColorToWholeHtmlPreservingFmt(
        baseHtml,
        node.name || "",
        kind,
        color || ""
      );
    
      node.nameHtml = nextHtml || "";
      setColorFmt(node.id, nextFmt);
      return true;
    }

// =========================
// Editor selection helpers
// =========================
  
    function getSelectionOffsetsInEditor(ed) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
  
      const range = sel.getRangeAt(0);
      if (!ed.contains(range.startContainer) || !ed.contains(range.endContainer)) return null;
  
      function countNodeLength(node) {
        if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue || "").length;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") return 1;
  
        let len = 0;
        for (const ch of Array.from(node.childNodes || [])) len += countNodeLength(ch);
        return len;
      }
  
      function offsetFromRoot(container, offset) {
        let total = 0;
        let found = false;
  
        function walk(node) {
          if (found) return;
  
          if (node === container) {
            if (node.nodeType === Node.TEXT_NODE) {
              total += offset;
            } else {
              const kids = Array.from(node.childNodes || []);
              for (let i = 0; i < Math.min(offset, kids.length); i++) {
                total += countNodeLength(kids[i]);
              }
            }
            found = true;
            return;
          }
  
          if (node.nodeType === Node.TEXT_NODE) {
            total += (node.nodeValue || "").length;
            return;
          }
  
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
            total += 1;
            return;
          }
  
          for (const ch of Array.from(node.childNodes || [])) {
            walk(ch);
            if (found) return;
          }
        }
  
        walk(ed);
        return total;
      }
  
      const start = offsetFromRoot(range.startContainer, range.startOffset);
      const end = offsetFromRoot(range.endContainer, range.endOffset);
  
      return {
        start: Math.min(start, end),
        end: Math.max(start, end),
      };
    }
  
    function setSelectionOffsetsInEditor(ed, start, end) {
      const sel = window.getSelection();
      if (!sel) return;
  
      const range = document.createRange();
      let pos = 0;
      let startSet = false;
      let endSet = false;
  
      function walk(node) {
        if (endSet) return;
  
        if (node.nodeType === Node.TEXT_NODE) {
          const len = (node.nodeValue || "").length;
  
          if (!startSet && start <= pos + len) {
            range.setStart(node, Math.max(0, start - pos));
            startSet = true;
          }
          if (!endSet && end <= pos + len) {
            range.setEnd(node, Math.max(0, end - pos));
            endSet = true;
          }
  
          pos += len;
          return;
        }
  
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
          if (!startSet && start <= pos + 1) {
            range.setStartBefore(node);
            startSet = true;
          }
          if (!endSet && end <= pos + 1) {
            range.setEndBefore(node);
            endSet = true;
          }
          pos += 1;
          return;
        }
  
        for (const ch of Array.from(node.childNodes || [])) {
          walk(ch);
          if (endSet) return;
        }
      }
  
      walk(ed);
  
      if (!startSet || !endSet) {
        range.selectNodeContents(ed);
        range.collapse(false);
      }
  
      sel.removeAllRanges();
      sel.addRange(range);
    }
  
    function textNodesIn(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = [];
      while (walker.nextNode()) out.push(walker.currentNode);
      return out;
    }
  
    function wrapRangeInTextNode(textNode, start, end, makeWrapper) {
      const text = textNode.nodeValue || "";
      const left = text.slice(0, start);
      const mid = text.slice(start, end);
      const right = text.slice(end);
  
      const frag = document.createDocumentFragment();
      if (left) frag.appendChild(document.createTextNode(left));
  
      if (mid) {
        const wrap = makeWrapper();
        wrap.textContent = mid;
        frag.appendChild(wrap);
      }
  
      if (right) frag.appendChild(document.createTextNode(right));
      textNode.parentNode.replaceChild(frag, textNode);
    }

// =========================
// Editor / target color applying
// =========================
  
    function applyColorToSelectionInEditor(ed, kind, color) {
      const sel = getSelectionOffsetsInEditor(ed);
      if (!sel) return false;
      if (sel.start === sel.end) return false;
    
      const normalized = normalizeRichHtmlKeepingColor(ed.innerHTML || "");
      ed.innerHTML = normalized || ed.innerHTML || "";
    
      const nodes = textNodesIn(ed);
      let pos = 0;
    
      for (const node of nodes) {
        const len = (node.nodeValue || "").length;
        const from = Math.max(pos, sel.start);
        const to = Math.min(pos + len, sel.end);
    
        if (from < to) {
          const localStart = from - pos;
          const localEnd = to - pos;
    
          wrapRangeInTextNode(node, localStart, localEnd, () => {
            const span = document.createElement("span");
    
            if (kind === "text") {
              span.className = "rt-color";
              if (color) span.style.setProperty("--rt-color", color);
            } else {
              span.className = "rt-bg";
              if (color) span.style.setProperty("--rt-bg", color);
            }
    
            return span;
          });
        }
    
        pos += len;
      }
    
      ed.innerHTML = normalizeRichHtmlKeepingColor(ed.innerHTML || "");
      setSelectionOffsetsInEditor(ed, sel.start, sel.end);
    
      return true;
    }
  
    function applyColorToTargets(kind, color) {
      const ed = activeRichEditor();
      if (ed) {
        const changed = applyColorToSelectionInEditor(ed, kind, color);
        if (!changed) {
          if (!ed.__pendingColorFmt) ed.__pendingColorFmt = { text: "", bg: "" };
          ed.__pendingColorFmt[kind] = color || "";
        }
        syncToolbarFromContext();
        return;
      }
  
      if (window.hotkeysMode === "custom") return;
      if (isEditingNow()) return;
  
      const rows = getTargetRows();
      if (!rows.length) return;
  
      let pushed = false;
      let changed = false;
  
      for (const row of rows) {
        const id = row.dataset?.id;
        if (!id) continue;
  
        const node = getNodeById(id);
        if (!node) continue;
  
        if (!pushed && typeof pushHistory === "function") {
          pushHistory();
          pushed = true;
        }
  
        changed = applyColorToWholeNode(node, kind, color) || changed;
      }
  
      if (changed && typeof render === "function") {
        render();
      }
  
      syncToolbarFromContext();
    }

// =========================
// Toolbar sync
// =========================
  
    function getActiveNodeColorContext() {
      const rows = getTargetRows();
      const row = rows[0];
      const id = row?.dataset?.id;
      if (!id) return emptyColorFmt();
  
      const node = getNodeById(id);
      return getToolbarColorFmtForNode(node);
    }

    function getToolbarColorFmtForNode(node) {
      if (!node) return emptyColorFmt();
    
      const stored = getColorFmt(node.id);
    
      if (stored.text || stored.bg) {
        return stored;
      }
    
      return getWholeColorFmtForNode(node);
    }

    function getCaretColorFmtInEditor(ed) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return emptyColorFmt();
    
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
    
      if (!ed.contains(node)) return emptyColorFmt();
    
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
    
      let text = "";
      let bg = "";
    
      while (node && node !== ed) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!text && node.classList?.contains("rt-color")) {
            text = node.style.getPropertyValue("--rt-color") || "";
          }
    
          if (!bg && node.classList?.contains("rt-bg")) {
            bg = node.style.getPropertyValue("--rt-bg") || "";
          }
        }
    
        node = node.parentElement;
      }
    
      return {
        text: text.trim(),
        bg: bg.trim(),
      };
    }
  
    function syncToolbarFromContext() {
      const ed = activeRichEditor();
      if (ed) {
        const pending = ed.__pendingColorFmt || {};
        const caretFmt = getCaretColorFmtInEditor(ed);
      
        const text =
          pending.text != null && pending.text !== ""
            ? pending.text
            : caretFmt.text;
      
        const bg =
          pending.bg != null && pending.bg !== ""
            ? pending.bg
            : caretFmt.bg;
      
        window.colorToolsUI?.setTextColor?.(text || "default", false);
        window.colorToolsUI?.setBgColor?.(bg || "transparent", false);
        return;
      }
  
      const ctx = getActiveNodeColorContext();
      window.colorToolsUI?.setTextColor?.(ctx.text || "default", false);
      window.colorToolsUI?.setBgColor?.(ctx.bg || "transparent", false);
    }
  
    function bindToolbarEvents() {
      if (window.__colorFormattingToolbarBound) return;
      window.__colorFormattingToolbarBound = true;
  
      window.addEventListener("color-tools-change", (e) => {
        const detail = e.detail || {};
        if (!detail.kind) return;
  
        if (detail.kind === "text") {
          const v =
            detail.value === "default" ||
            detail.value === "transparent"
              ? "#000000"
              : detail.value || "#000000";
        
          applyColorToTargets("text", v);
          return;
        }

        if (detail.kind === "block") {
          const ed = activeRichEditor();
        
          if (ed && ed.classList.contains("edit-caption")) {
            const v = detail.value === "transparent" ? "" : detail.value || "";
        
            const nodeId =
              ed.closest(".caption")?.dataset?.nodeId ||
              ed.parentElement?.closest(".caption")?.dataset?.nodeId;
        
            const node = getNodeById(nodeId);
        
            if (node) {
              node.captionsBgColor = v;
        
              const caps = ed.closest(".captions");
              if (caps) {
                caps.style.backgroundColor = v;
              }
            }
        
            syncToolbarFromContext();
            return;
          }
        
          return;
        }
  
        if (detail.kind === "bg") {
          const v = detail.value === "transparent" ? "" : detail.value || "";
          applyColorToTargets("bg", v);
        }
      });
    }

// =========================
// Color hotkeys
// =========================
  
    function getColorFromSwatches(selector, index) {
      const dots = Array.from(document.querySelectorAll(selector));
      const dot = dots[index];
      return dot?.dataset?.color || "";
    }
    
    function colorIndexFromAction(action, prefix) {
      const key = action.slice(prefix.length);
      if (key === "0") return 9;
      const n = Number(key);
      if (!Number.isFinite(n) || n < 1) return -1;
      return n - 1;
    }
    
    function colorByAction(action) {
      if (TEXT_ACTIONS.includes(action)) {
        const index = colorIndexFromAction(action, "textColor");

        return {
          kind: "text",
          color: getColorFromSwatches(
            '#textColorSwatches .color-dot[data-kind="text"]',
            index
          )
        };
      }

      if (BLOCK_BG_ACTIONS.includes(action)) {
        const index = colorIndexFromAction(action, "bgColor");

        return {
          kind: "block",
          color: getColorFromSwatches(
            '#blockBgSwatches .color-dot[data-kind="block"]',
            index
          )
        };
      }

      return null;
    }
  
    function matchColorHotkeyAction(e) {
      if (typeof window.isHotkey !== "function") return null;
  
      for (const action of TEXT_ACTIONS) {
        if (window.isHotkey(e, action)) return action;
      }
  
      for (const action of BLOCK_BG_ACTIONS) {
        if (window.isHotkey(e, action)) return action;
      }
  
      return null;
    }
  
    function installConfigDrivenHotkeys() {
      if (window.__colorFormattingHotkeysInstalled) return;
      window.__colorFormattingHotkeysInstalled = true;
  
      window.addEventListener("keydown", (e) => {
        if (window.hotkeysMode === "custom") return;
  
        const ae = document.activeElement;
        const rich = activeRichEditor();
  
        if (typeof isTextEditingElement === "function") {
          if (ae && !rich && isTextEditingElement(ae)) return;
        }
  
        const action = matchColorHotkeyAction(e);
        if (!action) return;
  
        const matched = colorByAction(action);
        if (!matched) return;
  
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
  
        if (matched.kind === "text") {
          window.colorToolsUI?.setTextColor?.(matched.color || "default", true);
          return;
        }
        
        if (matched.kind === "block") {
          window.colorToolsUI?.setBlockColor?.(matched.color || "transparent", true);
        }
      }, true);
    }

// =========================
// Render / history patches
// =========================
  
    function patchRenderSync() {
      if (typeof window.render !== "function") return;
      if (window.render.__colorFmtPatched) return;
  
      const originalRender = window.render;
      window.render = function patchedRenderColorFmt() {
        originalRender();
        try {
          syncToolbarFromContext();
        } catch (_) {}
      };
      window.render.__colorFmtPatched = true;
    }
  
// =========================
// Init / public API
// =========================
  
    function init() {
      bindToolbarEvents();
      installConfigDrivenHotkeys();
      patchRenderSync();
  
      const sync = () => {
        try {
          syncToolbarFromContext();
        } catch (_) {}
      };
  
      document.addEventListener("selectionchange", () => {
        const ed = activeRichEditor();
        if (!ed) return;
        sync();
      });
  
      window.addEventListener("focus", sync, true);
      document.addEventListener("click", sync, true);
      document.addEventListener("keyup", sync, true);
  
      sync();
    }
  
    window.colorFormatting = {
      setTextColor(color) {
        applyColorToTargets("text", color || "");
      },
      setBgColor(color) {
        applyColorToTargets("bg", color || "");
      },
      syncToolbar: syncToolbarFromContext,
      matchColorHotkeyAction,
    };
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
