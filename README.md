# ZeroSmokeWay

Приложение для отказа от курения через смену мышления, основанное на методе Аллена Карра с интеграцией AI-консультантов.

## 🚀 Быстрый старт (Локально)

**Для локального тестирования см. [LOCAL_SETUP.md](./LOCAL_SETUP.md)**

Краткая версия:
1. Настройте Supabase (см. LOCAL_SETUP.md)
2. Настройте backend: `cd backend && npm install && cp env.example .env` (добавьте OpenAI ключ)
3. Настройте frontend: обновите `frontend/lib/utils/constants.dart` с Supabase credentials
4. Запустите backend: `cd backend && npm run dev`
5. Запустите frontend: `cd frontend && flutter run -d chrome`

## Технологический стек

### Frontend
- **Flutter** - кроссплатформенный фреймворк
- **Dart** (SDK >=3.0.0 <4.0.0)
- **Provider** (^6.1.1) - управление состоянием
- **Material Design**

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

## Деплой

**Полностью Serverless архитектура:**
- Frontend: Flutter Web (статические файлы) на Vercel
- Backend: Vercel Serverless Functions
- База данных: Supabase (serverless PostgreSQL)
- Аутентификация: Supabase Auth (serverless)

Подробнее см. [SERVERLESS_ARCHITECTURE.md](./SERVERLESS_ARCHITECTURE.md)

## Поддерживаемые платформы

- Web (Flutter Web)
- iOS
- Android
- Desktop (Linux, macOS, Windows)
