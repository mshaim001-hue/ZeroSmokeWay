export type BodyCard = {
  id: string;
  afterHours: number;
  title: string;
  body: string;
  nrtNote?: string;
  source: { name: string; url: string };
};

const NHS = {
  name: 'NHS Better Health — Quit smoking',
  url: 'https://www.nhs.uk/better-health/quit-smoking/',
};

const CDC = {
  name: 'CDC — Benefits of quitting',
  url: 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html',
};

export const BODY_CARDS: BodyCard[] = [
  {
    id: '20min',
    afterHours: 20 / 60,
    title: 'Around 20 minutes',
    body: 'NHS describes pulse rate starting to return toward usual around this time. This is a general pattern, not a reading of your body.',
    nrtNote: 'Nicotine gum or patches still deliver nicotine, so heart-rate change from stopping smoke may not match a nicotine-free timeline.',
    source: NHS,
  },
  {
    id: '8h',
    afterHours: 8,
    title: 'Around 8 hours',
    body: 'NHS describes oxygen in the blood returning toward usual around this time. This is a general pattern, not a reading of your body.',
    nrtNote: 'This is about stopping smoke. Nicotine replacement does not put carbon monoxide in the blood the way smoking does.',
    source: NHS,
  },
  {
    id: '48h',
    afterHours: 48,
    title: 'Around 48 hours',
    body: 'NHS describes carbon monoxide falling to the level of someone who does not smoke by about this time. This is about smoke in the blood, not a personal lab result.',
    nrtNote: 'Nicotine replacement does not put smoke in the lungs, so this carbon monoxide note still applies if you have stopped smoking.',
    source: NHS,
  },
  {
    id: '2-12w',
    afterHours: 24 * 14,
    title: 'After 2 to 12 weeks',
    body: 'NHS describes circulation to the heart and muscles often improving over this stretch. Timing varies widely. This is not a schedule of symptoms you must feel.',
    nrtNote: 'This is about stopping smoke. Nicotine help, if you use it, is a separate medical matter.',
    source: NHS,
  },
  {
    id: '1y',
    afterHours: 24 * 365,
    title: 'Around a year',
    body: 'NHS describes risk of heart attack as about half that of a person who still smokes, as a population estimate — not a prediction for you.',
    nrtNote: 'This comparison is with continued smoking. Using prescribed nicotine help is not the same as smoking.',
    source: NHS,
  },
  {
    id: '3-6y',
    afterHours: 24 * 365 * 3,
    title: 'After 3 to 6 years',
    body: 'CDC describes added risk of coronary heart disease dropping by about half over this span, compared with continued smoking. This is not a personal measurement.',
    source: CDC,
  },
];

export function visibleBodyCards(startedAt: string, usesNrt: boolean, nowMs = Date.now()): BodyCard[] {
  return annotateNrt(reachedMilestones(startedAt, nowMs), usesNrt);
}

export function reachedMilestones(startedAt: string, nowMs = Date.now()): BodyCard[] {
  const hours = liveHours(startedAt, nowMs);
  return BODY_CARDS.filter(card => hours >= card.afterHours);
}

export function upcomingMilestone(startedAt: string | null, nowMs = Date.now()): BodyCard | null {
  if (!startedAt) return BODY_CARDS[0] ?? null;
  const hours = liveHours(startedAt, nowMs);
  return BODY_CARDS.find(card => hours < card.afterHours) ?? null;
}

export function milestoneProgress(startedAt: string | null, nowMs = Date.now()) {
  const next = upcomingMilestone(startedAt, nowMs);
  const reached = startedAt ? reachedMilestones(startedAt, nowMs) : [];
  const previous = reached[reached.length - 1] ?? null;
  if (!next) return { next: null, previous, ratio: 1, reached };
  const startHours = previous ? previous.afterHours : 0;
  const hours = startedAt ? liveHours(startedAt, nowMs) : 0;
  const span = next.afterHours - startHours;
  const ratio = span <= 0 ? 1 : Math.min(1, Math.max(0, (hours - startHours) / span));
  return { next, previous, ratio, reached };
}

export function annotateNrt(cards: BodyCard[], usesNrt: boolean): BodyCard[] {
  return cards.map(card => (usesNrt && card.nrtNote ? { ...card, body: `${card.body} ${card.nrtNote}` } : card));
}

function liveHours(startedAt: string, nowMs: number) {
  return Math.max(0, (nowMs - new Date(startedAt).getTime()) / 3600000);
}

export function usesNrtFromMemory(memory: { quote?: string; summary?: string; status?: string }[]) {
  return memory.some(entry => {
    if (entry.status === 'revised' || entry.status === 'disagreed') return false;
    const text = `${entry.quote ?? ''} ${entry.summary ?? ''}`.toLowerCase();
    return /\b(patch|nrt|nicotine gum|nicorette|lozenge|inhaler)\b/.test(text);
  });
}
