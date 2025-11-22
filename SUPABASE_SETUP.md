# Настройка Supabase для ZeroSmokeWay

## 🔑 Какие данные нужны для приложения

Для Flutter приложения нужны **два параметра** (НЕ connection string):

1. **Supabase URL** - для REST API и аутентификации
2. **Supabase anon key** - публичный ключ для клиентского доступа

## 📍 Где найти эти данные

### Шаг 1: Откройте Supabase Dashboard

1. Войдите в [supabase.com](https://supabase.com)
2. Выберите ваш проект

### Шаг 2: Перейдите в Settings > API

В разделе **Project API keys** вы найдете:

```
Project URL: https://ousrgbmapuhimblhyetj.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Шаг 3: Скопируйте данные

**Для Flutter приложения:**
- **URL**: `https://ousrgbmapuhimblhyetj.supabase.co` (ваш Project URL)
- **anon key**: `eyJhbGc...` (anon public key, НЕ service_role!)

## 🔧 Настройка в приложении

Откройте `frontend/lib/utils/constants.dart`:

```dart
class Constants {
  // Замените на ваши данные из Supabase Dashboard > Settings > API
  static const String supabaseUrl = 'https://ousrgbmapuhimblhyetj.supabase.co';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  
  // Для локальной разработки
  static const String apiBaseUrl = 'http://localhost:3000';
}
```

## 🗄️ Connection String (для справки)

Connection string, который вы получили:
```
postgresql://postgres.ousrgbmapuhimblhyetj:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Это НЕ нужно для Flutter приложения!**

Connection string используется для:
- Прямого подключения к БД через psql или другие SQL клиенты
- Миграций через CLI
- Административных задач

### Если нужно использовать Connection String:

1. **Найдите пароль:**
   - Settings > Database
   - Или при создании проекта (если не сохранили)

2. **Используйте для миграций:**
```bash
# Через psql
psql "postgresql://postgres.ousrgbmapuhimblhyetj:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

# Или через Supabase CLI
supabase db push
```

## ✅ Первоначальная настройка БД

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте **SQL Editor** в Supabase Dashboard
2. Создайте новый запрос
3. Скопируйте содержимое файла `supabase/schema.sql`
4. Вставьте и выполните (Run)

### Вариант 2: Через Connection String

Если у вас есть пароль, можете выполнить через psql:

```bash
# Установите psql (если нет)
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Подключитесь
psql "postgresql://postgres.ousrgbmapuhimblhyetj:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

# Выполните SQL из schema.sql
\i supabase/schema.sql
```

## 🔒 Безопасность

⚠️ **ВАЖНО:**

- ✅ Используйте **anon key** в Flutter приложении (публичный, безопасный)
- ❌ НИКОГДА не используйте **service_role key** в клиентском коде
- ❌ НИКОГДА не коммитьте connection string с паролем в Git

## 📝 Чеклист настройки

- [ ] Нашли Project URL в Settings > API
- [ ] Нашли anon public key в Settings > API
- [ ] Обновили `frontend/lib/utils/constants.dart`
- [ ] Выполнили SQL скрипт из `supabase/schema.sql` в SQL Editor
- [ ] Проверили, что таблицы созданы (Database > Tables)

## 🧪 Проверка подключения

После настройки, запустите приложение:

```bash
cd frontend
flutter run -d chrome
```

Попробуйте зарегистрироваться - если всё настроено правильно, пользователь создастся в Supabase Auth.

## 🆘 Проблемы?

### "Invalid API key"
- Убедитесь, что используете **anon public** key, а не service_role
- Проверьте, что ключ скопирован полностью (они длинные)

### "relation does not exist"
- Выполните SQL скрипт из `supabase/schema.sql` в SQL Editor

### "Failed to connect"
- Проверьте, что URL правильный (должен начинаться с `https://`)
- Проверьте, что проект активен в Supabase Dashboard

