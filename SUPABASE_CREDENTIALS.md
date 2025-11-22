# 🔑 Настройка Supabase Credentials

## ⚠️ Важно: Connection String ≠ Flutter Credentials

Вы предоставили **connection string** для PostgreSQL:
```
postgresql://postgres.ousrgbmapuhimblhyetj:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Это НЕ то, что нужно для Flutter приложения!**

## ✅ Что нужно для Flutter

Из вашего connection string я вижу, что ваш проект ID: `ousrgbmapuhimblhyetj`

Для Flutter приложения нужны:
1. **Supabase URL**: `https://ousrgbmapuhimblhyetj.supabase.co`
2. **Supabase anon key**: нужно получить из Dashboard

## 📍 Где найти anon key

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. В разделе **Project API keys** найдите:
   - **Project URL**: `https://ousrgbmapuhimblhyetj.supabase.co` ✅ (уже знаем)
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ← **СКОПИРУЙТЕ ЭТО**

## 🔧 Настройка в коде

Откройте `frontend/lib/utils/constants.dart` и замените:

```dart
class Constants {
  // Supabase Configuration
  static const String supabaseUrl = 'https://ousrgbmapuhimblhyetj.supabase.co';
  static const String supabaseAnonKey = 'eyJhbGc...'; // ← Вставьте anon key из Dashboard
  
  // API Configuration
  static const String apiBaseUrl = 'http://localhost:3000';
  // ...
}
```

## 🗄️ Connection String - для чего он нужен?

Connection string используется для:
- ✅ Прямого подключения к БД через `psql` или SQL клиенты
- ✅ Выполнения миграций через CLI
- ✅ Административных задач

**НЕ используется в Flutter приложении!**

### Если нужно выполнить SQL миграции:

1. **Через Supabase Dashboard (Рекомендуется):**
   - Откройте **SQL Editor**
   - Вставьте содержимое `supabase/schema.sql`
   - Нажмите **Run**

2. **Через psql (если есть пароль):**
```bash
psql "postgresql://postgres.ousrgbmapuhimblhyetj:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" -f supabase/schema.sql
```

## 📝 Чеклист

- [ ] Открыл Supabase Dashboard → Settings → API
- [ ] Скопировал **anon public** key (НЕ service_role!)
- [ ] Обновил `frontend/lib/utils/constants.dart` с URL и anon key
- [ ] Выполнил SQL из `supabase/schema.sql` в SQL Editor
- [ ] Проверил, что таблицы созданы (Database → Tables)

## 🧪 Проверка

После настройки запустите:
```bash
cd frontend
flutter run -d chrome
```

Попробуйте зарегистрироваться - если всё правильно, пользователь создастся в Supabase Auth.

