// ui_resources.js
(function () {
    if (typeof window === "undefined") return;
  
    window.UI = {
      icons: {
        marks: {
          show: "icons/Показать.png",
          hide: "icons/Скрыть.png",
          strike: "icons/Зачеркнутный.png",
          text: "icons/Текст.png",
        },
      },
  
      labels: {
        marks: {
          title: "Отмеченные объекты:",
          toggleOn: "Скрыть отметки",
          toggleOff: "Показать отметки",
  
          hide: "Скрыть",
          show: "Показать",
  
          strike: "Зачеркнуть",
          unstrike: "Не зачёркивать",
  
          marked: "Отмечено",
          unmarked: "Не отмечено",
        },
  
        objectFocus: {
          breadcrumbFallback: "Путь",
          rootFallback: "Уровень 0",
        },
  
        hotkeys: {
          exitTitle: "Сохранить изменения перед выходом?",
          exitText: "Вы выходите из режима редактирования хоткеев.<br>Без сохранения изменения будут потеряны.",
          stay: "Остаться",
          save: "Сохранить",
          discard: "Не сохранять",
          reset: "Сброс к исходным",
        },
  
        levelHeaders: {
          enable: "Показать заголовки уровней",
          disable: "Скрыть заголовки уровней",
          settings: "Настройки отображения заголовков уровней",
          needEnable: "Сначала включите заголовки уровней",
        },
      },
  
      iconImg(src, className = "color-icon-bg-img", width = 14, height = 14) {
        return `<img src="${src}" class="${className}" width="${width}" height="${height}">`;
      },
    };
  })();