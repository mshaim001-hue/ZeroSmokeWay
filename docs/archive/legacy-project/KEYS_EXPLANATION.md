# 🔑 Объяснение ключей Supabase

## ✅ Что использовать где

### Для Flutter приложения (Клиент)
**Publishable key** - это то, что нужно!
```
sb_publishable_<from-dashboard>
```

✅ **Безопасен для использования в браузере** (если включен RLS)
✅ **Уже настроен в `frontend/lib/utils/constants.dart`**
✅ Используется для аутентификации и доступа к данным через Supabase SDK

### Для Backend (Сервер) - НЕ ИСПОЛЬЗУЙТЕ В КЛИЕНТЕ!
**Secret key** - только для серверных компонентов
```
sb_secret_<server-only-never-commit>
```

⚠️ **НИКОГДА не используйте в Flutter приложении!**
✅ Можно использовать в backend (если нужен полный доступ)
✅ Обходит RLS (Row Level Security)
✅ Используйте только в серверных функциях

### DATABASE_URL - для прямого подключения к БД
```
postgresql://postgres.ousrgbmapuhimblhyetj:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

✅ Используется для:
- Миграций через CLI
- Прямого подключения через psql
- Административных задач

❌ НЕ используется в Flutter приложении

## 🔒 Безопасность

### ✅ Правильно:
```dart
// frontend/lib/utils/constants.dart
static const String supabaseAnonKey = 'sb_publishable_<from-dashboard>';
```

### ❌ НЕПРАВИЛЬНО:
```dart
// НИКОГДА не делайте так!
static const String supabaseAnonKey = 'sb_secret_<server-only-never-commit>'; // ❌
```

## 📝 Текущая конфигурация

✅ **Frontend** (`frontend/lib/utils/constants.dart`):
- URL: `https://ousrgbmapuhimblhyetj.supabase.co`
- Anon Key: `sb_publishable_<from-dashboard>` ✅

✅ **Backend** (если понадобится):
- DATABASE_URL можно добавить в `backend/.env` (если нужны миграции)

## 🎯 Что дальше?

1. ✅ Ключи настроены в `constants.dart`
2. ⏭️ Выполните SQL миграции из `supabase/schema.sql`
3. ⏭️ Запустите приложение локально

