import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

function makeClassList() {
  const values = new Set();

  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle(name, force) {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
  };
}

function makeElement(tagName = "div") {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    childNodes: [],
    classList: makeClassList(),
    dataset: {},
    style: {
      getPropertyValue: () => "",
      setProperty: () => {},
    },
    appendChild(child) {
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute: () => {},
    removeAttribute: () => {},
    replaceWith: () => {},
    textContent: "",
    innerHTML: "",
  };
}

export function createClassicScriptRuntime(windowOverrides = {}) {
  const document = {
    activeElement: null,
    body: makeElement("body"),
    createElement: makeElement,
    createTreeWalker: () => ({
      currentNode: null,
      nextNode: () => false,
    }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const window = {
    document,
    navigator: { platform: "Linux" },
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    URL,
    URLSearchParams,
    NodeFilter: { SHOW_TEXT: 4 },
    CSS: { escape: (value) => String(value) },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    ...windowOverrides,
  };

  window.window = window;
  window.addEventListener ??= () => {};
  window.removeEventListener ??= () => {};
  window.dispatchEvent ??= () => true;

  const context = vm.createContext(window);

  async function load(relativePath) {
    const absolutePath = path.resolve(relativePath);
    const source = await readFile(absolutePath, "utf8");

    vm.runInContext(source, context, { filename: absolutePath });

    return window;
  }

  return {
    context,
    load,
    window,
  };
}

export async function loadClassicScript(relativePath, windowOverrides = {}) {
  const runtime = createClassicScriptRuntime(windowOverrides);
  await runtime.load(relativePath);
  return runtime.window;
}
