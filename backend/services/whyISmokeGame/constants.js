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
  PLAY: 'play',
  CIRCLING: 'circling',
  REALITY_CHECK: 'reality_check',
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
    'Теперь мы лучше понимаем, что сигарета делает для тебя.\n\nСледующий вопрос:\nдействительно ли она всё это даёт?',
  cta: 'Перейти к разбору',
};

export const LINK_TYPE = {
  ARROW: 'arrow',
  SNAKE: 'snake',
};

export const OVERSHOOT = {
  BOUNCE: 'bounce',
  STAY: 'stay',
};

export const DEFAULT_INTENTION = 'Почему я до сих пор курю?';
