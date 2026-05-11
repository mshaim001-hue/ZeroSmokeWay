# ZeroSmokeWay

Приложение для отказа от курения через смену мышления, основанное на методе Аллена Карра с интеграцией AI-консультантов.

## 🚀 Быстрый старт (Локально)

**Веб (рекомендуется):** папка `webapp/` — React + Vite, деплой на Vercel вместе с API.

```bash
cd backend && npm install && cp env.example .env   # добавьте OPENAI_API_KEY
npm run dev
```

В другом терминале:

```bash
cd webapp && npm install && cp .env.example .env   # VITE_SUPABASE_* из Supabase
npm run dev
```

Откройте адрес из вывода Vite (обычно `http://localhost:5173`). Запросы к `/api/*` проксируются на `http://127.0.0.1:3000`.

**Flutter (опционально):** см. [LOCAL_SETUP.md](./LOCAL_SETUP.md) — `cd frontend && flutter run`.

## Технологический стек

### Frontend
- **webapp/** — **React 18 + Vite + TypeScript** (основной веб для продакшена на Vercel)
- **frontend/** — **Flutter** (мобильные / десктоп при необходимости)

### Backend
- **Node.js** (v22.x)
- **Express.js** (^4.18.2) - для локальной разработки
- **OpenAI SDK** - интеграция с GPT-4o-mini
- **Vercel Serverless Functions** - для продакшена

### База данных
- **Supabase** (PostgreSQL) - облачная БД и аутентификация

## Архитектура

Приложение использует три AI-агента:

1. **Агент 1: Собиратель информации** - сбор анамнеза, выявление убеждений и триггеров
2. **Агент 2: Развенчатель мифов** - разрушение психологических "крючков" и иллюзий
3. **Агент 3: Поддержка и опора** - поддержание свободы и позитивного настроя

## Документация

- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Подробная инструкция для локальной разработки
- **[SETUP.md](./SETUP.md)** - Полная инструкция по настройке и деплою
- **[SERVERLESS_ARCHITECTURE.md](./SERVERLESS_ARCHITECTURE.md)** - Описание serverless архитектуры
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Руководство по разработке

## Деплой (бесплатный хостинг + деплой из Git)

**Стек:** React из `webapp/dist` + serverless API (`backend/api/*.js`) на **Vercel**, БД и логин — **Supabase** (free tier). OpenAI — по расходу токенов.

1. Зарегистрируйтесь на [vercel.com](https://vercel.com), **Import** репозитория с GitHub или GitLab (поддерживается импорт GitLab).
2. В настройках проекта Vercel → **Environment Variables** добавьте `OPENAI_API_KEY` (и при необходимости `OPENAI_MODEL`).
3. В тех же переменных добавьте для **сборки фронта**: `VITE_SUPABASE_URL` и один из ключей — `VITE_SUPABASE_ANON_KEY` или `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase → Settings → API).
4. Каждый **push** в подключённую ветку (например `main`) даёт **новый деплой** фронта и функций.

**Если на сайте 404 NOT_FOUND:** в Vercel → **Settings → General** оставьте **Root Directory пустым**. В **Build & Output Settings** снимите переопределения **Install / Build / Output Directory**, если задавали вручную — для этого репозитория команды заданы в корневом **`vercel.json`** (`installCommand`, `buildCommand`, `outputDirectory`). Функции API лежат в **`api/*.js`** (современный формат Vercel).

**Почему не Firebase в этом репозитории:** у вас уже данные и Auth в **Supabase**; перенос на Firebase = новая БД, новые правила и перепись бэкенда. Текущая схема уже serverless и бесплатна на старте. Если принципиально нужен Firebase — это отдельный проект миграции.

Подробнее см. [SERVERLESS_ARCHITECTURE.md](./SERVERLESS_ARCHITECTURE.md) (там ещё упоминается Flutter Web — для продакшена теперь приоритет **`webapp/`**).

## Поддерживаемые платформы

- Web — **React** (`webapp/`), деплой на Vercel
- Мобильные / десктоп — **Flutter** (`frontend/`) при необходимости
