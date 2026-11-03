# Разработка

Текущий продукт — мобильный cinematic path в `webapp` (React + TypeScript): фильм, затем чат, после финала — support home. Backend обслуживает `/api/scene` и `/api/support`.

Перед коммитом: `npm test` в `webapp` и `backend`, при правках UI — `npm run build` в `webapp`. Меняя сцены или support, обновляйте README и `docs/design`. Старые прототипы (включая Phaser Labyrinth) лежат в `docs/archive` и в истории Git; не возвращайте параллельный пользовательский поток. Ключи и `.env` не коммитятся.
