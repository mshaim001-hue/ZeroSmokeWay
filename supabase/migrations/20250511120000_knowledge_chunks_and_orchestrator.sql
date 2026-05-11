-- Если `CREATE EXTENSION vector` падает: Supabase → Database → Extensions → включите «vector», затем снова выполните миграцию.
CREATE EXTENSION IF NOT EXISTS vector;

-- Чанки базы знаний + эмбеддинги для RAG в БД
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  source_path TEXT,
  chunk_index INTEGER,
  content TEXT NOT NULL,
  agent_types TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_agent_types ON public.knowledge_chunks USING gin (agent_types);

-- После заливки чанков создайте индекс по embedding (HNSW / ivfflat) в SQL Editor — на пустой таблице ivfflat может падать.

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Клиенты не читают чанки напрямую; backend с service_role обходит RLS.

-- RPC: поиск похожих чанков (вызывается из backend с service role)
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 5,
  filter_agent text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_path text,
  agent_types text[],
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.source_path,
    kc.agent_types,
    (1 - (kc.embedding <=> query_embedding))::double precision AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.embedding IS NOT NULL
    AND (filter_agent IS NULL OR filter_agent = ANY (kc.agent_types))
  ORDER BY kc.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 50));
$$;

REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector, integer, text) TO service_role;

-- Таблица диалогов: либо расширяем CHECK (если уже есть schema.sql), либо создаём с нуля под оркестратор
DO $conv$
BEGIN
  IF to_regclass('public.conversations') IS NULL THEN
    CREATE TABLE public.conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      agent_type TEXT NOT NULL CHECK (
        agent_type = ANY (ARRAY['anamnesis', 'myth_buster', 'support', 'orchestrator']::text[])
      ),
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_agent_type_check;
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_agent_type_check
      CHECK (agent_type = ANY (ARRAY['anamnesis', 'myth_buster', 'support', 'orchestrator']::text[]));
  END IF;
END
$conv$;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_type ON public.conversations(agent_type);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.knowledge_chunks IS 'Фрагменты PDF и эмбеддинги для RAG; заливка: npm run sync-knowledge (backend)';
COMMENT ON TABLE public.conversations IS 'История чата в JSONB messages; orchestrator — один активный поток на пользователя с бэкенда';
