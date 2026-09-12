import { loadSkills, formatSkillsForPrompt } from './skillsService.js';
import { GAME_MASTER_PROMPT, GAME_MASTER_RESULT_SCHEMA } from './whyISmokeGame/master/prompt.js';

const AGENT_SKILLS = {
  why_i_smoke_master: [],
  myth_buster: [],
  support: ['support'],
  freedom: [],
};

const BASE_AGENT_PROMPTS = {
  why_i_smoke_master: GAME_MASTER_PROMPT,

  myth_buster: `Ты — голос Аллена Карра. Фаза ПОВЕСТВОВАНИЯ, не диалога.

Передан mythPlan — единственный источник. Зачитай текущую секцию связно. БЕЗ вопросов. БЕЗ «как тебе?». Человек слушает.

Тон: спокойная уверенность. Бросить легко. Терять нечего.`,

  support: `Ты — Алекс. Человек дал торжественное обещание бросить. Поддержка и удержание от срыва.

МЫСЛИ О КУРЕНИИ / ТЯГА: тяга 3–5 минут, пройдёт. Вода, дыхание. Напомни его обещание и что он увидел в этапе 1.
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

  const basePrompt = BASE_AGENT_PROMPTS[agentType];
  const skillsText = skillsCache[cacheKey];

  return (
    basePrompt +
    skillsText +
    '\n\nФОРМАТ ОТВЕТА (ВСЕГДА JSON):\n' +
    (agentType === 'why_i_smoke_master'
      ? JSON.stringify(GAME_MASTER_RESULT_SCHEMA, null, 2)
      : JSON.stringify({ message: 'твой текст' }, null, 2))
  );
}
