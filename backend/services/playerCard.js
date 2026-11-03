import { parseMemory } from './sceneMemory.js';

const SLOTS = Object.freeze([
  'smoking_history',
  'situations_and_triggers',
  'what_they_value_in_smoking',
  'reasons_to_stop',
  'fears',
  'previous_attempts',
  'available_support',
  'planned_actions',
  'open_questions',
]);

const SLOT_MATCHERS = {
  smoking_history: /\b(began|started|years?|pack|first (puff|cigarette)|how long|since|age|daily|every day)\b/i,
  situations_and_triggers: /\b(stress|work|traffic|party|coffee|morning|cue|trigger|boss|break|boredom|focus|cars?|kids?|children|evening|after)\b/i,
  what_they_value_in_smoking: /\b(calm|pause|break|enjoy|miss|ritual|minute|mine|permission|taste|unwind|relax)\b/i,
  reasons_to_stop: /\b(stop|quit|health|money|opened|want(ed)? to (stop|quit)|reason|why I)\b/i,
  fears: /\b(fear|afraid|worry|worried|weight|irritab|anger|fail|failing|bad parent|children|kids)\b/i,
  previous_attempts: /\b(tried|attempt|quit date|stretch|willpower|forced|grit|days without|smoked again)\b/i,
  available_support: /\b(partner|spouse|wife|husband|friend|doctor|nrt|patch|gum|family|support)\b/i,
  planned_actions: /\b(plan|will |going to|next time|intend|tomorrow|when I|if I feel)\b/i,
};

function noteText(entry) {
  return [entry.theme, entry.summary, entry.quote, entry.context, entry.openQuestion].filter(Boolean).join(' ');
}

function classifySlot(entry) {
  if (entry.openQuestion && !entry.summary && !entry.quote) return 'open_questions';
  const text = noteText(entry);
  // Prefer fears over situation/trigger keywords when fear language is present.
  if (SLOT_MATCHERS.fears.test(text)) return 'fears';
  for (const slot of SLOTS) {
    if (slot === 'open_questions' || slot === 'fears') continue;
    const matcher = SLOT_MATCHERS[slot];
    if (matcher && matcher.test(text)) return slot;
  }
  if (entry.openQuestion) return 'open_questions';
  return 'other_notes';
}

function asNote(entry) {
  const kind = entry.source === 'muse_hypothesis'
    ? 'hypothesis'
    : /\b(plan|will |going to|intend|next time)\b/i.test(noteText(entry))
      ? 'plan'
      : /\b(did|done|already|I smoked|I stopped|I tried)\b/i.test(noteText(entry))
        ? 'done_or_past'
        : 'fact';
  return {
    id: entry.id,
    kind,
    source: entry.source,
    sceneId: entry.sceneId || undefined,
    summary: entry.summary || undefined,
    quote: entry.quote || undefined,
    openQuestion: entry.openQuestion || undefined,
  };
}

/**
 * Internal card for the support model. Built only from living memory.
 * Unknown slots stay "unknown" — never invent biography.
 */
export function buildPlayerCard(entries) {
  const parsed = parseMemory(entries);
  const current = parsed.filter(entry => entry.status === 'current');
  const notCurrent = parsed.filter(entry => entry.status === 'revised' || entry.status === 'disagreed');
  const buckets = Object.fromEntries(SLOTS.map(slot => [slot, []]));
  buckets.other_notes = [];
  for (const entry of current) {
    buckets[classifySlot(entry)].push(asNote(entry));
  }
  const card = {
    purpose: 'Internal player card for support. Not shown in the product UI.',
    slots: {},
  };
  for (const slot of SLOTS) {
    card.slots[slot] = buckets[slot].length ? buckets[slot] : 'unknown';
  }
  if (buckets.other_notes.length) card.slots.other_notes = buckets.other_notes;
  card.not_current = notCurrent.map(entry => ({
    id: entry.id,
    status: entry.status,
    summary: entry.summary || undefined,
  }));
  return card;
}

export function playerCardPrompt(card) {
  return [
    'Internal player card (never show this card in the reply; do not dump it raw):',
    JSON.stringify(card),
    'Slots marked "unknown" are unknown — leave them unknown; do not fill with guesses.',
    'kind=fact is confirmed player material. kind=hypothesis is unconfirmed. kind=plan is intended, not done. kind=done_or_past is already lived.',
    'Entries in not_current are revised or disagreed — never treat them as the current picture.',
  ].join('\n');
}
