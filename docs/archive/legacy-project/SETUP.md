# Инструкция по настройке проекта ZeroSmokeWay

## Предварительные требования

1. **Node.js** v22.x или выше
2. **Flutter SDK** (>=3.0.0)
3. **Supabase** аккаунт
4. **OpenAI API** ключ
5. **Vercel** аккаунт (для деплоя)

## Шаг 1: Настройка Supabase

1. Создайте новый проект в [Supabase](https://supabase.com)
2. Перейдите в SQL Editor и выполните SQL скрипт из `supabase/schema.sql`
3. Скопируйте URL проекта и anon key из Settings > API

## Шаг 2: Настройка Backend

1. Перейдите в директорию `backend`:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `env.example`:
```bash
cp env.example .env
```

4. Заполните `.env` файл:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
NODE_ENV=development
```

5. Запустите сервер:
```bash
npm run dev
```

## Шаг 3: Настройка Frontend

1. Перейдите в директорию `frontend`:
```bash
cd frontend
```

2. Установите зависимости:
```bash
flutter pub get
```

3. Обновите `lib/utils/constants.dart`:
```dart
static const String supabaseUrl = 'YOUR_SUPABASE_URL';
static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
static const String apiBaseUrl = 'http://localhost:3000'; // для разработки
```

4. Запустите приложение:
```bash
flutter run
```

## Шаг 4: Деплой на Vercel (Полностью Serverless)

### Полностью Serverless Деплой

Приложение настроено для полностью serverless архитектуры:
- **Backend**: Vercel Serverless Functions
- **Frontend**: Flutter Web (статические файлы)
- **База данных**: Supabase (serverless)

### Настройка Vercel

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. В корневой директории проекта выполните:
```bash
vercel
```

3. Добавьте переменные окружения в Vercel Dashboard:
   - `OPENAI_API_KEY` - ваш OpenAI API ключ
   - `OPENAI_MODEL` (опционально, по умолчанию gpt-4o-mini)

4. Настройте Build Settings в Vercel Dashboard:
   - **Build Command**: `cd frontend && flutter build web --release`
   - **Output Directory**: `frontend/build/web`
   - **Install Command**: `cd frontend && flutter pub get`

5. Обновите `apiBaseUrl` в `frontend/lib/utils/constants.dart`:
```dart
static const String apiBaseUrl = 'https://your-project.vercel.app';
```

### Структура Serverless Деплоя

```
Vercel Project
├── /api/agent          → Serverless Function (backend/api/agent.js)
└── /*                  → Flutter Web статические файлы (frontend/build/web/)
```

### Локальная разработка vs Продакшен

**Локально:**
- Backend: Express сервер (`npm run dev` в `backend/`)
- Frontend: Flutter dev server (`flutter run`)

**Продакшен:**
- Backend: Vercel Serverless Functions
- Frontend: Статические файлы на Vercel

Подробнее см. [SERVERLESS_ARCHITECTURE.md](./SERVERLESS_ARCHITECTURE.md)

## Структура проекта

```
ZeroSmokeWay/
├── frontend/          # Flutter приложение
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   ├── providers/
│   │   ├── screens/
│   │   └── utils/
│   └── pubspec.yaml
├── backend/           # Node.js API
│   ├── routes/
│   ├── services/
│   └── index.js
├── supabase/          # SQL схемы
│   └── schema.sql
└── vercel.json        # Конфигурация Vercel
```

## Тестирование

1. Запустите backend: `cd backend && npm run dev`
2. Запустите frontend: `cd frontend && flutter run`
3. Откройте приложение и зарегистрируйтесь
4. Выберите Агента 1 для начала работы

## Troubleshooting

### Проблемы с Supabase
- Убедитесь, что RLS (Row Level Security) включен
- Проверьте, что политики безопасности настроены правильно

### Проблемы с OpenAI API
- Проверьте, что API ключ валиден
- Убедитесь, что у вас есть доступ к модели gpt-4o-mini

### Проблемы с Flutter
- Выполните `flutter clean` и `flutter pub get`
- Убедитесь, что используете правильную версию Dart SDK

