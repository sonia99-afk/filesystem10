# Архитектура хранения проектов

Доступ к сохранённым проектам отделён от интерфейса и автосохранения. UI и `autosave.js` больше не знают названия ключей браузерного хранилища.

## Слои

1. `data/project_document.js` отвечает за формат документа версии 2, разделы `project`/`ui`, миграцию и валидацию.
2. `data/project_repository.js` определяет контракт `ProjectRepository` и реализацию `LocalStorageProjectRepository`.
3. `autosave.js` управляет проектами, вызывает `snapshot()`/`restore()` и работает только через `window.projectRepository`.
4. Модули интерфейса вызывают публичный API `window.projectAutosave` и не обращаются к данным проектов напрямую.

## Контракт ProjectRepository

- `loadIndex()` — загрузить индекс проектов;
- `saveIndex(index)` — сохранить индекс;
- `loadProject(projectId)` — загрузить сериализованный документ;
- `saveProject(projectId, serializedDocument)` — сохранить документ;
- `deleteProject(projectId)` — удалить документ;
- `loadLegacyMultiStore()` и `loadLegacySingleProject()` — предоставить старые данные миграции;
- `clear(projectIds)` — удалить индекс, legacy-данные и документы указанных проектов.

Текущая реализация синхронная, поскольку использует `localStorage`. При переходе к сетевому API потребуется асинхронная реализация репозитория и отдельный этап перевода управляющего слоя на `await`. Эта граница теперь локализована: менять модули редактора и формат документа для этого не потребуется.

## Совместимость

Ключи хранения оставлены прежними:

- `org_structure_projects_index_v1`;
- `org_structure_project_data_<projectId>`;
- `org_structure_projects_v1` — старый мультипроектный формат;
- `org_structure_project_autosave_v1` — старый одиночный формат.

Поэтому существующие проекты продолжают открываться без ручного экспорта или очистки браузерных данных.

## Ошибки

Адаптер приводит ошибки браузерного хранилища к `ProjectRepositoryError`. Управляющий слой сохраняет последнюю ошибку в `projectAutosave.getLastStorageError()` и отправляет событие `project-storage-error`, чтобы позднее можно было подключить единое пользовательское уведомление.
