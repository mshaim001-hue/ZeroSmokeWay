const STOP = new Set(['после', 'перед', 'когда', 'просто', 'сигарет', 'сигарета', 'кури', 'это', 'меня']);

export function resolvePersonalizedTitle({
  cell,
  proposed,
  recentAnswers = [],
  lastPersonalizedTurn = -10,
  turnNumber = 0,
} = {}) {
  if (!cell || !proposed) return null;
  const title = String(proposed).trim().slice(0, 80);
  if (!title || title === cell.title) return null;
  if (turnNumber - lastPersonalizedTurn < 3) return null;
  if (!followsFromAnswers(title, recentAnswers)) return null;
  return title;
}

export function lastPersonalizedTurnNumber(session) {
  let last = -10;
  const defaults = new Set();
  for (const turn of session.turns || []) {
    if (!turn.cellId || !turn.cellTitleShownToUser) continue;
    if (session.displayTitles?.[turn.cellId] && turn.cellTitleShownToUser === session.displayTitles[turn.cellId]) {
      last = turn.turnNumber;
    }
    if (defaults.has(turn.cellTitleShownToUser)) continue;
    defaults.add(turn.cellTitleShownToUser);
  }
  const titles = Object.values(session.displayTitles || {});
  if (titles.length && last < 0) {
    const match = [...session.turns].reverse().find((turn) => titles.includes(turn.cellTitleShownToUser));
    if (match) last = match.turnNumber;
  }
  return last;
}

function followsFromAnswers(title, answers) {
  const tokens = title
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((token) => token.length > 3 && !STOP.has(token));
  if (tokens.length === 0) return false;
  const haystack = answers.map((item) => String(item.text || item).toLowerCase()).join(' ');
  return tokens.some((token) => haystack.includes(token));
}
