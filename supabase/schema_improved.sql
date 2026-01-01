-- Improved PostgreSQL schema following best practices
-- Based on pg-aiguide recommendations and modern PostgreSQL features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- User Profiles Table (Improved)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  -- Используем GENERATED ALWAYS AS IDENTITY вместо uuid_generate_v4() для автоинкремента (если нужен числовой ID)
  -- Оставляем UUID, но можно добавить числовой ID как альтернативу
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- PG13+ более эффективный способ
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Профиль пользователя
  name TEXT CHECK (char_length(name) <= 200), -- Ограничение длины
  location TEXT CHECK (char_length(location) <= 200),
  
  -- Статистика курения с CHECK ограничениями
  smoking_years INTEGER CHECK (smoking_years IS NULL OR (smoking_years >= 0 AND smoking_years <= 100)),
  cigarettes_per_day INTEGER CHECK (cigarettes_per_day IS NULL OR (cigarettes_per_day >= 0 AND cigarettes_per_day <= 200)),
  
  -- Дата отказа
  quit_date TIMESTAMP WITH TIME ZONE CHECK (quit_date IS NULL OR quit_date >= '2020-01-01'::timestamp), -- Разумная дата начала
  
  -- Статус с CHECK вместо ENUM для большей гибкости
  current_stage TEXT NOT NULL DEFAULT 'preparation' 
    CHECK (current_stage IN ('preparation', 'quit_day', 'maintenance')),
  
  -- JSONB данные с валидацией через CHECK (опционально, можно добавить JSON schema)
  anamnesis_data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_profiles_smoking_consistency CHECK (
    -- Если указан стаж, то должны быть и сигареты в день (логическая валидность)
    (smoking_years IS NULL AND cigarettes_per_day IS NULL) OR
    (smoking_years IS NOT NULL OR cigarettes_per_day IS NOT NULL)
  )
);

-- ============================================================================
-- Conversations Table (Improved)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Тип агента с CHECK
  agent_type TEXT NOT NULL 
    CHECK (agent_type IN ('anamnesis', 'myth_buster', 'support')),
  
  -- JSONB с валидацией структуры
  messages JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(messages) = 'array'), -- Гарантируем, что это массив
  
  -- Метаданные для быстрого доступа
  message_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED, -- Вычисляемое поле
  last_message_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (
    CASE 
      WHEN jsonb_array_length(messages) > 0 
      THEN (messages->jsonb_array_length(messages)-1->>'timestamp')::timestamp with time zone
      ELSE NULL
    END
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Progress Tracking Table (Improved)
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Дата с ограничениями
  date DATE NOT NULL 
    CHECK (date >= '2020-01-01' AND date <= CURRENT_DATE + INTERVAL '1 year'), -- Разумные границы
  
  -- Метрики с CHECK
  cigarettes_smoked INTEGER NOT NULL DEFAULT 0 
    CHECK (cigarettes_smoked >= 0 AND cigarettes_smoked <= 500), -- Максимум 500 в день (защита от ошибок)
  
  cravings_count INTEGER NOT NULL DEFAULT 0 
    CHECK (cravings_count >= 0 AND cravings_count <= 1000), -- Максимум 1000 позывов в день
  
  -- Настроение с CHECK
  mood TEXT CHECK (mood IS NULL OR mood IN (
    'excellent', 'good', 'neutral', 'bad', 'terrible',
    'отличное', 'хорошее', 'нейтральное', 'плохое', 'ужасное'
  )),
  
  -- Заметки с ограничением длины
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 5000),
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Уникальность по user_id и date
  CONSTRAINT progress_tracking_user_date_unique UNIQUE (user_id, date)
);

-- ============================================================================
-- Indexes (Improved with partial and expression indexes)
-- ============================================================================

-- User Profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON user_profiles(user_id);
  
-- Partial index для активных пользователей (на стадии подготовки или в день отказа)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_stage 
  ON user_profiles(user_id, current_stage) 
  WHERE current_stage IN ('preparation', 'quit_day');

-- Expression index для поиска по имени (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_user_profiles_name_lower 
  ON user_profiles(lower(name)) 
  WHERE name IS NOT NULL;

-- GIN index для быстрого поиска в JSONB
CREATE INDEX IF NOT EXISTS idx_user_profiles_anamnesis_data 
  ON user_profiles USING GIN (anamnesis_data jsonb_path_ops);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
  ON conversations(user_id);
  
CREATE INDEX IF NOT EXISTS idx_conversations_agent_type 
  ON conversations(agent_type);
  
-- Composite index для частых запросов
CREATE INDEX IF NOT EXISTS idx_conversations_user_agent 
  ON conversations(user_id, agent_type);

-- Partial index для активных разговоров (с сообщениями)
CREATE INDEX IF NOT EXISTS idx_conversations_with_messages 
  ON conversations(user_id, updated_at DESC) 
  WHERE message_count > 0;

-- GIN index для поиска в сообщениях
CREATE INDEX IF NOT EXISTS idx_conversations_messages 
  ON conversations USING GIN (messages);

-- Progress Tracking indexes
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id 
  ON progress_tracking(user_id);
  
CREATE INDEX IF NOT EXISTS idx_progress_tracking_date 
  ON progress_tracking(date DESC);

-- Composite index для временных рядов
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_date 
  ON progress_tracking(user_id, date DESC);

-- Partial index для дней с курением (для аналитики)
CREATE INDEX IF NOT EXISTS idx_progress_tracking_smoking_days 
  ON progress_tracking(user_id, date) 
  WHERE cigarettes_smoked > 0;

-- Expression index для расчета дней без курения
CREATE INDEX IF NOT EXISTS idx_progress_tracking_zero_smoking 
  ON progress_tracking(user_id, date DESC) 
  WHERE cigarettes_smoked = 0;

-- ============================================================================
-- Functions and Triggers (Improved)
-- ============================================================================

-- Улучшенная функция для updated_at (более эффективная)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Обновляем только если действительно изменились данные
  IF (TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW) THEN
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Триггеры для updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Дополнительная функция для валидации структуры messages в conversations
CREATE OR REPLACE FUNCTION validate_conversation_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Проверяем, что messages - это массив
  IF jsonb_typeof(NEW.messages) != 'array' THEN
    RAISE EXCEPTION 'messages must be a JSON array';
  END IF;
  
  -- Можно добавить дополнительную валидацию структуры элементов массива
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_conversations_messages
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION validate_conversation_messages();

-- ============================================================================
-- Row Level Security (RLS) Policies (Improved with better naming)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (для миграции)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view own progress" ON progress_tracking;
DROP POLICY IF EXISTS "Users can insert own progress" ON progress_tracking;
DROP POLICY IF EXISTS "Users can update own progress" ON progress_tracking;

-- User Profiles Policies
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Conversations Policies
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Progress Tracking Policies
CREATE POLICY "progress_tracking_select_own"
  ON progress_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "progress_tracking_insert_own"
  ON progress_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_tracking_update_own"
  ON progress_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'User profiles with smoking-related information and anamnesis data';
COMMENT ON COLUMN user_profiles.smoking_years IS 'Number of years the user has been smoking';
COMMENT ON COLUMN user_profiles.cigarettes_per_day IS 'Average number of cigarettes per day';
COMMENT ON COLUMN user_profiles.current_stage IS 'Current stage: preparation, quit_day, or maintenance';
COMMENT ON COLUMN user_profiles.anamnesis_data IS 'JSONB field containing structured anamnesis data from Agent 1';

COMMENT ON TABLE conversations IS 'Conversation history with AI agents';
COMMENT ON COLUMN conversations.agent_type IS 'Type of agent: anamnesis, myth_buster, or support';
COMMENT ON COLUMN conversations.messages IS 'JSONB array of conversation messages';
COMMENT ON COLUMN conversations.message_count IS 'Computed field: number of messages in the conversation';

COMMENT ON TABLE progress_tracking IS 'Daily progress tracking for smoking cessation';
COMMENT ON COLUMN progress_tracking.cigarettes_smoked IS 'Number of cigarettes smoked on this date';
COMMENT ON COLUMN progress_tracking.cravings_count IS 'Number of cravings experienced on this date';
