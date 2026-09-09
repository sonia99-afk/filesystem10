// schema_hidden_level_lines.js
// Дорисовывает связи через скрытые промежуточные уровни.

(function () {
  if (typeof window === "undefined") return;

  const LINE_CLASS =
    "schema-hidden-level-line";

  function treeHost() {
    return document.getElementById(
      "tree"
    );
  }

  function isSchemaView() {
    return (
      typeof VIEW !== "undefined" &&
      typeof currentView !== "undefined" &&
      (
        currentView === VIEW.SCHEMA ||
        currentView ===
          VIEW.STRUCTURE_TABLE
      )
    );
  }

  function directRowOfLi(li) {
    return (
      li?.querySelector?.(
        ":scope > .row[data-id]"
      ) || null
    );
  }

  function directChildUl(li) {
    return (
      li?.querySelector?.(
        ":scope > ul[data-level]"
      ) || null
    );
  }

  function directLis(ul) {
    if (!ul) return [];

    return Array.from(
      ul.children
    ).filter(
      (element) =>
        element.tagName === "LI"
    );
  }

  function isVisibleLi(li) {
    if (!li) return false;

    if (
      li.classList.contains(
        "object-node-hidden"
      ) ||
      li.classList.contains(
        "mark-hidden-object"
      )
    ) {
      return false;
    }

    const row =
      directRowOfLi(li);

    return !!row
      ?.getClientRects()
      .length;
  }

  function firstVisibleInBranch(li) {
    if (!li) return null;

    if (isVisibleLi(li)) {
      return li;
    }

    const childUl =
      directChildUl(li);

    for (
      const childLi of
      directLis(childUl)
    ) {
      const found =
        firstVisibleInBranch(
          childLi
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  function representativesOfUl(ul) {
    return directLis(ul)
      .map(
        (sourceLi) => ({
          sourceLi,
          visibleLi:
            firstVisibleInBranch(
              sourceLi
            ),
        })
      )
      .filter(
        (item) =>
          !!item.visibleLi
      );
  }

  function trunkOffset(ul) {
    const styles =
      getComputedStyle(ul);

    const trunkX =
      parseFloat(
        styles.getPropertyValue(
          "--trunk-x"
        )
      ) || 0;

    const shift =
      parseFloat(
        styles.getPropertyValue(
          "--trunk-shift"
        )
      ) || 0;

    return trunkX + shift;
  }

  function rowCenterY(
    li,
    relativeTo
  ) {
    const row =
      directRowOfLi(li);

    if (
      !row ||
      !relativeTo ||
      !row.getClientRects().length
    ) {
      return null;
    }

    const rowBox =
      row.getBoundingClientRect();

    const relativeBox =
      relativeTo
        .getBoundingClientRect();

    return (
      rowBox.top -
      relativeBox.top +
      10
    );
  }

  function lineColor() {
    return document.body.classList
      .contains("hotkeys-edit-mode")
      ? "var(--no-activ-color)"
      : "#000";
  }

  function appendVerticalLine(
    container,
    x,
    startY,
    endY
  ) {
    if (
      !container ||
      !Number.isFinite(x) ||
      !Number.isFinite(startY) ||
      !Number.isFinite(endY)
    ) {
      return;
    }

    const line =
      document.createElement("div");

    line.className =
      `${LINE_CLASS} is-vertical`;

    line.style.position =
      "absolute";

    line.style.left =
      `${Math.round(x)}px`;

    line.style.top =
  `${Math.round(
    Math.min(startY, endY)
  ) + 1}px`;

    line.style.height =
      `${Math.max(
        0,
        Math.round(
          Math.abs(endY - startY)
        ) + 1
      )}px`;

    line.style.borderLeft =
      `1px solid ${lineColor()}`;

    line.style.pointerEvents =
      "none";

    line.style.zIndex = "0";

    container.prepend(line);
  }

  function appendHorizontalLine(
    container,
    startX,
    endX,
    y
  ) {
    if (
      !container ||
      !Number.isFinite(startX) ||
      !Number.isFinite(endX) ||
      !Number.isFinite(y)
    ) {
      return;
    }

    const line =
      document.createElement("div");

    line.className =
      `${LINE_CLASS} is-horizontal`;

    line.style.position =
      "absolute";

    line.style.left =
      `${Math.round(
        Math.min(startX, endX)
      )}px`;

    line.style.top =
  `${Math.round(y) + 1}px`;

    line.style.width =
      `${Math.max(
        0,
        Math.round(
          Math.abs(endX - startX)
        ) + 1
      )}px`;

    line.style.borderTop =
      `1px solid ${lineColor()}`;

    line.style.pointerEvents =
      "none";

    line.style.zIndex = "0";

    container.prepend(line);
  }

  function activeBlockBottomY(li) {
    if (
      window.viewSettings
        ?.getActiveSettings?.()
        ?.interface
        ?.showCalloutElement === true
    ) {
      return null;
    }

    const liBox =
      li.getBoundingClientRect();

    const elements = [
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

    let bottom = null;

    elements.forEach(
      (element) => {
        if (
          !element ||
          !element
            .getClientRects()
            .length
        ) {
          return;
        }

        const value =
          element
            .getBoundingClientRect()
            .bottom -
          liBox.top;

        bottom =
          bottom === null
            ? value
            : Math.max(
                bottom,
                value
              );
      }
    );

    return bottom;
  }

  function parentStartY(
    li,
    endY
  ) {
    const parentY =
      rowCenterY(li, li);

    if (parentY === null) {
      return null;
    }

    const blockBottom =
      activeBlockBottomY(li);

    if (blockBottom !== null) {
      return Math.max(
        parentY + 2,
        blockBottom
      );
    }

    const rawStart =
      parentY + 2;

    return endY >= rawStart
      ? Math.min(
          rawStart + 10,
          endY
        )
      : Math.max(
          rawStart - 10,
          endY
        );
  }

  function layoutExtendedTrunks(
    tree
  ) {
    tree
      .querySelectorAll(
        "ul[data-level]"
      )
      .forEach(
        (ul) => {
          const items =
            representativesOfUl(ul);

          const hasHiddenItem =
            items.some(
              (item) =>
                !isVisibleLi(
                  item.sourceLi
                )
            );

          if (
            !hasHiddenItem ||
            items.length < 2
          ) {
            return;
          }

          const values =
            items
              .map(
                (item) =>
                  rowCenterY(
                    item.visibleLi,
                    ul
                  )
              )
              .filter(
                Number.isFinite
              );

          if (values.length < 2) {
            return;
          }

          appendVerticalLine(
            ul,
            trunkOffset(ul),
            Math.min(...values),
            Math.max(...values)
          );
        }
      );
  }

  function layoutMissingParentLinks(
    tree
  ) {
    tree
      .querySelectorAll("li")
      .forEach(
        (li) => {
          if (!isVisibleLi(li)) {
            return;
          }

          const childUl =
            directChildUl(li);

          if (!childUl) {
            return;
          }

          const children =
            directLis(childUl);

          if (
            children.some(
              isVisibleLi
            )
          ) {
            return;
          }

          const representative =
            representativesOfUl(
              childUl
            )[0]?.visibleLi;

          if (!representative) {
            return;
          }

          const liBox =
            li.getBoundingClientRect();

          const ulBox =
            childUl
              .getBoundingClientRect();

          const endY =
            rowCenterY(
              representative,
              li
            );

          const startY =
            parentStartY(
              li,
              endY
            );

          appendVerticalLine(
            li,
            ulBox.left -
              liBox.left +
              trunkOffset(childUl),
            startY,
            endY
          );
        }
      );
  }

  function layoutHorizontalBridges(
    tree
  ) {
    tree
      .querySelectorAll(
        (
          "li.object-node-hidden, " +
          "li.mark-hidden-object"
        )
      )
      .forEach(
        (li) => {
          const parentUl =
            li.parentElement;

          const childUl =
            directChildUl(li);

          if (
            parentUl?.tagName !==
              "UL" ||
            !childUl
          ) {
            return;
          }

          const representative =
            representativesOfUl(
              childUl
            )[0]?.visibleLi;

          if (!representative) {
            return;
          }

          const liBox =
            li.getBoundingClientRect();

          const parentBox =
            parentUl
              .getBoundingClientRect();

          const childBox =
            childUl
              .getBoundingClientRect();

          const startX =
            parentBox.left -
            liBox.left +
            trunkOffset(parentUl);

          const endX =
            childBox.left -
            liBox.left +
            trunkOffset(childUl);

          const y =
            rowCenterY(
              representative,
              li
            );

          appendHorizontalLine(
            li,
            startX,
            endX,
            y
          );
        }
      );
  }

  function removeOldLines(tree) {
    tree
      .querySelectorAll(
        `.${LINE_CLASS}`
      )
      .forEach(
        (line) =>
          line.remove()
      );
  }

  function layoutNow() {
    const tree =
      treeHost();

    if (!tree) return;

    removeOldLines(tree);

    if (!isSchemaView()) {
      return;
    }

    layoutExtendedTrunks(tree);
    layoutMissingParentLinks(tree);
    layoutHorizontalBridges(tree);
  }

  let frame = 0;

  function layout() {
    if (frame) {
      cancelAnimationFrame(frame);
    }

    frame =
      requestAnimationFrame(
        () => {
          frame = 0;
          layoutNow();
        }
      );
  }

  window.schemaHiddenLevelLines = {
    layout,
    layoutNow,
  };

  requestAnimationFrame(layout);
})();