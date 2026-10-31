const DEPTHS = new Set(['mentioned', 'partial', 'thorough']);
const SOURCES = new Set(['player', 'muse_hypothesis']);
const STATUSES = new Set(['current', 'revised', 'disagreed']);
const SCENE_IDS = new Set([
  'pitcher', 'firstPuff', 'labyrinth', 'shoes', 'stress', 'boredom', 'relax',
  'combo', 'willpower', 'swamp', 'substitutes', 'monster', 'ritual', 'weeks', 'truth',
]);

const MAX_ENTRIES = 40;
const MAX_TEXT = 500;

function clip(value, limit = MAX_TEXT) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

function asId(value) {
  const id = clip(value, 80);
  return id.length > 0 ? id : '';
}

export function parseMemoryEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = asId(raw.id);
  const summary = clip(raw.summary || raw.quote, 300);
  if (!id && !summary) return null;
  const sceneId = typeof raw.sceneId === 'string' && SCENE_IDS.has(raw.sceneId) ? raw.sceneId : '';
  return {
    id: id || `m-${Math.abs(hashText(summary)).toString(36)}`,
    theme: clip(raw.theme, 80),
    sceneId,
    quote: clip(raw.quote, 400),
    turnRef: clip(raw.turnRef, 80),
    context: clip(raw.context, 120),
    source: SOURCES.has(raw.source) ? raw.source : 'player',
    status: STATUSES.has(raw.status) ? raw.status : 'current',
    revises: asId(raw.revises),
    depth: DEPTHS.has(raw.depth) ? raw.depth : 'mentioned',
    summary,
    openQuestion: clip(raw.openQuestion || raw.open_question, 300),
  };
}

export function parseMemory(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const entries = [];
  for (const row of value) {
    const entry = parseMemoryEntry(row);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}

function overlay(previous, next) {
  const merged = { ...previous };
  for (const [key, value] of Object.entries(next)) {
    if (key === 'id') continue;
    if (value === '' || value == null) continue;
    merged[key] = value;
  }
  return merged;
}

export function mergeMemory(current, updates) {
  const merged = new Map(parseMemory(current).map(entry => [entry.id, entry]));
  for (const entry of parseMemory(updates)) {
    const previous = merged.get(entry.id);
    merged.set(entry.id, previous ? overlay(previous, entry) : entry);
  }
  return [...merged.values()].slice(-MAX_ENTRIES);
}

export function compactMemory(entries) {
  return parseMemory(entries).map(entry => ({
    id: entry.id,
    theme: entry.theme,
    sceneId: entry.sceneId || undefined,
    source: entry.source,
    status: entry.status,
    depth: entry.depth,
    summary: entry.summary,
    quote: entry.quote || undefined,
    context: entry.context || undefined,
    openQuestion: entry.openQuestion || undefined,
    turnRef: entry.turnRef || undefined,
    revises: entry.revises || undefined,
  }));
}

function hashText(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = ((value << 5) - value + text.charCodeAt(i)) | 0;
  return value;
}
