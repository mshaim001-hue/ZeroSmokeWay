import { EMPTY_CARR_COVERAGE } from './anamnesisCoverage.js';

/** Silent bookkeeping: it never sets the pace or supplies the narrator's reply. */
export async function extractLilaCoverage({ openai, model, message, history, priorCoverage }) {
  if (/^🎲\s*[1-6]$/.test(message.trim())) return null;
  try {
    const result = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content:
          'Извлеки сведения о курении из слов человека. Не веди беседу и не задавай вопросов. ' +
          'Трактовки ведущего не являются фактами. Поправка человека отменяет прежнее предположение. ' +
          'Верни JSON {"carrCoverage": ...} по схеме ниже. Только новые явно названные сведения; ' +
          'неизвестные поля можно опустить. Для отвергнутого убеждения suspected: false и evidence с поправкой. ' +
          'Не придумывай цифры, причины или цитаты.\n' + JSON.stringify(EMPTY_CARR_COVERAGE) },
        { role: 'user', content: JSON.stringify({ priorCoverage, history, latestMessage: message }) },
      ],
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(result.choices[0].message.content);
    return parsed.carrCoverage && typeof parsed.carrCoverage === 'object'
      ? { carrCoverage: parsed.carrCoverage } : null;
  } catch {
    // A bookkeeping failure must not swallow a successful conversation response.
    console.warn('Lila coverage extraction unavailable; preserving previous coverage');
    return null;
  }
}
