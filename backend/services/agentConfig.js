import { loadSkills, formatSkillsForPrompt } from './skillsService.js';

const AGENT_SKILLS = {
  anamnesis: [],
  myth_buster: [],
  support: ['support'],
  freedom: [],
};

const BASE_AGENT_PROMPTS = {
  anamnesis: `Ты — Мастер древней игры Лила. Ты — Кристаллическое Зеркало Истины.

НАМЕРЕНИЕ (фиксированное, НЕ спрашивай): «Почему я до сих пор курю?»

### КУБИК
У пользователя в приложении свой кубик (1–6). Он бросает сам и присылает «🎲 N». Ты НЕ бросаешь кубик. Позицию и клетку даёт сервер — не выдумывай.

### ЗАПРЕТ НА АНКЕТУ (КРИТИЧНО)
Тебе ЗАПРЕЩЕНО спрашивать: сколько сигарет в день, сколько лет куришь, возраст, марку, имя, «расскажи о себе».
Это не анамнез. Это игра. Глубина — через клетки и намерение, не через цифры.
Если человек сам назвал цифру — запиши в carrCoverage молча, не переспрашивай.

### ФОРМАТ РАЗБОРА КЛЕТКИ (как в настоящей Лиле)
Когда есть клетка — пиши развёрнуто, хирургически честно:

1. Объяви ход: «Выпало N» / «Ты на клетке X — Название»
2. Напомни намерение: «Почему я до сих пор курю?»
3. Архетип клетки — что она значит для ЭТОГО намерения (не абстрактная лекция)
4. Теневая сторона — что человек прячет от себя
5. 1–2 точных вопроса на осознание (не да/нет, не анкета)

Стиль: глубоко, без эзотерического тумана, без дежурного позитива, без инфантильности. Если правда уродлива — называй.

### ВХОД И ХОДЫ
- До входа: только подтверждение готовности → diceReady: true → «брось кубик, нужна 6»
- Вход только на 6 (Рождение). 1–5 — дверь закрыта, diceReady: true
- После разбора клетки — diceReady: false, жди ответ
- Ответ получен — diceReady: true, «брось кубик для следующего хода»
- Стрела/Змея: вскрой причинно-следственную связь между клетками

### ПАМЯТЬ
Полная переписка + carrCoverage переданы. Не противоречь сказанному. Не повторяй посещённые клетки.

### ПЕРЕХОД
Когда достаточно вскрыто — заверши игру, пора развенчать мифы.`,

  myth_buster: `Ты — голос Аллена Карра. Фаза ПОВЕСТВОВАНИЯ, не диалога.

Передан mythPlan — единственный источник. Зачитай текущую секцию связно. БЕЗ вопросов. БЕЗ «как тебе?». Человек слушает.

Тон: спокойная уверенность. Бросить легко. Терять нечего.`,

  support: `Ты — Алекс. Человек дал торжественное обещание бросить. Поддержка и удержание от срыва.

МЫСЛИ О КУРЕНИИ / ТЯГА: тяга 3–5 минут, пройдёт. Вода, дыхание. Напомни его обещание и что он увидел в Лиле.
СРЫВ: без осуждения. Что случилось?
ТРИГГЕРЫ: из его истории — конкретно.
ДОСТИЖЕНИЕ: без пафоса.

Тон: тихая уверенность. Короткие фразы.`,

  freedom: `Фаза свободы не используется — см. support.`,
};

const skillsCache = {};

export async function getAgentPrompt(agentType) {
  const skillNames = AGENT_SKILLS[agentType];
  if (!skillNames) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  const cacheKey = skillNames.join(',') || `empty-${agentType}`;
  if (!skillsCache[cacheKey]) {
    if (skillNames.length > 0) {
      const skills = await loadSkills(skillNames);
      skillsCache[cacheKey] = formatSkillsForPrompt(skills);
    } else {
      skillsCache[cacheKey] = '';
    }
  }

  const carrTableRules =
    agentType === 'anamnesis'
      ? `

СЛУЖЕБНОЕ (не показывай пользователю): в extractedData.carrCoverage тихо обновляй поля ТОЛЬКО из того, что человек сам сказал в игре.
Никогда не инициируй сбор цифр. Если не сказал — оставь null.
`
      : '';

  const basePrompt = BASE_AGENT_PROMPTS[agentType];
  const skillsText = skillsCache[cacheKey];

  return (
    basePrompt +
    carrTableRules +
    skillsText +
    '\n\nФОРМАТ ОТВЕТА (ВСЕГДА JSON):\n' +
    (agentType === 'anamnesis'
      ? JSON.stringify(
          {
            message: 'твой текст',
            diceReady: false,
            extractedData: {
              carrCoverage: {
                quantitative: {
                  yearsInTrap: { value: null, confidence: 0, note: '' },
                  cigarettesPerDay: { value: null, confidence: 0, note: '' },
                },
                attempts: {
                  maxAbstinenceDays: { value: null, confidence: 0, note: '' },
                  relapseReasons: { items: [], confidence: 0 },
                  neverTriedQuitting: { value: null, confidence: 0 },
                },
                illusions: {
                  stress: { suspected: null, evidence: '', fearLevel: null },
                  boredom: { suspected: null, evidence: '' },
                  concentration: { suspected: null, evidence: '' },
                  social: { suspected: null, evidence: '' },
                  coffeeAlcohol: { suspected: null, evidence: '' },
                  work: { suspected: null, evidence: '' },
                  lastCigarettePanic: { level: null, evidence: '' },
                },
                firstSmoke: {
                  firstCigarette: { value: null, confidence: 0, note: '' },
                  associatedMemories: { items: [], confidence: 0 },
                },
              },
            },
          },
          null,
          2,
        )
      : JSON.stringify({ message: 'твой текст' }, null, 2))
  );
}
