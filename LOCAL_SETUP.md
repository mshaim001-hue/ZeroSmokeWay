# 🚀 Локальная разработка и тестирование

Быстрый гайд для запуска приложения локально без деплоя на Vercel.

## 📋 Предварительные требования

1. **Node.js** v22.x или выше
   ```bash
   node --version  # Должно быть >= 22.0.0
   ```

2. **Flutter SDK** (>=3.0.0)
   ```bash
   flutter --version  # Должно быть >= 3.0.0
   ```

3. **Supabase** аккаунт (бесплатный)
   - Зарегистрируйтесь на [supabase.com](https://supabase.com)

4. **OpenAI API** ключ
   - Получите на [platform.openai.com](https://platform.openai.com)

## ⚡ Быстрый старт

### Шаг 1: Настройка Supabase (5 минут)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в **SQL Editor**
3. Скопируйте содержимое файла `supabase/schema.sql`
4. Вставьте и выполните SQL скрипт
5. Перейдите в **Settings > API**
6. Скопируйте:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **anon public key**

### Шаг 2: Настройка Backend (2 минуты)

```bash
# Перейдите в директорию backend
cd backend

# Установите зависимости
npm install

# Создайте файл .env
cp env.example .env

# Откройте .env и заполните:
# OPENAI_API_KEY=sk-... (ваш OpenAI API ключ)
# OPENAI_MODEL=gpt-4o-mini
# PORT=3000
# NODE_ENV=development
```

**Важно:** Откройте файл `backend/.env` и вставьте ваш OpenAI API ключ:
```env
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
NODE_ENV=development
```

### Шаг 3: Настройка Frontend (2 минуты)

```bash
# Перейдите в директорию frontend
cd frontend

# Установите зависимости
flutter pub get

# Откройте lib/utils/constants.dart и замените:
# - YOUR_SUPABASE_URL на ваш Supabase URL
# - YOUR_SUPABASE_ANON_KEY на ваш Supabase anon key
# - apiBaseUrl уже настроен на http://localhost:3000
```

Откройте `frontend/lib/utils/constants.dart` и обновите:
```dart
static const String supabaseUrl = 'https://xxxxx.supabase.co';  // Ваш URL
static const String supabaseAnonKey = 'eyJhbGc...';  // Ваш anon key
static const String apiBaseUrl = 'http://localhost:3000';  // Уже настроено
```

### Шаг 4: Запуск приложения

#### Терминал 1: Backend
```bash
cd backend
npm run dev
```

Вы должны увидеть:
```
🚀 Development server running on port 3000
📝 API endpoint: http://localhost:3000/api/agent
⚠️  This is for development only. Production uses Vercel Serverless Functions.
```

#### Терминал 2: Frontend
```bash
cd frontend
flutter run -d chrome  # Для веб-версии
# или
flutter run  # Выберите устройство из списка
```

### Шаг 5: Тестирование

1. Откройте приложение в браузере (обычно `http://localhost:xxxxx`)
2. Зарегистрируйтесь или войдите
3. Выберите **Агент 1: Собиратель информации**
4. Начните диалог!

## 🧪 Проверка работы

### Проверка Backend

Откройте в браузере или через curl:
```bash
curl http://localhost:3000/health
```

Должен вернуться:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Проверка API агента

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Привет",
    "agentType": "anamnesis",
    "conversationHistory": []
  }'
```

### Проверка Frontend

1. Откройте DevTools (F12)
2. Перейдите в Console
3. Не должно быть ошибок подключения к API

## 🔧 Troubleshooting

### Backend не запускается

**Проблема:** `Error: Cannot find module`
```bash
cd backend
rm -rf node_modules
npm install
```

**Проблема:** `Port 3000 is already in use`
```bash
# Измените PORT в backend/.env на другой порт (например, 3001)
# И обновите apiBaseUrl в frontend/lib/utils/constants.dart
```

### Frontend не подключается к Backend

**Проблема:** CORS ошибки
- Убедитесь, что backend запущен на `http://localhost:3000`
- Проверьте `apiBaseUrl` в `constants.dart`

**Проблема:** `Failed to load resource`
- Проверьте, что backend запущен
- Проверьте URL в `constants.dart`

### Supabase ошибки

**Проблема:** `Invalid API key`
- Проверьте, что скопировали правильный `anon key` (не `service_role key`)
- Убедитесь, что URL правильный

**Проблема:** `relation does not exist`
- Выполните SQL скрипт из `supabase/schema.sql` в Supabase SQL Editor

### OpenAI ошибки

**Проблема:** `Invalid API key`
- Проверьте, что ключ начинается с `sk-`
- Убедитесь, что у вас есть доступ к API

**Проблема:** `Rate limit exceeded`
- Подождите немного или проверьте лимиты на platform.openai.com

## 📝 Структура для локальной разработки

```
ZeroSmokeWay/
├── backend/
│   ├── .env              # ← Создайте этот файл с OpenAI ключом
│   ├── index.js          # Express сервер (только для dev)
│   └── package.json
├── frontend/
│   ├── lib/
│   │   └── utils/
│   │       └── constants.dart  # ← Обновите Supabase credentials
│   └── pubspec.yaml
└── supabase/
    └── schema.sql        # ← Выполните в Supabase SQL Editor
```

## 🎯 Что дальше?

После успешного локального запуска:

1. ✅ Протестируйте все три агента
2. ✅ Проверьте регистрацию и авторизацию
3. ✅ Убедитесь, что данные сохраняются в Supabase
4. ✅ Протестируйте диалоги с AI

Когда будете готовы к деплою, см. [SETUP.md](./SETUP.md) раздел "Деплой на Vercel"

## 💡 Полезные команды

```bash
# Очистка Flutter кэша
cd frontend
flutter clean
flutter pub get

# Перезапуск backend с очисткой
cd backend
rm -rf node_modules
npm install
npm run dev

# Проверка версий
node --version
flutter --version
```

## 🆘 Нужна помощь?

Если что-то не работает:
1. Проверьте все шаги выше
2. Убедитесь, что все зависимости установлены
3. Проверьте логи в терминалах
4. Проверьте консоль браузера (F12)

