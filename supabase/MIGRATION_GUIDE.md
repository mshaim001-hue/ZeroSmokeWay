# Миграция на улучшенную схему БД

Этот документ описывает улучшения в схеме БД и как их применить.

## Основные улучшения

### 1. **Современные методы генерации UUID**
- `gen_random_uuid()` вместо `uuid_generate_v4()` (PG13+, более эффективно)
- Альтернатива: можно использовать `GENERATED ALWAYS AS IDENTITY` для числовых ID

### 2. **CHECK ограничения**
Добавлены проверки данных на уровне БД:
- Ограничения длины для текстовых полей
- Валидация диапазонов для чисел (лет курения, сигарет в день)
- Проверка значений для enum-подобных полей (mood, current_stage)
- Логическая согласованность данных

### 3. **Вычисляемые поля (Generated Columns)**
- `message_count` в conversations - автоматически вычисляется
- `last_message_at` в conversations - последнее сообщение
- Это улучшает производительность и гарантирует консистентность

### 4. **Улучшенные индексы**

#### Partial Indexes (частичные индексы)
- `idx_user_profiles_active_stage` - только для активных пользователей
- `idx_conversations_with_messages` - только для разговоров с сообщениями
- `idx_progress_tracking_smoking_days` - только дни с курением
- `idx_progress_tracking_zero_smoking` - дни без курения

#### Expression Indexes (выражения)
- `idx_user_profiles_name_lower` - case-insensitive поиск по имени

#### GIN Indexes для JSONB
- Быстрый поиск в `anamnesis_data` и `messages`

### 5. **Улучшенные функции и триггеры**
- Более эффективная функция `update_updated_at_column`
- Валидация структуры JSON в триггерах

### 6. **Лучшие имена**
- Политики RLS с понятными именами (snake_case вместо camelCase)
- Комментарии к таблицам и колонкам для документации

## Применение миграции

### Вариант 1: С нуля (новая установка)
Просто выполните `schema_improved.sql` вместо `schema.sql`

### Вариант 2: Миграция существующей БД

```sql
-- 1. Создайте резервную копию!
-- pg_dump your_database > backup.sql

-- 2. Добавьте CHECK ограничения (если данные валидны)
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_smoking_years_check 
  CHECK (smoking_years IS NULL OR (smoking_years >= 0 AND smoking_years <= 100));

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_cigarettes_per_day_check 
  CHECK (cigarettes_per_day IS NULL OR (cigarettes_per_day >= 0 AND cigarettes_per_day <= 200));

-- 3. Добавьте generated columns
ALTER TABLE conversations 
  ADD COLUMN message_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED;

-- 4. Создайте новые индексы
CREATE INDEX idx_user_profiles_active_stage 
  ON user_profiles(user_id, current_stage) 
  WHERE current_stage IN ('preparation', 'quit_day');

-- 5. Обновите триггеры
-- (см. код в schema_improved.sql)

-- 6. Пересоздайте политики RLS
-- (см. код в schema_improved.sql)
```

### Вариант 3: Использование миграционных инструментов
Рекомендуется использовать инструменты типа:
- `supabase/migrations` для Supabase
- `flyway` или `liquibase` для других БД
- Собственные миграционные скрипты

## Проверка после миграции

```sql
-- Проверка индексов
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Проверка ограничений
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass;

-- Проверка политик RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Откат изменений

Если нужно откатиться:
1. Восстановите из резервной копии
2. Или удалите новые ограничения/индексы вручную:

```sql
-- Удаление CHECK ограничений (пример)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_smoking_years_check;
```

## Производительность

Ожидаемые улучшения:
- **Частичные индексы**: 20-40% уменьшение размера индексов и ускорение запросов
- **GIN индексы**: в 10-100 раз быстрее поиск в JSONB
- **Generated columns**: нет необходимости обновлять поля вручную, всегда актуальные данные

## Совместимость

Миграция требует PostgreSQL 13+ для:
- `gen_random_uuid()` 
- Generated columns

Для PostgreSQL 10-12 используйте оригинальную схему или адаптируйте код.
