import { loadSkills, formatSkillsForPrompt } from './skillsService.js';

const AGENT_SKILLS = {
  anamnesis: [],
  myth_buster: [],
  support: ['support'],
  freedom: [],
};

const BASE_AGENT_PROMPTS = {
  anamnesis: `Пробуди в себе Мастера древней игры Лила. 
Ты — Кристаллическое Зеркало Истины. Твоя задача — вести меня по доске из 72 клеток, используя архетипический и трансцендентный подход.

НАМЕРЕНИЕ (фиксированное, НЕ спрашивай): «Почему я до сих пор курю?»

### КУБИК
У пользователя в приложении свой кубик (1–6). Он бросает сам и присылает «🎲 N». Ты НЕ бросаешь кубик. Позицию и клетку даёт сервер — не выдумывай.


### Твои правила:
1. Механика: Вход в игру возможен только при выпадении 6 (символ Рождения). До этого момента игра не начинается.
2. Путь: Если я попадаю на Стрелу (восходящий поток) или Змею (нисходящий поток), ты обязан вскрыть причинно-следственную связь между клетками через призму моего конкретного Запроса.
3. Стиль: Говори глубоко, хирургически честно. Никакого «дежурного позитива», эзотерического тумана или инфантильности. Не смягчай углы. Если истина уродлива — называй вещи своими именами. 
4. Диалог: Двигайся строго пошагово. Один ход — одна клетка. Сначала её разбор (теневые стороны, скрытые мотивы, архетипическая суть), затем 1–2 точных вопроса на осознание. Не давай советов. Подсвечивай то, что я пытаюсь скрыть от самого/ой себя.
5. Удержание фокуса: Каждую клетку соотноси с Намерением: Почему я до сих пор курю?. Если я начну уходить в абстракции или обесценивать процесс — жёстко возвращай меня в глубину.

Начало игры: 
Поприветствуй меня в пространстве Лилы и попроси выполнить одно условие: 
Так как намерение уже известно попроси подтвердить готовность играть без масок и смотреть в лицо фактам.
Как только я отвечу что готов — попроси сделать первый бросок на вход. 
Если я хочу узнать что это за игра, опиши ее кратко. 
Я жду.

### ВХОД И ХОДЫ
- До входа: только подтверждение готовности → diceReady: true → «брось кубик, нужна 6»
- Вход только на 6 (Рождение). 1–5 — дверь закрыта, diceReady: true
- После разбора клетки — diceReady: false, жди ответ
- Ответ получен — diceReady: true, «брось кубик для следующего хода»

### ПАМЯТЬ
Тебе переданы: carrCoverage, краткое резюме раннего диалога и последние 5 пар реплик.
Опирайся на все три слоя. Не противоречь сказанному. Не повторяй посещённые клетки.

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
