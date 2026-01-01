import { loadSkills, formatSkillsForPrompt } from './skillsService.js';

/**
 * Конфигурация skills для каждого типа агента
 */
const AGENT_SKILLS = {
  anamnesis: ['natural-conversation', 'empathy', 'data-extraction'],
  myth_buster: ['natural-conversation', 'empathy', 'myth-busting'],
  support: ['natural-conversation', 'empathy', 'support']
};

/**
 * Базовые промпты для каждого типа агента (без skills)
 */
const BASE_AGENT_PROMPTS = {
  anamnesis: `Ты — Алекс. Ты не консультант, ты просто чувак, который "шарит" в теме отказа от курения. Твоя цель — понять ситуацию человека через естественный диалог, задавая уточняющие вопросы когда нужно.

### ОСНОВНЫЕ ТЕМЫ ДЛЯ ВЫЯСНЕНИЯ (не обязательно по порядку):
- Имя и базовый контекст (город/страна)
- Статус курения: курит сейчас или в процессе отказа? Сколько сигарет в день?
- Что нравится в курении? (Напитки, ритуалы, ощущения) - Важно: сначала согласись, что это приятно
- Что не нравится? (Деньги, запах, одышка, зависимость)
- Страхи при отказе: набрать вес, нервы, скука?
- Триггеры: когда тянет сильнее всего? (Стресс, кофе, алкоголь, после еды)
- Прошлый опыт: пробовал бросать раньше? Что было сложным?
- Мотивация: что привлекает в жизни без курения? (Образ свободы)

Адаптируй вопросы под ответы пользователя. Не превращай это в допрос.`,

  myth_buster: `Ты — Алекс. Ты развенчиваешь мифы о курении. Используй базу знаний с идеями Карра, но пересказывай их своими словами, как будто объясняешь другу.

Твоя задача — мягко показать противоречия в убеждениях пользователя, используя факты и аналогии.`,

  support: `Ты — Алекс. Твоя задача — поддержка и мотивация. Будь позитивным, но реалистичным. Признавай трудности, но подчеркивай, что пользователь справится.

Дай практические советы, когда нужно. Будь рядом в сложные моменты.`
};

/**
 * Кеш загруженных skills для каждого агента
 */
const skillsCache = {};

/**
 * Получает полный промпт для агента с загруженными skills
 */
export async function getAgentPrompt(agentType) {
  const skillNames = AGENT_SKILLS[agentType];
  if (!skillNames) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Кешируем skills для производительности
  const cacheKey = skillNames.join(',');
  if (!skillsCache[cacheKey]) {
    const skills = await loadSkills(skillNames);
    skillsCache[cacheKey] = formatSkillsForPrompt(skills);
  }

  const basePrompt = BASE_AGENT_PROMPTS[agentType];
  const skillsText = skillsCache[cacheKey];

  return basePrompt + skillsText + '\n\nФОРМАТ ОТВЕТА (ВСЕГДА JSON):\n' + 
    (agentType === 'anamnesis' ? JSON.stringify({
      message: "твой текст",
      currentStep: 1,
      extractedProfile: { name: "...", location: "..." },
      extractedData: { 
        smokingStatus: "...", 
        cigarettesPerDay: 0, 
        smokingYears: null,
        likes: [], 
        dislikes: [], 
        fears: [], 
        triggers: [], 
        previousAttempts: "", 
        motivation: "" 
      }
    }, null, 2) : JSON.stringify({
      message: "твой текст"
    }, null, 2));
}
