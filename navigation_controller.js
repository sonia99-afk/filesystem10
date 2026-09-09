// navigation_controller.js
//
// Единый сценарий навигации приложения.
//
// Отвечает за:
// - первоначальное открытие URL;
// - Назад / Вперёд браузера;
// - переключение между проектами.
//
// Сам:
// - данные проекта не хранит;
// - виды не рисует;
// - assets не загружает.
//
// Он только задаёт правильный
// порядок действий.

(function () {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  /*
    Пока выполняется один переход,
    второй одновременно не запускаем.
  */
  let navigating =
    false;

  /* =========================================================
     Чтение URL
  ========================================================= */

  function getViewFromUrl() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    return (
      params.get("view") ||
      "schema"
    );
  }

  /* =========================================================
     Открытие состояния из URL
  ========================================================= */

  async function openLocation(
    options = {}
  ) {
    /*
      Например сюда приходим:

      1. при первой загрузке страницы;
      2. при Назад;
      3. при Вперёд.
    */

    if (navigating) {
      return false;
    }

    navigating =
      true;

    try {
      const view =
        getViewFromUrl();

      /*
        ШАГ 1.

        Сначала смотрим project
        в текущем URL.

        Если там другой проект —
        autosave загружает его state.

        ВАЖНО:
        render: false.

        То есть проект пока
        только загружается в память,
        но экран не рисуется.
      */

      window.projectAutosave
        ?.openProjectFromUrl?.({
          view,
          render: false,
        });

      /*
        После этого:

        window.root
        window.viewTabsState
        свойства проекта
        выбранный объект
        и т.д.

        уже относятся к проекту,
        указанному в URL.
      */

      /*
        ШАГ 2.

        Теперь viewTabs смотрит:

          ?tab=view_xxx

        и выбирает конкретную
        вкладку ЭТОГО проекта.
      */

      const opened =
        await window.viewTabs
          ?.openFromUrl?.({
            /*
              При первой загрузке
              разрешаем нормализовать URL.

              Например:

              ?view=table

              станет:

              ?view=table
              &tab=view_xxx
            */

            updateUrl:
              options.updateUrl !==
              false,

            replaceUrl:
              options.replaceUrl !==
              false,

            restoreFocus:
              false,
          });

      return (
        opened !== false
      );
    } finally {
      navigating =
        false;
    }
  }

  /* =========================================================
     Обычное переключение проекта
  ========================================================= */

  async function openProject(
  projectId,
  options = {}
) {
    if (!projectId) {
      return false;
    }

    if (navigating) {
      return false;
    }

    navigating =
      true;

    try {
      /*
        ШАГ 1.

        Просим autosave переключить
        данные на другой проект.

        Но:

        - URL пока не меняем;
        - render пока не делаем.
      */

      const switched =
        window.projectAutosave
          ?.switchProject?.(
            projectId,
            {
              updateUrl: false,
              render: false,
            }
          );

      if (!switched) {
        return false;
      }

      /*
        Теперь restore() уже загрузил
        состояние НОВОГО проекта.

        Значит:

        window.viewTabsState

        тоже принадлежит
        новому проекту.
      */

      const activeItem =
  window.viewTabs
    ?.getActiveItem?.();

if (!activeItem) {
  return false;
}

      /*
        ШАГ 3.

        Открываем активную вкладку
        нового проекта через тот же
        механизм, которым открывается
        обычная вкладка по клику.

        viewTabs.open():

        1. установит activeId;
        2. подготовит router без render;
        3. применит settings без render;
        4. сделает один render;
        5. запишет правильный URL:
           project + view + tab.
      */

      const opened =
  await window.viewTabs
    ?.open?.(
      activeItem.id,
      {
        updateUrl:
          true,

        replaceUrl:
          !!options.replaceUrl,

        restoreFocus:
          false,
      }
    );

      return (
        opened !== false
      );
    } finally {
      navigating =
        false;
    }
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    /*
      ПЕРВАЯ ЗАГРУЗКА.

      URL уже существует.

      Поэтому:

      project
      ↓
      tab
      ↓
      settings
      ↓
      render

      выполняются одним сценарием.
    */

    openLocation({
      /*
        При старых URL разрешаем
        дописать недостающий tab.
      */
      updateUrl: true,

      /*
        При первой загрузке не создаём
        новую запись истории браузера.
      */
      replaceUrl: true,
    });

    /*
      НАЗАД / ВПЕРЁД.

      Это должен быть единственный
      popstate-обработчик приложения.
    */

    window.addEventListener(
      "popstate",
      () => {
        /*
          Важно:

          браузер УЖЕ изменил URL.

          Поэтому мы сами URL
          сейчас вообще не трогаем.
        */

        openLocation({
          updateUrl: false,
          replaceUrl: false,
        });
      }
    );
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.navigationController = {
    /*
      Открыть текущее состояние URL.

      Используется для:
      - первого запуска;
      - Назад;
      - Вперёд.
    */
    openLocation,

    /*
      Перейти в другой проект.

      Используется при клике
      по проекту слева.
    */
    openProject,
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