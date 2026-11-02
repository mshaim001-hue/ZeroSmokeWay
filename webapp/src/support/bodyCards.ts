export type BodyCard = {
  id: string;
  afterHours: number;
  title: string;
  body: string;
  nrtNote?: string;
  source: { name: string; url: string };
};

export const BODY_CARDS: BodyCard[] = [
  {
    id: '20min',
    afterHours: 0,
    title: 'Around 20 minutes',
    body: 'Heart rate and blood pressure often start to fall toward the person’s usual range. This is a general pattern in populations, not a reading of your body.',
    source: {
      name: 'NHS — What happens when you quit',
      url: 'https://www.nhs.uk/better-health/quit-smoking/what-happens-when-you-quit-smoking/',
    },
  },
  {
    id: '12h',
    afterHours: 12,
    title: 'Around 12 hours',
    body: 'Carbon monoxide from smoke typically falls in the blood, and oxygen can be carried more normally. This is about smoke, not a personal lab result.',
    nrtNote: 'Nicotine gum, patches, or similar help do not put smoke in the lungs. This carbon monoxide note still applies if you have stopped smoking.',
    source: {
      name: 'CDC — Benefits of quitting',
      url: 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html',
    },
  },
  {
    id: '2-12w',
    afterHours: 24 * 14,
    title: 'Over the following weeks',
    body: 'Circulation and lung function often improve over weeks to months after stopping smoking. Timing varies widely. This is not a schedule of symptoms you must feel.',
    source: {
      name: 'NHS — What happens when you quit',
      url: 'https://www.nhs.uk/better-health/quit-smoking/what-happens-when-you-quit-smoking/',
    },
  },
  {
    id: '1y',
    afterHours: 24 * 365,
    title: 'Around a year',
    body: 'Risk of coronary heart disease is often described as about half that of a person who still smokes, as a population estimate — not a prediction for you.',
    source: {
      name: 'CDC — Benefits of quitting',
      url: 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html',
    },
  },
];

export function visibleBodyCards(startedAt: string, usesNrt: boolean, nowMs = Date.now()): BodyCard[] {
  const hours = Math.max(0, (nowMs - new Date(startedAt).getTime()) / 3600000);
  return BODY_CARDS.filter(card => hours >= card.afterHours).map(card => (
    usesNrt && card.nrtNote ? { ...card, body: `${card.body} ${card.nrtNote}` } : card
  ));
}

export function usesNrtFromMemory(memory: { quote?: string; summary?: string; status?: string }[]) {
  return memory.some(entry => {
    if (entry.status === 'revised' || entry.status === 'disagreed') return false;
    const text = `${entry.quote ?? ''} ${entry.summary ?? ''}`.toLowerCase();
    return /\b(patch|nrt|nicotine gum|nicorette|lozenge|inhaler)\b/.test(text);
  });
}
