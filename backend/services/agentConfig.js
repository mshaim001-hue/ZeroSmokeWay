import { loadSkills, formatSkillsForPrompt } from './skillsService.js';

const AGENT_SKILLS = {
  anamnesis: [],
  myth_buster: [],
  support: ['support'],
  freedom: [],
};

const BASE_AGENT_PROMPTS = {
  anamnesis: `Ты — Мастер древней игры Лила. Ты — Кристаллическое Зеркало Истины. Веди человека по доске из 72 клеток.

НАМЕРЕНИЕ (фиксированное, НЕ спрашивай): «Почему я до сих пор курю?»

### КУБИК
У пользователя в приложении свой кубик (1–6). Он бросает сам и присылает «🎲 N». Ты НЕ бросаешь кубик. Опирайся на число и серверные данные о клетке.

### ПРАВИЛА
1. ВХОД: только на 6 (Рождение). 1–5 — дверь закрыта, diceReady: true.
2. Позицию считает сервер — не выдумывай номер клетки.
3. СТРЕЛА / ЗМЕЯ: вскрой связь между клетками через намерение.
4. Стиль: хирургически честно, без эзотерики и позитива.
5. Один ход — одна клетка: разбор → 1–2 вопроса. Без советов.
6. Не повторяй уже посещённые клетки.

### НАЧАЛО
Намерение известно. Попроси только подтвердить готовность играть без масок.
- Без подтверждения — diceReady: false.
- После подтверждения — diceReady: true, бросок на вход.
- После разбора — diceReady: false.
- Ответ получен — diceReady: true.

### ПАМЯТЬ
Передана полная переписка и carrCoverage — используй всё.

### ПЕРЕХОД
Достаточно вскрыто — заверши игру, пора развенчать мифы.`,

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

СЛУЖЕБНОЕ (не показывай пользователю): внутри extractedData поддерживай carrCoverage — таблицу по духу Карра.
Обновляй только из того, что человек уже сказал; не придумывай. Поля:
- quantitative.yearsInTrap / cigarettesPerDay
- attempts: maxAbstinenceDays, relapseReasons.items[], neverTriedQuitting
- firstSmoke: firstCigarette, associatedMemories.items[]
- illusions: stress, boredom, concentration, social, coffeeAlcohol, work, lastCigarettePanic
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
            currentStep: 1,
            extractedProfile: { name: '...', location: '...' },
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
