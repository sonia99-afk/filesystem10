// schema_lines.js
// Отдельная раскладка черных линий для режима "Структура".
// Линии строятся только по реально видимым строкам объектов.

(function () {
    if (typeof window === "undefined") return;
  
    function treeHost() {
      return document.getElementById("tree");
    }
  
    function isSchemaView() {
  return (
    typeof VIEW !== "undefined" &&
    typeof currentView !== "undefined" &&
    (
      currentView === VIEW.SCHEMA ||
      currentView === VIEW.STRUCTURE_TABLE
    )
  );
}
  
    function directRowOfLi(li) {
      return li?.querySelector?.(":scope > .row[data-id]") || null;
    }
  
    function isLiVisibleForLines(li) {
      if (!li || li.tagName !== "LI") return false;
  
      // Полностью скрытые отмеченные объекты не участвуют в линиях.
      if (li.classList.contains("mark-hidden-object")) return false;
  
      // Объекты, скрытые через [x], тоже не участвуют в линиях.
      if (li.classList.contains("object-node-hidden")) return false;
  
      const row = directRowOfLi(li);
  
      // Главное: линия строится только по реально видимой строке.
      if (!row || !row.getClientRects().length) return false;
  
      return true;
    }
  
    function directVisibleLis(ul) {
      if (!ul) return [];
  
      return Array.from(ul.children).filter((el) => {
        return el.tagName === "LI" && isLiVisibleForLines(el);
      });
    }
  
    function getRowLineY(li, relativeToEl) {
      const row = directRowOfLi(li);
      if (!row || !relativeToEl) return null;
      if (!row.getClientRects().length) return null;
  
      const rowBox = row.getBoundingClientRect();
      const relBox = relativeToEl.getBoundingClientRect();
  
      // В app2 высота строки 20px, линия ветки примерно по центру строки.
      return rowBox.top - relBox.top + 10;
    }
  
    function getParentLineY(li) {
      const row = directRowOfLi(li);
      if (!row || !row.getClientRects().length) return null;
  
      const rowBox = row.getBoundingClientRect();
      const liBox = li.getBoundingClientRect();
  
      return rowBox.top - liBox.top + 10;
    }

    function isCalloutElementEnabled() {
  return (
    window.viewSettings
      ?.getActiveSettings?.()
      ?.interface
      ?.showCalloutElement === true
  );
}

function getActiveBlockBottomY(
  li
) {
  /*
    Если выносной элемент включён,
    используем старый расчёт линии.
  */

  if (
    isCalloutElementEnabled()
  ) {
    return null;
  }

  if (!li) {
    return null;
  }

  const liBox =
    li.getBoundingClientRect();

  const contentElements = [
    li.querySelector(
      ":scope > .schema-active-block"
    ),

    li.querySelector(
      ":scope > .captions"
    ),

    li.querySelector(
      ":scope > .schema-text-properties"
    ),
  ];

  let bottomY = null;

  contentElements.forEach(
    (element) => {
      if (
        !element ||
        !element
          .getClientRects()
          .length
      ) {
        return;
      }

      const elementBox =
        element
          .getBoundingClientRect();

      const elementBottomY =
        elementBox.bottom -
        liBox.top;

      bottomY =
        bottomY === null
          ? elementBottomY
          : Math.max(
              bottomY,
              elementBottomY
            );
    }
  );

  return bottomY;
}
  
    function getTrunkLeftForUl(ul) {
      const cs = getComputedStyle(ul);
  
      const trunkX =
        parseFloat(cs.getPropertyValue("--trunk-x")) || 0;
  
      const shift =
        parseFloat(cs.getPropertyValue("--trunk-shift")) || 0;
  
      return trunkX + shift;
    }
  
    function removeOldLines(tree) {
      tree.querySelectorAll(".trunk").forEach((el) => el.remove());
      tree.querySelectorAll(".plink").forEach((el) => el.remove());
    }
  
    function layoutTrunkLines(tree) {
      const uls = tree.querySelectorAll("ul[data-level]");
  
      for (const ul of uls) {
        ul.querySelectorAll(":scope > .trunk").forEach((el) => el.remove());
  
        const lvl = ul.dataset.level;
        if (lvl === "0") continue;
  
        const items = directVisibleLis(ul);
  
        // Если видимый объект один или ноль — вертикальная линия не нужна.
        if (items.length < 2) continue;
  
        const firstLi = items[0];
        const lastLi = items[items.length - 1];
  
        const firstY = getRowLineY(firstLi, ul);
        const lastY = getRowLineY(lastLi, ul);
  
        if (firstY == null || lastY == null) continue;
  
        const top = Math.min(firstY, lastY);
        const bottom = Math.max(firstY, lastY);
  
        const trunk = document.createElement("div");
        trunk.className = "trunk";
  
        // Ставим left прямо инлайном, чтобы не зависеть от старой CSS-логики.
        trunk.style.left = `${getTrunkLeftForUl(ul)}px`;
        trunk.style.top = `${top}px`;
        trunk.style.height = `${Math.max(0, bottom - top)}px`;
  
        ul.prepend(trunk);
      }
    }
  
  function getPlinkStartY(
  li,
  parentY
) {
  const parentStartY =
    parentY + 2;

  const activeBlockBottomY =
    getActiveBlockBottomY(li);

  /*
    Если у родительского объекта
    есть общий серый блок, линия
    начинается от его нижнего края.
  */

  if (
    activeBlockBottomY !== null
  ) {
    return Math.max(
      parentStartY,
      activeBlockBottomY
    );
  }

  const captions =
    li.querySelector(
      ":scope > .captions"
    );

  if (
    !captions ||
    !captions
      .getClientRects()
      .length
  ) {
    return parentStartY;
  }

  if (
    li.classList.contains(
      "root"
    ) ||
    !document.body
      .classList
      .contains(
        "ordinals-on"
      )
  ) {
    const captionsBox =
      captions
        .getBoundingClientRect();

    const liBox =
      li.getBoundingClientRect();

    const captionsBottomY =
      captionsBox.bottom -
      liBox.top;

    return Math.max(
      parentStartY,
      captionsBottomY
    );
  }

  return parentStartY;
}
  
    function layoutParentLinks(tree) {
      const lis = tree.querySelectorAll("li");
  
      for (const li of lis) {
        if (!isLiVisibleForLines(li)) continue;
  
        const childUl = li.querySelector(":scope > ul[data-level]");
        if (!childUl) continue;
  
        const childItems = directVisibleLis(childUl);
  
        // Если все прямые дети скрыты — линию к ним не рисуем.
        if (!childItems.length) continue;
  
        const firstChildLi = childItems[0];
  
        const parentY = getParentLineY(li);
        const firstChildY = getRowLineY(firstChildLi, li);
  
        if (parentY == null || firstChildY == null) continue;
  
        const liBox = li.getBoundingClientRect();
        const ulBox = childUl.getBoundingClientRect();
  
        const x =
          ulBox.left -
          liBox.left +
          getTrunkLeftForUl(childUl);
  

const activeBlockBottomY =
  getActiveBlockBottomY(li);

const rawStartY =
  getPlinkStartY(
    li,
    parentY
  );

const endY =
  firstChildY;

const PLINK_TOP_GAP = 10;

let startY =
  rawStartY;

/*
  Для активного серого блока
  отступ не нужен — линия должна
  начинаться ровно от его края.

  Для остальных объектов сохраняем
  прежний отступ.
*/

if (
  activeBlockBottomY === null
) {
  if (
    endY >= rawStartY
  ) {
    startY = Math.min(
      rawStartY +
        PLINK_TOP_GAP,
      endY
    );
  } else {
    startY = Math.max(
      rawStartY -
        PLINK_TOP_GAP,
      endY
    );
  }
}
          
          const plink = document.createElement("div");
          plink.className = "plink";
          plink.style.left = `${x}px`;
          
          if (endY >= startY) {
            plink.style.top = `${startY}px`;
            plink.style.height = `${Math.max(0, endY - startY + 1)}px`;
          } else {
            plink.style.top = `${endY}px`;
            plink.style.height = `${Math.max(0, startY - endY + 1)}px`;
          }
  
        li.prepend(plink);
      }
    }
  
    function layoutSchemaLinesNow() {
      const tree = treeHost();
      if (!tree) return;
      if (!isSchemaView()) return;
  
      removeOldLines(tree);
      layoutTrunkLines(tree);
      layoutParentLinks(tree);
      window.schemaHiddenLevelLines
  ?.layoutNow?.();
    }

    let layoutRaf = null;
  
    function layoutSchemaLines() {
      if (layoutRaf) {
        cancelAnimationFrame(layoutRaf);
      }
    
      layoutRaf = requestAnimationFrame(() => {
        layoutRaf = null;
    
        try {
          layoutSchemaLinesNow();
        } catch (_) {}
      });
    }
  
    window.layoutTrunks = layoutSchemaLines;
  
    window.schemaLines = {
      layout: layoutSchemaLines,
      layoutNow: layoutSchemaLinesNow,
    };
  
    requestAnimationFrame(() => {
      try {
        layoutSchemaLines();
      } catch (_) {}
    });
  
    window.addEventListener("resize", () => {
      try {
        layoutSchemaLines();
      } catch (_) {}
    });
  })();