// autosave.js
// Мультипроектное автосохранение с раздельным хранением проектов.
// При старте грузится только index + активный проект.
// Остальные проекты подгружаются только при переключении.

(function () {
  if (typeof window === "undefined") return;

  const SAVE_DELAY = 250;
  const repository =
    window.projectRepository;

  let store = null;
  let saveTimer = null;
  let isRestoring = false;
  let lastStorageError = null;

  function reportStorageError(error) {
    lastStorageError = error;

    console.error(
      "Ошибка хранилища проектов",
      error
    );

    try {
      window.dispatchEvent(
        new CustomEvent(
          "project-storage-error",
          {
            detail: {
              code:
                error?.code ||
                "PROJECT_STORAGE_ERROR",
              operation:
                error?.operation ||
                "unknown",
              message:
                error?.message ||
                "Не удалось сохранить данные проекта.",
            },
          }
        )
      );
    } catch (_) {}
  }

  function repositoryCall(
    action,
    fallback = null
  ) {
    if (!repository) {
      reportStorageError(
        new Error(
          "Репозиторий проектов не инициализирован."
        )
      );

      return fallback;
    }

    try {
      return action(repository);
    } catch (error) {
      reportStorageError(error);
      return fallback;
    }
  }

  /* =========================================================
     ID проекта
  ========================================================= */

  function projectUid() {
    return (
      "project_" +
      Math.random()
        .toString(36)
        .slice(2, 9) +
      "_" +
      Date.now()
        .toString(36)
    );
  }

  /* =========================================================
     JSON helpers
  ========================================================= */

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  /* =========================================================
     Хранилище проекта
  ========================================================= */

  function readProjectData(
    projectId
  ) {
    if (!projectId) {
      return null;
    }

    return repositoryCall(
      (projectStore) =>
        projectStore.loadProject(
          projectId
        ),
      null
    );
  }

  function writeProjectData(
    projectId,
    data
  ) {
    if (
      !projectId ||
      !data
    ) {
      return false;
    }

    return repositoryCall(
      (projectStore) =>
        projectStore.saveProject(
          projectId,
          data
        ),
      false
    );
  }

  function removeProjectData(
    projectId
  ) {
    if (!projectId) {
      return false;
    }

    return repositoryCall(
      (projectStore) =>
        projectStore.deleteProject(
          projectId
        ),
      false
    );
  }

  /* =========================================================
     Название проекта
  ========================================================= */

  function plainFromHtml(
    html
  ) {
    if (
      typeof htmlPlainText ===
      "function"
    ) {
      return htmlPlainText(
        html
      );
    }

    const tmp =
      document.createElement(
        "div"
      );

    tmp.innerHTML =
      html || "";

    return (
      tmp.textContent ||
      ""
    ).trim();
  }

  function getTitleFromSnapshot(
    raw
  ) {
    const data =
      typeof raw === "string"
        ? safeParse(raw)
        : raw;

    const rootNode =
      data?.project?.root ||
      data?.root;

    if (!rootNode) {
      return "Проект";
    }

    const htmlTitle =
      rootNode.nameHtml
        ? plainFromHtml(
            rootNode.nameHtml
          )
        : "";

    const textTitle =
      String(
        rootNode.name || ""
      ).trim();

    return (
      htmlTitle ||
      textTitle ||
      "Проект"
    );
  }

  function getTitleFromCurrentRoot() {
    const htmlTitle =
      root?.nameHtml
        ? plainFromHtml(
            root.nameHtml
          )
        : "";

    const textTitle =
      String(
        root?.name || ""
      ).trim();

    return (
      htmlTitle ||
      textTitle ||
      "Проект"
    );
  }

  /* =========================================================
     Новый пустой проект
  ========================================================= */

  function makeEmptyProjectSnapshot(
    title = "Новый проект"
  ) {
    const newRoot =
      makeNode(
        LEVEL.COMPANY,
        title
      );

    const state = {
      schemaVersion:
        window.projectDocument
          ?.CURRENT_SCHEMA_VERSION ||
        window.PROJECT_SCHEMA_VERSION ||
        2,

      project: {
        root: newRoot,
        views: null,
        properties:
          window.projectProperties
            ?.createDefaultState?.({
              allCreated: true,
            }) ||
          null,
        formatting: {
          text: {},
          textColor: {},
          blockBackground: {},
          marks: {},
        },
        levelHeaderNames: {},
        hiddenNodeIds: [],
      },

      ui: {
        selectedId: newRoot.id,
        treeHasFocus: true,
        tableSelectedCell: null,
      },
    };

    const document =
      window.projectDocument
        ?.serialize?.(state) ||
      state;

    return JSON.stringify(
      document
    );
  }

  /* =========================================================
     Индекс проектов
  ========================================================= */

  function normalizeIndex(
    nextStore
  ) {
    if (
      !nextStore ||
      typeof nextStore !==
        "object"
    ) {
      return null;
    }

    if (
      !Array.isArray(
        nextStore.projects
      )
    ) {
      return null;
    }

    const projects =
      nextStore.projects
        .filter(
          (project) =>
            project &&
            project.id
        )
        .map(
          (project) => ({
            id:
              String(
                project.id
              ),

            title:
              project.title ||
              "Проект",

            updatedAt:
              project.updatedAt ||
              Date.now(),
          })
        );

    if (!projects.length) {
      return null;
    }

    let activeId =
      nextStore.activeId;

    if (
      !activeId ||
      !projects.some(
        (project) =>
          project.id ===
          activeId
      )
    ) {
      activeId =
        projects[0].id;
    }

    return {
      version: 1,
      activeId,
      projects,
    };
  }

  function writeIndex() {
    if (!store) {
      return false;
    }

    return repositoryCall(
      (projectStore) =>
        projectStore.saveIndex(
          store
        ),
      false
    );
  }

  /* =========================================================
     Миграция старого мультипроектного формата
  ========================================================= */

  function migrateFromOldMultiStore() {
    const oldStore =
      repositoryCall(
        (projectStore) =>
          projectStore.loadLegacyMultiStore(),
        null
      );

    if (
      !oldStore ||
      !Array.isArray(
        oldStore.projects
      ) ||
      !oldStore.projects.length
    ) {
      return null;
    }

    const nextProjects = [];

    oldStore.projects.forEach(
      (oldProject) => {
        if (
          !oldProject?.id ||
          !oldProject?.data
        ) {
          return;
        }

        const id =
          String(
            oldProject.id
          );

        const data =
          oldProject.data;

        writeProjectData(
          id,
          data
        );

        nextProjects.push({
          id,

          title:
            oldProject.title ||
            getTitleFromSnapshot(
              data
            ),

          updatedAt:
            oldProject.updatedAt ||
            Date.now(),
        });
      }
    );

    if (
      !nextProjects.length
    ) {
      return null;
    }

    let activeId =
      oldStore.activeId;

    if (
      !activeId ||
      !nextProjects.some(
        (project) =>
          project.id ===
          activeId
      )
    ) {
      activeId =
        nextProjects[0].id;
    }

    return {
      version: 1,
      activeId,
      projects:
        nextProjects,
    };
  }

  /* =========================================================
     Миграция старого одиночного проекта
  ========================================================= */

  function createInitialIndexFromSingleProject() {
    let oldSnapshot =
      repositoryCall(
        (projectStore) =>
          projectStore.loadLegacySingleProject(),
        null
      );

    if (
      !oldSnapshot &&
      typeof snapshot ===
        "function"
    ) {
      oldSnapshot =
        snapshot();
    }

    if (!oldSnapshot) {
      oldSnapshot =
        makeEmptyProjectSnapshot(
          "Проект"
        );
    }

    const id =
      projectUid();

    writeProjectData(
      id,
      oldSnapshot
    );

    return {
      version: 1,

      activeId:
        id,

      projects: [
        {
          id,

          title:
            getTitleFromSnapshot(
              oldSnapshot
            ),

          updatedAt:
            Date.now(),
        },
      ],
    };
  }

  /* =========================================================
     Загрузка индекса
  ========================================================= */

  function loadIndex() {
    const parsed =
      normalizeIndex(
        repositoryCall(
          (projectStore) =>
            projectStore.loadIndex(),
          null
        )
      );

    if (parsed) {
      return parsed;
    }

    const migrated =
      migrateFromOldMultiStore();

    if (migrated) {
      store =
        migrated;

      writeIndex();

      return migrated;
    }

    const initial =
      createInitialIndexFromSingleProject();

    store =
      initial;

    writeIndex();

    return initial;
  }

  /* =========================================================
     Проекты
  ========================================================= */

  function getActiveProjectMeta() {
    if (!store) {
      return null;
    }

    return (
      store.projects.find(
        (project) =>
          project.id ===
          store.activeId
      ) ||
      null
    );
  }

  function getProjectMeta(
    projectId
  ) {
    if (!store) {
      return null;
    }

    return (
      store.projects.find(
        (project) =>
          project.id ===
          projectId
      ) ||
      null
    );
  }

  /* =========================================================
     URL
  ========================================================= */

  function getProjectIdFromUrl() {
    const params =
      new URLSearchParams(
        location.search
      );

    return (
      params.get(
        "project"
      ) ||
      ""
    );
  }

  function getViewFromUrl() {
    const params =
      new URLSearchParams(
        location.search
      );

    return (
      params.get(
        "view"
      ) ||
      "schema"
    );
  }

  function setProjectUrl(
    projectId,
    options = {}
  ) {
    if (!projectId) {
      return;
    }

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "project",
      projectId
    );

    const next =
      url.pathname +
      url.search +
      url.hash;

    const current =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    if (
      next === current
    ) {
      return;
    }

    const state = {
      project:
        projectId,

      view:
        url.searchParams.get(
          "view"
        ) ||
        "schema",
    };

    if (options.replace) {
      history.replaceState(
        state,
        "",
        next
      );
    } else {
      history.pushState(
        state,
        "",
        next
      );
    }
  }

  /* =========================================================
     Завершение текущего редактирования
  ========================================================= */

  function commitActiveEdit() {
    const ae =
      document.activeElement;

    if (
      ae &&
      typeof ae.blur ===
        "function"
    ) {
      ae.blur();
    }
  }

  /* =========================================================
     Название активного проекта
  ========================================================= */

  function updateActiveProjectTitleFromCurrentRoot() {
    if (!store) {
      return;
    }

    const project =
      getActiveProjectMeta();

    if (!project) {
      return;
    }

    const nextTitle =
      getTitleFromCurrentRoot();

    if (
      project.title !==
      nextTitle
    ) {
      project.title =
        nextTitle;

      project.updatedAt =
        Date.now();

      writeIndex();
    }

    const btn =
      document.querySelector(
        `.project-item[data-project-id="${cssEscape(
          project.id
        )}"]`
      );

    if (btn) {
      btn.textContent =
        nextTitle;

      btn.title =
        nextTitle;
    }
  }

  /* =========================================================
     Сохранение проекта
  ========================================================= */

  function saveActiveProject() {
    if (isRestoring) {
      return;
    }

    if (!store) {
      return;
    }

    if (
      typeof snapshot !==
      "function"
    ) {
      return;
    }

    const project =
      getActiveProjectMeta();

    if (!project) {
      return;
    }

    const data =
      snapshot();

    const nextTitle =
      getTitleFromSnapshot(
        data
      );

    writeProjectData(
      project.id,
      data
    );

    const titleChanged =
      project.title !==
      nextTitle;

    project.title =
      nextTitle;

    project.updatedAt =
      Date.now();

    writeIndex();

    if (titleChanged) {
      updateActiveProjectTitleFromCurrentRoot();
    }
  }

  function scheduleSave() {
    if (isRestoring) {
      return;
    }

    clearTimeout(
      saveTimer
    );

    saveTimer =
      setTimeout(
        saveActiveProject,
        SAVE_DELAY
      );
  }

  /* =========================================================
     Текущий вид
  ========================================================= */

  function currentViewOrSchema() {
    if (
      typeof currentView ===
      "string"
    ) {
      return currentView;
    }

    return VIEW.SCHEMA;
  }

  /* =========================================================
     Undo / Redo
  ========================================================= */

  function resetHistory() {
    if (
      Array.isArray(
        window.undoStack
      )
    ) {
      window.undoStack.length =
        0;
    }

    if (
      Array.isArray(
        window.redoStack
      )
    ) {
      window.redoStack.length =
        0;
    }
  }

  /* =========================================================
     Рендер текущего вида
  ========================================================= */

  function renderCurrentView(
    view,
    options = {}
  ) {
    const targetView =
      view ||
      currentViewOrSchema();

    if (
      window.appRouter?.open
    ) {
      window.appRouter.open(
        targetView,
        {
          updateUrl:
            options.updateUrl !==
            false,

          replaceUrl:
            options.replaceUrl !==
            false,
        }
      );

      return;
    }

    if (
      typeof render ===
      "function"
    ) {
      render();
    }

    if (
      typeof syncViewButtons ===
      "function"
    ) {
      syncViewButtons();
    }
  }

  /* =========================================================
     Восстановление проекта из данных
  ========================================================= */

  function restoreProjectByData(
    project,
    data,
    options = {}
  ) {
    if (
      !project ||
      !data ||
      typeof restore !==
        "function"
    ) {
      return;
    }

    /*
      ВАЖНО.

      По умолчанию вид предыдущего
      проекта НЕ переносим.

      forcedView используется только,
      если view явно передан извне.
    */
    const forcedView =
      options.view || "";

    try {
      isRestoring =
        true;

      /*
        Восстанавливаем state проекта,
        но пока ничего не рисуем.
      */
      restore(
        data,
        {
          shouldRender:
            false,
        }
      );

      /*
        restore() уже восстановил
        состояние самого проекта.

        Принудительно меняем currentView
        только если view действительно
        был передан извне.
      */
      if (forcedView) {
        currentView =
          forcedView;
      }

      treeHasFocus =
        true;

      /*
        Если сохранённого selectedId
        больше нет в дереве,
        выбираем корень.
      */
      if (
        !findWithParent(
          root,
          selectedId
        )
      ) {
        selectedId =
          root.id;
      }

      resetHistory();
    } catch (err) {
      console.error(
        "Не удалось открыть проект",
        err
      );
    } finally {
      isRestoring =
        false;
    }

    renderProjectsSidebar();

    /*
      При переходе через
      navigationController сюда
      приходит render: false.

      Поэтому данные проекта
      загружаются тихо.

      Финальный render потом выполнит
      viewTabs.open().
    */
    if (
      options.render !==
      false
    ) {
      renderCurrentView(
        forcedView ||
          currentViewOrSchema(),
        {
          replaceUrl:
            true,
        }
      );
    }
  }

  function restoreProject(
    project,
    options = {}
  ) {
    if (!project) {
      return;
    }

    let data =
      readProjectData(
        project.id
      );

    if (!data) {
      data =
        makeEmptyProjectSnapshot(
          project.title ||
          "Проект"
        );

      writeProjectData(
        project.id,
        data
      );
    }

    restoreProjectByData(
      project,
      data,
      options
    );
  }

  /* =========================================================
     Переключение проекта
  ========================================================= */

  function switchProject(
    projectId,
    options = {}
  ) {
    if (!store) {
      return false;
    }

    const nextProject =
      getProjectMeta(
        projectId
      );

    if (!nextProject) {
      return false;
    }

    /*
      Проект уже активен.

      Ничего повторно
      не восстанавливаем.
    */
    if (
      store.activeId ===
      projectId
    ) {
      if (
        options.updateUrl !==
        false
      ) {
        setProjectUrl(
          projectId,
          {
            replace:
              !!options.replaceUrl,
          }
        );
      }

      return true;
    }

    /*
      Сначала заканчиваем
      текущее редактирование.
    */
    commitActiveEdit();

    /*
      Затем сохраняем проект,
      из которого уходим.

      Здесь сохраняется и его
      viewTabsState.activeId.
    */
    saveActiveProject();

    /*
      Теперь активным становится
      новый проект.
    */
    store.activeId =
      projectId;

    writeIndex();

    /*
      В новом основном сценарии
      navigationController передаёт:

        updateUrl: false

      Поэтому autosave сам URL
      в этот момент не меняет.

      Финальный URL project + view + tab
      запишет viewTabs/appRouter после
      открытия правильной вкладки.
    */
    if (
      options.updateUrl !==
      false
    ) {
      setProjectUrl(
        projectId,
        {
          replace:
            !!options.replaceUrl,
        }
      );
    }

    /*
      Загружаем state НОВОГО проекта.

      Самое важное:
      НЕ используем currentView
      старого проекта по умолчанию.
    */
    restoreProject(
      nextProject,
      {
        view:
          options.view ||
          "",

        render:
          options.render !==
          false,
      }
    );

    return true;
  }

  /* =========================================================
     Создание проекта
  ========================================================= */

  async function createProject() {
  if (!store) {
    return false;
  }

  /*
    Создаём данные нового проекта.

    ВАЖНО:
    пока НЕ делаем его активным.

    Его правильно откроет
    navigationController.
  */

  const id =
    projectUid();

  const title =
    "Новый проект";

  const data =
    makeEmptyProjectSnapshot(
      title
    );

  writeProjectData(
    id,
    data
  );

  const project = {
    id,
    title,

    updatedAt:
      Date.now(),
  };

  /*
    Добавляем проект в список,
    но store.activeId пока
    остаётся у старого проекта.
  */

  store.projects.push(
    project
  );

  writeIndex();

  /*
    Основной новый путь.

    navigationController:

    1. сохранит старый проект;
    2. сделает новый активным;
    3. восстановит его state;
    4. создаст стандартные вкладки;
    5. откроет Структуру;
    6. сделает один render;
    7. запишет правильный URL.
  */

  if (
    window
      .navigationController
      ?.openProject
  ) {
    const opened =
      await window
        .navigationController
        .openProject(
          id
        );

    if (!opened) {
      return false;
    }

    /*
      Новый проект должен начинаться
      с выбранного корневого объекта.
    */

    treeHasFocus =
      true;

    selectedId =
      root.id;

    /*
      Сам вид уже нарисован.

      Дополнительный render
      здесь НЕ нужен.

      Просто запускаем
      переименование корня.
    */

    setTimeout(
      () => {
        startRename?.(
          root.id
        );
      },
      0
    );

    return true;
  }

  /*
    Временный fallback.

    Потом его тоже можно удалить,
    когда окончательно убедимся,
    что navigationController
    всегда подключён.
  */

  store.activeId =
    id;

  writeIndex();

  restoreProject(
    project,
    {
      view:
        VIEW.SCHEMA,
    }
  );

  treeHasFocus =
    true;

  selectedId =
    root.id;

  setTimeout(
    () => {
      startRename?.(
        root.id
      );
    },
    0
  );

  return true;
}

  /* =========================================================
     Удаление проекта
  ========================================================= */

  async function deleteProject(
  projectId
) {
  if (!store) {
    return false;
  }

  const index =
    store.projects.findIndex(
      (project) =>
        project.id ===
        projectId
    );

  if (index < 0) {
    return false;
  }

  /*
    Последний проект
    удалить нельзя.
  */

  if (
    store.projects.length <=
    1
  ) {
    alert(
      "Нельзя удалить последний проект."
    );

    return false;
  }

  const project =
    store.projects[
      index
    ];

  const ok =
    confirm(
      `Удалить проект «${
        project.title ||
        "Проект"
      }»?`
    );

  if (!ok) {
    return false;
  }

  const wasActive =
    store.activeId ===
    projectId;

  /*
    Если удаляем активный проект,
    сначала завершаем текущее
    редактирование.

    Сам проект сохранять уже
    нет смысла — мы его удаляем.
  */

  if (wasActive) {
    commitActiveEdit();
  }

  /*
    Удаляем проект из списка.
  */

  store.projects.splice(
    index,
    1
  );

  /*
    Удаляем его сохранённые данные.
  */

  removeProjectData(
    projectId
  );

  /*
    Удалили НЕактивный проект.

    Тут вообще не нужно
    переключать вид или делать
    полный render редактора.

    Просто обновляем список
    проектов слева.
  */

  if (!wasActive) {
    writeIndex();

    renderProjectsSidebar();

    return true;
  }

  /*
    Удалили АКТИВНЫЙ проект.

    Выбираем соседний:

    сначала тот, который оказался
    на его месте;

    если такого нет —
    предыдущий.
  */

  const nextProject =
    store.projects[
      Math.min(
        index,
        store.projects.length - 1
      )
    ] ||
    store.projects[0];

  if (!nextProject) {
    return false;
  }

  /*
    ВАЖНО.

    Пока НЕ ставим:

      store.activeId =
        nextProject.id;

    Это должен сделать
    switchProject() внутри
    navigationController.

    Иначе switchProject решит:

      "этот проект уже активен"

    и не восстановит его данные.
  */

  writeIndex();

  /*
    Нормальный новый сценарий.

    replaceUrl: true означает:

    URL удалённого проекта
    заменяется URL нового.

    В истории не остаётся
    текущая запись на проект,
    которого больше нет.
  */

  if (
    window
      .navigationController
      ?.openProject
  ) {
    return await window
      .navigationController
      .openProject(
        nextProject.id,
        {
          replaceUrl:
            true,
        }
      );
  }

  /*
    Временный fallback.
  */

  store.activeId =
    nextProject.id;

  writeIndex();

  restoreProject(
    nextProject
  );

  return true;
}

  /* =========================================================
     Список проектов
  ========================================================= */

  function renderProjectsSidebar() {
    if (!store) {
      return;
    }

    const list =
      document.querySelector(
        ".projects-list"
      );

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    store.projects.forEach(
      (project) => {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "project-row";

        row.dataset.projectId =
          project.id;

        if (
          project.id ===
          store.activeId
        ) {
          row.classList.add(
            "in-act"
          );
        }

        const button =
          document.createElement(
            "button"
          );

        button.className =
          "project-item";

        button.type =
          "button";

        button.dataset.projectId =
          project.id;

        button.textContent =
          project.title ||
          "Проект";

        button.title =
          project.title ||
          "Проект";

        if (
          project.id ===
          store.activeId
        ) {
          button.classList.add(
            "in-act"
          );
        }

        /*
          КЛЮЧЕВОЕ ИЗМЕНЕНИЕ.

          Обычный клик по проекту
          больше не должен сам
          полностью открывать проект
          через autosave.

          Этим занимается единый
          navigationController.
        */
        button.addEventListener(
          "click",
          () => {
            if (
              window
                .navigationController
                ?.openProject
            ) {
              window
                .navigationController
                .openProject(
                  project.id
                );

              return;
            }

            /*
              Временный fallback,
              если navigationController
              ещё не подключён.
            */
            switchProject(
              project.id
            );
          }
        );

        const deleteBtn =
          document.createElement(
            "button"
          );

        deleteBtn.className =
          "project-delete-btn";

        deleteBtn.type =
          "button";

        deleteBtn.title =
          "Удалить проект";

        deleteBtn.textContent =
          "×";

        deleteBtn.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            deleteProject(
              project.id
            );
          }
        );

        row.appendChild(
          button
        );

        row.appendChild(
          deleteBtn
        );

        list.appendChild(
          row
        );
      }
    );

    bindAddProjectButton();
  }

  /* =========================================================
     Кнопка создания проекта
  ========================================================= */

  function bindAddProjectButton() {
    const oldButton =
      document.querySelector(
        ".project-add"
      );

    if (!oldButton) {
      return;
    }

    if (
      oldButton.dataset
        .projectsManagerBound ===
      "1"
    ) {
      return;
    }

    /*
      Старый initProjectsSidebar
      уже мог повесить обработчик.

      Клонируем кнопку,
      чтобы удалить старые listeners.
    */
    const button =
      oldButton.cloneNode(
        true
      );

    button.dataset
      .projectsManagerBound =
        "1";

    oldButton.replaceWith(
      button
    );

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        createProject();
      }
    );
  }

  /* =========================================================
     Связь Undo / Redo с autosave
  ========================================================= */

  function patchHistory() {
    if (
      typeof pushHistory !==
      "function"
    ) {
      return;
    }

    if (
      window.pushHistory
        .__projectsAutosavePatched
    ) {
      return;
    }

    const originalPushHistory =
      window.pushHistory;

    window.pushHistory =
      function patchedPushHistory() {
        const result =
          originalPushHistory.apply(
            this,
            arguments
          );

        scheduleSave();

        return result;
      };

    window.pushHistory
      .__projectsAutosavePatched =
        true;
  }

  /* =========================================================
     Временная связь render с autosave
  ========================================================= */

  function patchRender() {
    if (
      typeof render !==
      "function"
    ) {
      return;
    }

    if (
      window.render
        .__projectsAutosavePatched
    ) {
      return;
    }

    const originalRender =
      window.render;

    window.render =
      function patchedRenderProjectsAutosave() {
        const result =
          originalRender.apply(
            this,
            arguments
          );

        updateActiveProjectTitleFromCurrentRoot();

        scheduleSave();

        return result;
      };

    window.render
      .__projectsAutosavePatched =
        true;
  }

  /* =========================================================
     Первоначальное восстановление
  ========================================================= */

  function restoreSaved() {
    if (!store) {
      store =
        loadIndex();
    }

    const projectIdFromUrl =
      getProjectIdFromUrl();

    if (
      projectIdFromUrl &&
      store.projects.some(
        (project) =>
          project.id ===
          projectIdFromUrl
      )
    ) {
      store.activeId =
        projectIdFromUrl;

      writeIndex();
    }

    const activeProject =
      getActiveProjectMeta();

    if (!activeProject) {
      return false;
    }

    let data =
      readProjectData(
        activeProject.id
      );

    if (!data) {
      data =
        makeEmptyProjectSnapshot(
          activeProject.title ||
          "Проект"
        );

      writeProjectData(
        activeProject.id,
        data
      );
    }

    /*
      Пока сохраняем project
      в текущем URL.

      Сам конкретный view/tab
      затем нормализует
      navigationController.
    */
    setProjectUrl(
      activeProject.id,
      {
        replace: true,
      }
    );

    const viewToKeep =
      getViewFromUrl() ||
      currentViewOrSchema();

    try {
      isRestoring =
        true;

      restore(
        data,
        {
          shouldRender:
            false,
        }
      );

      /*
        При первом запуске view
        берём из URL.

        Потом конкретный tab
        откроет viewTabs.
      */
      currentView =
        viewToKeep;

      treeHasFocus =
        true;

      resetHistory();

      return true;
    } catch (err) {
      console.error(
        "Не удалось восстановить проект",
        err
      );

      return false;
    } finally {
      isRestoring =
        false;
    }
  }

  /* =========================================================
     Загрузка проекта из URL
  ========================================================= */

  function openProjectFromUrl(
    options = {}
  ) {
    if (!store) {
      return false;
    }

    const projectIdFromUrl =
      getProjectIdFromUrl();

    if (!projectIdFromUrl) {
      return false;
    }

    const project =
      getProjectMeta(
        projectIdFromUrl
      );

    if (!project) {
      return false;
    }

    /*
      Нужный проект уже открыт.

      Повторно его state
      восстанавливать не нужно.
    */
    if (
      store.activeId ===
      projectIdFromUrl
    ) {
      return true;
    }

    switchProject(
      projectIdFromUrl,
      {
        /*
          URL уже содержит
          нужный project.
        */
        updateUrl:
          false,

        replaceUrl:
          true,

        /*
          Для истории браузера
          view может быть явно
          задан самим URL.
        */
        view:
          options.view ||
          getViewFromUrl(),

        /*
          navigationController
          передаёт сюда false,
          чтобы потом сделать
          один финальный render.
        */
        render:
          options.render !==
          false,
      }
    );

    return true;
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    store =
      loadIndex();

    /*
      Только восстанавливаем
      состояние проекта.

      Сам вид здесь больше
      не рисуем.
    */
    restoreSaved();

    /*
      Подменяем старые функции
      сайдбара на мультипроектные.
    */
    window.syncProjectsSidebar =
      updateActiveProjectTitleFromCurrentRoot;

    window.initProjectsSidebar =
      function initProjectsSidebar() {
        renderProjectsSidebar();
        bindAddProjectButton();
      };

    patchHistory();
    patchRender();

    renderProjectsSidebar();

    /*
      Перед закрытием страницы
      сохраняем текущий проект.
    */
    window.addEventListener(
      "beforeunload",
      () => {
        saveActiveProject();
      }
    );
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.projectAutosave = {
    saveNow:
      saveActiveProject,

    restoreSaved,

    openProjectFromUrl,

    createProject,

    switchProject,

    deleteProject,

    getProjects() {
      return store
        ? store.projects.slice()
        : [];
    },

    getActiveProjectId() {
      return (
        store?.activeId ||
        null
      );
    },

    getLastStorageError() {
      return lastStorageError;
    },

    clear() {
      const projectIds =
        store?.projects?.map(
          (project) =>
            project.id
        ) || [];

      return repositoryCall(
        (projectStore) =>
          projectStore.clear(
            projectIds
          ),
        false
      );
    },
  };

  /* =========================================================
     Запуск
  ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
