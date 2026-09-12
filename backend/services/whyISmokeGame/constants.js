export const GAME_ID = 'why_i_smoke_game';

export const SESSION_STATUS = {
  ACTIVE: 'active',
  REFLECTION: 'reflection',
  COMPLETED: 'completed',
};

export const HYPOTHESIS_STATUS = {
  CANDIDATE: 'candidate',
  SUPPORTED: 'supported',
  WEAKENED: 'weakened',
  CONTRADICTED: 'contradicted',
  DISCARDED: 'discarded',
};

export const GAME_PHASE = {
  PLAYING: 'playing',
  FINAL_REALITY_CHECK: 'final_reality_check',
  MIRROR: 'mirror',
};

export const HYPOTHESIS_ACTION = {
  CREATE: 'create',
  ADD_EVIDENCE: 'add_evidence',
  ADD_COUNTER_EVIDENCE: 'add_counter_evidence',
  WEAKEN: 'weaken',
  DISCARD: 'discard',
  SUPPORT: 'support',
  REALITY_CHECK: 'reality_check',
};

export const SATURATION = {
  SOFT_HINT_TURNS: 8,
  HARD_LIMIT_TURNS: 16,
  MIN_STABLE: 1,
  MAX_STABLE: 3,
  MIN_EVIDENCE_EPISODES: 2,
  REPEAT_WINDOW: 3,
};

export const HANDOFF_COPY = {
  message:
    'Ты увидел, какую роль сигарета играет именно у тебя.\n\nТеперь проверим следующий вопрос:\nдействительно ли сигарета даёт тебе то, что ты ей приписываешь?',
  cta: 'Перейти к разбору',
};

/** Architectural leftover. Runtime movement does not apply snakes or arrows. */
export const LINK_TYPE = {
  ARROW: 'arrow',
  SNAKE: 'snake',
};

/** Architectural leftover. Runtime movement wraps; it does not bounce. */
export const OVERSHOOT = {
  WRAP: 'wrap',
  BOUNCE: 'bounce',
  STAY: 'stay',
};

export const DEFAULT_INTENTION = 'Почему я до сих пор курю?';
export const INITIAL_ANSWER_PROMPT = 'Как ты сам сейчас отвечаешь на этот вопрос?';
