// tg_export_mode.js
// Режим Telegram: экспорт ASCII + ручное редактирование + импорт обратно в дерево.
// Автосохранение при выходе из текстового режима.

(function () {
  let tgMode = false;
  let lastAscii = '';

  function exportTreeFromRoot() {
    function plainName(node) {
      if (node.nameHtml) {
        const tmp = document.createElement("div");
        tmp.innerHTML = node.nameHtml;
        return (tmp.textContent || "").trim();
      }
  
      return (node.name || "").trim();
    }
  
    function walk(node) {
      return {
        label: plainName(node),
        captions: (node.captions || []).map(c => c.text || ""),
        children: (node.children || []).map(walk)
      };
    }
  
    return walk(root);
  }

  function getCopyBtn() {
    return document.getElementById('tgCopy');
  }

  function getCurrentCopyText() {
    if (tgMode) {
      const ta = document.querySelector('textarea.tg-export');
      if (ta) return ta.value;
    }

    const tree = exportTreeFromRoot();
    return tree ? asciiFromTree(tree) : '```\n(дерево не найдено)\n```';
  }

  function installCopyHandler() {
    const copyBtn = getCopyBtn();
    if (!copyBtn || copyBtn.__tgCopyInstalled) return;
    copyBtn.__tgCopyInstalled = true;

    copyBtn.onclick = async () => {
      try {
        const text = getCurrentCopyText();
        await navigator.clipboard.writeText(text);
      } catch (e) {
        alert('Не получилось скопировать.');
      }
    };
  }

  function getNodeLabelFromRow(row) {
    const clone = row.cloneNode(true);

    const act = clone.querySelector('.act');
    if (act) act.remove();

    return (clone.textContent || '').trim();
  }

  function getCaptionText(capEl) {
    return (capEl.textContent || '')
      .replace(/\r/g, '')
      .trim();
  }

  function buildTreeFromDom() {
    const host = document.getElementById('tree');
    if (!host) return null;

    const ul = host.querySelector('ul');
    if (!ul) return null;

    function walkLi(li) {
      const row = li.querySelector(':scope > .row');
      if (!row) return null;

      const node = {
        label: getNodeLabelFromRow(row),
        captions: [],
        children: []
      };

      const caps = li.querySelector(':scope > .captions');

      if (caps) {
        const capEls = Array.from(
          caps.querySelectorAll(':scope > .caption')
        );

        for (const capEl of capEls) {
          const txt = getCaptionText(capEl);
          if (txt) node.captions.push(txt);
        }
      }

      const childUl = li.querySelector(':scope > ul');

      if (childUl) {
        const childLis = Array.from(childUl.children)
          .filter(el => el.tagName === 'LI');

        for (const chLi of childLis) {
          const chNode = walkLi(chLi);
          if (chNode) node.children.push(chNode);
        }
      }

      return node;
    }

    const topLi =
      ul.querySelector(':scope > li') ||
      ul.querySelector('li');

    if (!topLi) return null;

    return walkLi(topLi);
  }

  function dashByLevel(level) {
    if (level <= 0) return '';
    return Array(level).fill('-').join(' ') + ' ';
  }

  function asciiFromTree(tree) {
    const lines = [];

    function rec(node, depth) {
      lines.push(dashByLevel(depth) + node.label);

      const caps = node.captions || [];

      for (const cap of caps) {
        const parts = String(cap || '')
          .replace(/\r/g, '')
          .split('\n');

        parts.forEach((part, index) => {
          if (index === 0) lines.push('* ' + part);
          else lines.push(part);
        });
      }

      (node.children || []).forEach(ch => rec(ch, depth + 1));
    }

    rec(tree, 0);

    return '```\n' + lines.join('\n') + '\n```';
  }

  function stripCodeFences(s) {
    const t = String(s || '').trim();

    if (t.startsWith('```') && t.endsWith('```')) {
      return t
        .replace(/^```[\s\r\n]*/, '')
        .replace(/[\s\r\n]*```$/, '');
    }

    return t;
  }

  function treeFromAscii(text) {
    const clean = stripCodeFences(text);

    const lines = clean
      .split('\n')
      .map(l => l.replace(/\r/g, '').trimEnd());

    const stack = [];
    let newRoot = null;
    let lastNode = null;

    let captionBuffer = null;

    function makeParsedNode(level, name) {
      return {
        id: Math.random().toString(36).slice(2),
        level,
        name,
        nameHtml: "",
        captions: [],
        children: []
      };
    }

    function flushCaptionBuffer() {
      if (!lastNode || !captionBuffer) {
        captionBuffer = null;
        return;
      }

      const text = captionBuffer.join('\n').trim();
      captionBuffer = null;

      if (!text) return;

      if (!Array.isArray(lastNode.captions)) {
        lastNode.captions = [];
      }

      lastNode.captions.push({
        id: Math.random().toString(36).slice(2),
        text,
        textHtml: ""
      });
    }

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (!trimmed) {
        if (captionBuffer) {
          captionBuffer.push('');
        }
        continue;
      }

      // root
      if (
        !newRoot &&
        !/^\s*-/.test(line) &&
        !/^\s*\*/.test(line)
      ) {
        flushCaptionBuffer();

        const rootName = trimmed;
        if (!rootName) continue;

        const rootNode = makeParsedNode(0, rootName);

        newRoot = rootNode;
        stack.length = 0;
        stack.push(rootNode);

        lastNode = rootNode;
        continue;
      }

      // caption
      const captionMatch = line.match(/^\s*\*\s?(.*)$/);

      if (captionMatch) {
        flushCaptionBuffer();

        if (!lastNode) continue;

        captionBuffer = [captionMatch[1] || ''];
        continue;
      }

      // node
      const nodeMatch = line.match(/^((?:-\s*)+)\s*(.+)$/);

      if (nodeMatch) {
        flushCaptionBuffer();

        const level =
          (nodeMatch[1].match(/-/g) || []).length;

        const name = (nodeMatch[2] || '').trim();

        if (!name) continue;

        const desiredLevel = Math.max(
          1,
          Math.min(LEVEL.STEP, level)
        );

        const node = makeParsedNode(desiredLevel, name);

        if (!newRoot) {
          const rootNode = makeParsedNode(
            0,
            DEFAULT_NAME?.[0] || 'Уровень 0'
          );

          newRoot = rootNode;
          stack.length = 0;
          stack.push(rootNode);

          lastNode = rootNode;
        }

        while (stack.length > node.level) {
          stack.pop();
        }

        while (stack.length < node.level) {
          const placeholderLevel = stack.length;

          const placeholder = makeParsedNode(
            placeholderLevel,
            DEFAULT_NAME?.[placeholderLevel] ||
            `Уровень ${placeholderLevel}`
          );

          const p = stack[stack.length - 1];

          if (!p) break;

          p.children.push(placeholder);
          stack.push(placeholder);
        }

        const parent = stack[stack.length - 1];
        if (!parent) continue;

        parent.children.push(node);

        stack.push(node);
        lastNode = node;

        continue;
      }

      // continuation
      if (captionBuffer) {
        captionBuffer.push(trimmed);
        continue;
      }

      if (lastNode) {
        captionBuffer = [trimmed];
      }
    }

    flushCaptionBuffer();

    return newRoot;
  }

  function plainFromHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || "").trim();
  }
  
  function nodePlainName(node) {
    return (node.name || plainFromHtml(node.nameHtml) || "").trim();
  }
  
  function captionPlainText(cap) {
    return (cap.text || plainFromHtml(cap.textHtml) || "").trim();
  }

  function transferSideData(oldId, newId) {
    if (!oldId || !newId || oldId === newId) return;
  
    if (window.__markMap && window.__markMap[oldId]) {
      window.__markMap[newId] = window.__markMap[oldId];
      delete window.__markMap[oldId];
    }
  
    if (window.__markHiddenMap && window.__markHiddenMap[oldId]) {
      window.__markHiddenMap[newId] = window.__markHiddenMap[oldId];
      delete window.__markHiddenMap[oldId];
    }
  
    if (window.__fmtMap && window.__fmtMap[oldId]) {
      window.__fmtMap[newId] = window.__fmtMap[oldId];
      delete window.__fmtMap[oldId];
    }
  
    if (window.__colorFmtMap && window.__colorFmtMap[oldId]) {
      window.__colorFmtMap[newId] = window.__colorFmtMap[oldId];
      delete window.__colorFmtMap[oldId];
    }
  
    if (window.__blockBgMap && window.__blockBgMap[oldId]) {
      window.__blockBgMap[newId] = window.__blockBgMap[oldId];
      delete window.__blockBgMap[oldId];
    }
  }
  
  function mergeFormattingFromOldTree(oldNode, newNode) {
    if (!oldNode || !newNode) return;
  
    const oldName = nodePlainName(oldNode);
    const newName = nodePlainName(newNode);
  
    // если название не менялось — сохраняем id и html-форматирование
    if (oldName === newName) {
      newNode.id = oldNode.id;
      newNode.nameHtml = oldNode.nameHtml || "";
      newNode.captionsBgColor = oldNode.captionsBgColor || "";
    } else {
      transferSideData(oldNode.id, newNode.id);
    }
  
    // подписи: если текст подписи не менялся — сохраняем html
    const oldCaps = Array.isArray(oldNode.captions) ? oldNode.captions : [];
    const newCaps = Array.isArray(newNode.captions) ? newNode.captions : [];
  
    newCaps.forEach((newCap, index) => {
      const oldCap = oldCaps[index];
      if (!oldCap) return;
  
      if (captionPlainText(oldCap) === captionPlainText(newCap)) {
        newCap.id = oldCap.id;
        newCap.textHtml = oldCap.textHtml || "";
      }
    });
  
    // дети: сначала пробуем сопоставить по позиции
    const oldChildren = Array.isArray(oldNode.children) ? oldNode.children : [];
    const newChildren = Array.isArray(newNode.children) ? newNode.children : [];
  
    const usedOld = new Set();
  
    newChildren.forEach((newChild, index) => {
      const oldChildByPosition = oldChildren[index];
    
      // 1. Сначала сопоставляем по позиции.
      // Это важно для переименования в текстовом режиме:
      // имя изменилось, но объект остался тем же.
      if (oldChildByPosition) {
        usedOld.add(index);
        mergeFormattingFromOldTree(oldChildByPosition, newChild);
        return;
      }
    
      // 2. Если по позиции старого объекта нет — fallback по имени.
      const foundIndex = oldChildren.findIndex((candidate, i) => {
        if (usedOld.has(i)) return false;
        return nodePlainName(candidate) === nodePlainName(newChild);
      });
    
      if (foundIndex >= 0) {
        usedOld.add(foundIndex);
        mergeFormattingFromOldTree(oldChildren[foundIndex], newChild);
      }
    });
  }

  function saveTelegramTextIfNeeded() {
    if (!tgMode) return true;

    const ta = document.querySelector("textarea.tg-export");
    if (!ta) return true;

    const newTree = treeFromAscii(ta.value);

    if (!newTree) {
      alert("Не удалось распознать дерево. Проверь формат.");
      return false;
    }

    mergeFormattingFromOldTree(root, newTree);

    if (typeof pushHistory === "function") {
      pushHistory();
    }

    root.id = newTree.id;
    root.level = newTree.level;
    root.name = newTree.name;
    root.nameHtml = newTree.nameHtml || "";
    root.captions = newTree.captions || [];
    root.children = newTree.children || [];

    selectedId = root.id;
    treeHasFocus = true;

    return true;
  }

  function renderTelegramView() {
    const host = document.getElementById('tree');
    if (!host) return;

    const copyBtn = getCopyBtn();

    if (copyBtn) {
      copyBtn.style.display = 'inline-block';
    }

    const tree = exportTreeFromRoot();

    lastAscii = tree
      ? asciiFromTree(tree)
      : '```\n(дерево не найдено)\n```';

    host.innerHTML = '';

    const ta = document.createElement('textarea');

    ta.className = 'tg-export';
    ta.value = lastAscii;

    const stop = (e) => e.stopPropagation();

    ta.addEventListener('pointerdown', stop);
    ta.addEventListener('mousedown', stop);
    ta.addEventListener('click', stop);

    host.append(ta);
  }

  function patchRender() {
    if (typeof window.render !== 'function') return;
    if (window.render.__tgPatched) return;

    const _render = window.render;

    function patchedRender() {
      if (tgMode) {
        _render();
        renderTelegramView();
      } else {
        _render();
      }
    }

    updateToggleBtn();

    patchedRender.__tgPatched = true;
    window.render = patchedRender;
  }

  function updateToggleBtn() {
    const std = document.getElementById('modeStd');
    const txt = document.getElementById('modeText');

    if (std && txt) {
      std.classList.toggle('is-active', !tgMode);
      txt.classList.toggle('is-active', tgMode);
      return;
    }

    const b = document.getElementById('tgToggle');

    if (!b) return;

    b.textContent = tgMode
      ? 'Стандартный режим'
      : 'Текстовый режим';
  }

  window.setTelegramMode = function (on) {
    const nextMode = !!on;

    // выход из текстового режима
    if (tgMode && !nextMode) {
      const ok = saveTelegramTextIfNeeded();
      if (!ok) return;
    }

    tgMode = nextMode;

    updateToggleBtn();
    window.render();
  };

  window.toggleTelegramMode = function () {
    window.setTelegramMode(!tgMode);
  };

  function installTelegramEventTrap() {
    const host = document.getElementById('tree');

    if (!host || host.__tgTrapInstalled) return;

    host.__tgTrapInstalled = true;

    function isTextareaTarget(e) {
      const t = e.target;

      return !!(
        t &&
        t.closest &&
        t.closest('textarea.tg-export')
      );
    }

    function trapKey(e) {
      if (!tgMode) return;
      if (!isTextareaTarget(e)) return;

      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    host.addEventListener('keydown', trapKey, true);
  }

  installTelegramEventTrap();
  installCopyHandler();
  patchRender();

})();