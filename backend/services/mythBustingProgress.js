/**
 * Логика прогресса фазы myth_busting по Карру.
 * Отслеживаем, какие иллюзии уже разобраны, определяем следующую,
 * фиксируем момент "aha" — выход на финальное понимание.
 */

// Порядок проработки иллюзий: сначала самые распространённые
const ILLUSION_ORDER = ['stress', 'social', 'coffeeAlcohol', 'boredom', 'concentration', 'work', 'lastCigarettePanic'];

const ILLUSION_LABELS = {
  stress:             'сигарета снимает стресс',
  boredom:            'сигарета от скуки / когда нечего делать',
  concentration:      'сигарета помогает думать / сосредоточиться',
  social:             'сигарета — ритуал компании / общения',
  coffeeAlcohol:      'сигарета неотделима от кофе / алкоголя',
  work:               'сигарета помогает работать / паузы',
  lastCigarettePanic: 'страх: а вдруг последняя сигарета?',
};

// Сократические вопросы-подсказки для каждой иллюзии — отправная точка для агента
const ILLUSION_HINTS = {
  stress: 'Попроси вспомнить конкретный стрессовый момент: что было до сигареты — напряжение? И после? Потом снова напряжение через 30 минут? Откуда берётся "облегчение" — сигарета дала что-то или убрала то, что сама и создала?',
  boredom: 'Спроси: некурящие тоже скучают. Как они справляются? Была ли скука до того, как начал курить? Сигарета наполняет время или просто создаёт ритуал, который занимает время?',
  concentration: 'Спроси: первая сигарета утром — до неё голова соображала? Некурящие тоже думают. Откуда эта потребность "запустить голову" сигаретой — может, это просто снятие никотинового голода?',
  social: 'Спроси: что именно приятно — сама сигарета или пауза, выход, разговор? Некурящие тоже выходят на перекур, общаются. Ритуал можно оставить без яда?',
  coffeeAlcohol: 'Спроси: кофе существовал до первой сигареты? Когда появилась "неотделимость" — сразу или привычка сложилась со временем? Что именно в кофе требует сигарету?',
  work: 'Спроси: в самом начале карьеры — курил на работе? Что было с концентрацией тогда? Когда стали нужны "рабочие перекуры" — с первого дня или постепенно?',
  lastCigarettePanic: 'Спроси: что конкретно пугает в "последней"? Некурящие живут без сигарет и не страдают. Откуда уверенность, что тебе это нужно — ты родился с такой потребностью?',
};

// Unicode-границы слова: \b в JS опирается на ASCII-\w и НЕ работает с кириллицей
// (между пробелом и кириллической буквой границы нет), поэтому используем lookaround + флаг u.
const WS = '(?<![\\p{L}\\p{N}])'; // начало слова
const WE = '(?![\\p{L}\\p{N}])'; // конец слова
const aha = (src) => new RegExp(src, 'u');

// Сигналы "aha" — человек сам согласился / увидел иллюзию своими словами.
const AHA_PATTERNS = [
  `${WS}ну да${WE}`, `${WS}да уж${WE}`, `${WS}и правда${WE}`, `${WS}и вправду${WE}`,
  `${WS}точно${WE}`, `${WS}верно${WE}`, `${WS}логично${WE}`, `${WS}соглас`,
  `${WS}пожалуй${WE}`, `${WS}наверное${WE}`, `${WS}действительно${WE}`,
  `никогда так не `, `не думал`, `не задумыв`, `не смотрел на это`,
  `${WS}получается`, `${WS}выходит${WE}`, `${WS}странно${WE}`, `${WS}хм+${WE}`,
  `твоя правда`, `блин,? да`, `вот это да`, `${WS}доход`,
  `${WS}понял${WE}`, `${WS}поняла${WE}`, `${WS}осознал`,
  // добавлено по живому тестированию — частые формулировки инсайта
  `${WS}теперь понятно`, `${WS}понятно${WE}`, `${WS}ясно${WE}`, `глаза открыл`,
].map(aha);
// Явное несогласие — гасит ложный aha (проверяется первым).
const AHA_NEGATIONS = [
  `не соглас`, `не верю`, `не убеди`, `${WS}бред${WE}`, `${WS}чушь${WE}`,
  `не думаю,? что так`, `${WS}да нет${WE}`, `не получается`, `не логично`,
].map(aha);

/**
 * Похоже ли сообщение на "aha-момент" — человек сам согласился/увидел.
 * @param {string} text
 * @returns {boolean}
 */
export function hasAhaSignal(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  if (AHA_NEGATIONS.some((r) => r.test(t))) return false;
  return AHA_PATTERNS.some((r) => r.test(t));
}

/**
 * Определяет следующую иллюзию для проработки.
 * @param {object} carrCoverage — из anamnesisCoverage
 * @param {object} mythProgress — { [key]: true } уже разобранные
 * @returns {{ key, label, hint, evidence } | null}
 */
export function getNextIllusion(carrCoverage, mythProgress = {}) {
  const illusions = carrCoverage?.illusions || {};

  // 1. Иллюзии с явными доказательствами из анамнеза — первые кандидаты
  for (const key of ILLUSION_ORDER) {
    if (mythProgress[key] === true) continue;
    const row = illusions[key];
    if (!row) continue;
    if (
      row.suspected === true ||
      (typeof row.evidence === 'string' && row.evidence.trim().length > 8)
    ) {
      return {
        key,
        label: ILLUSION_LABELS[key],
        hint: ILLUSION_HINTS[key],
        evidence: row.evidence || '',
      };
    }
  }

  // 2. Любая неразобранная иллюзия с хоть каким-то следом
  for (const key of ILLUSION_ORDER) {
    if (mythProgress[key] === true) continue;
    const row = illusions[key];
    if (row && typeof row.evidence === 'string' && row.evidence.trim().length > 0) {
      return {
        key,
        label: ILLUSION_LABELS[key],
        hint: ILLUSION_HINTS[key],
        evidence: row.evidence || '',
      };
    }
  }

  return null;
}

/**
 * Проверяет, достаточно ли иллюзий разобрано для перехода к фазе свободы.
 * Порог: минимум 2 иллюзии ИЛИ все подтверждённые из анамнеза.
 */
export function isMythBustingComplete(carrCoverage, mythProgress = {}) {
  const illusions = carrCoverage?.illusions || {};
  const addressed = Object.keys(mythProgress).filter((k) => mythProgress[k] === true);

  // Если разобрали хотя бы 2 иллюзии и нет ни одной явно не разобранной с сильными уликами
  if (addressed.length < 2) return false;

  const unaddressedStrong = ILLUSION_ORDER.filter((k) => {
    if (mythProgress[k]) return false;
    const row = illusions[k];
    return row?.suspected === true || (typeof row?.evidence === 'string' && row.evidence.trim().length > 15);
  });

  return unaddressedStrong.length === 0;
}

/**
 * Строит краткий дайджест прогресса для оркестратора.
 */
export function mythProgressDigest(carrCoverage, mythProgress = {}) {
  const illusions = carrCoverage?.illusions || {};
  const lines = ILLUSION_ORDER.map((k) => {
    const row = illusions[k];
    const addressed = mythProgress[k] ? '✓' : '—';
    const sus = row?.suspected === true ? ' (упоминал)' : '';
    return `  ${addressed} ${ILLUSION_LABELS[k]}${sus}`;
  });
  return lines.join('\n');
}
