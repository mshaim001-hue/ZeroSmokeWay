-- Снимок состояния оркестратора для возобновления диалога после входа
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS orchestrator_state JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.conversations.orchestrator_state IS 'Серверный снимок: phase, plan, anamnesis (merge клиента и extractedData)';
