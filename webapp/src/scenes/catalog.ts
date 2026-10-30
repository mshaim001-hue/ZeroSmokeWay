import type { Phase } from './act1/sceneFlow';

export type { Phase };
export type SceneId = 'pitcher' | 'firstPuff' | 'labyrinth' | 'shoes' | 'stress' | 'boredom' | 'relax' | 'combo' | 'willpower' | 'swamp' | 'substitutes' | 'monster' | 'ritual' | 'weeks' | 'truth';

export type SceneDef = {
  id: SceneId;
  act: number;
  number: number;
  title: string;
  film: string;
  poster: string;
  shots: readonly string[];
  next: SceneId | null;
  kickoff: string;
  afterLabel?: string;
};

const KICKOFF = 'The film ended. The player just watched it. Speak the first line.';

export const SCENES: Record<SceneId, SceneDef> = {
  pitcher: {
    id: 'pitcher',
    act: 1,
    number: 1,
    title: 'Garden of the Pitcher Plant',
    film: '/game/act1-scene1/scene.mp4?v=2',
    poster: '/game/act1-scene1/shot-wide.webp?v=2',
    shots: [
      '/game/act1-scene1/shot-wide.webp?v=2',
      '/game/act1-scene1/shot-nectar.webp?v=2',
      '/game/act1-scene1/shot-slip.webp?v=2',
      '/game/act1-scene1/shot-bottom.webp?v=2',
    ],
    next: 'firstPuff',
    kickoff: KICKOFF,
  },
  firstPuff: {
    id: 'firstPuff',
    act: 1,
    number: 2,
    title: 'The First Disgusting Cigarette',
    film: '/game/act1-scene2/scene.mp4?v=12',
    poster: '/game/act1-scene2/shot-wide.webp?v=12',
    shots: [
      '/game/act1-scene2/shot-wide.webp?v=12',
      '/game/act1-scene2/shot-pressure.webp?v=12',
      '/game/act1-scene2/shot-burn.webp?v=12',
      '/game/act1-scene2/shot-spin.webp?v=12',
    ],
    next: 'labyrinth',
    kickoff: KICKOFF,
  },
  labyrinth: {
    id: 'labyrinth',
    act: 1,
    number: 3,
    title: 'The Brainwashing Labyrinth',
    film: '/game/act1-scene3/scene.mp4?v=2',
    poster: '/game/act1-scene3/shot-wide.webp?v=2',
    shots: [
      '/game/act1-scene3/shot-wide.webp?v=2',
      '/game/act1-scene3/shot-last.webp?v=2',
      '/game/act1-scene3/shot-myth.webp?v=2',
      '/game/act1-scene3/shot-peel.webp?v=2',
    ],
    next: 'shoes',
    kickoff: KICKOFF,
  },
  shoes: {
    id: 'shoes',
    act: 1,
    number: 4,
    title: 'The Tight Shoes Paradox',
    film: '/game/act1-scene4/scene.mp4?v=3',
    poster: '/game/act1-scene4/shot-wide.webp?v=3',
    shots: [
      '/game/act1-scene4/shot-wide.webp?v=3',
      '/game/act1-scene4/shot-pinch.webp?v=3',
      '/game/act1-scene4/shot-off.webp?v=3',
      '/game/act1-scene4/shot-back.webp?v=3',
    ],
    next: 'stress',
    kickoff: KICKOFF,
  },
  stress: {
    id: 'stress',
    act: 2,
    number: 5,
    title: 'Boss: Stress',
    film: '/game/act2-scene5/scene.mp4?v=7',
    poster: '/game/act2-scene5/shot-wide.webp?v=7',
    shots: [
      '/game/act2-scene5/shot-wide.webp?v=7',
      '/game/act2-scene5/shot-storm.webp?v=7',
      '/game/act2-scene5/shot-drag.webp?v=7',
      '/game/act2-scene5/shot-graph.webp?v=7',
    ],
    next: 'boredom',
    kickoff: KICKOFF,
  },
  boredom: {
    id: 'boredom',
    act: 2,
    number: 6,
    title: 'Bosses: Boredom and Concentration',
    film: '/game/act2-scene6/scene.mp4?v=2',
    poster: '/game/act2-scene6/shot-wide.webp?v=2',
    shots: [
      '/game/act2-scene6/shot-wide.webp?v=2',
      '/game/act2-scene6/shot-puff.webp?v=2',
      '/game/act2-scene6/shot-paradox.webp?v=2',
      '/game/act2-scene6/shot-starve.webp?v=2',
    ],
    next: 'relax',
    kickoff: KICKOFF,
  },
  relax: {
    id: 'relax',
    act: 2,
    number: 7,
    title: 'Boss: Relaxation',
    film: '/game/act2-scene7/scene.mp4?v=4',
    poster: '/game/act2-scene7/shot-wide.webp?v=4',
    shots: [
      '/game/act2-scene7/shot-wide.webp?v=4',
      '/game/act2-scene7/shot-wait.webp?v=4',
      '/game/act2-scene7/shot-frost.webp?v=4',
      '/game/act2-scene7/shot-vice.webp?v=4',
    ],
    next: 'combo',
    kickoff: KICKOFF,
  },
  combo: {
    id: 'combo',
    act: 2,
    number: 8,
    title: 'Boss: Combined Cigarette',
    film: '/game/act2-scene8/scene.mp4?v=2',
    poster: '/game/act2-scene8/shot-wide.webp?v=2',
    shots: [
      '/game/act2-scene8/shot-wide.webp?v=2',
      '/game/act2-scene8/shot-wait.webp?v=2',
      '/game/act2-scene8/shot-pack.webp?v=2',
      '/game/act2-scene8/shot-drag.webp?v=2',
    ],
    next: 'willpower',
    kickoff: KICKOFF,
  },
  willpower: {
    id: 'willpower',
    act: 3,
    number: 9,
    title: 'The Rocky Mountain of Willpower',
    film: '/game/act3-scene9/scene.mp4',
    poster: '/game/act3-scene9/shot-wide.webp',
    shots: [
      '/game/act3-scene9/shot-wide.webp',
      '/game/act3-scene9/shot-climb.webp',
      '/game/act3-scene9/shot-rage.webp',
      '/game/act3-scene9/shot-fall.webp',
    ],
    next: 'swamp',
    kickoff: KICKOFF,
  },
  swamp: {
    id: 'swamp',
    act: 3,
    number: 10,
    title: 'The Swamp of Cutting Down',
    film: '/game/act3-scene10/scene.mp4',
    poster: '/game/act3-scene10/shot-wide.webp',
    shots: [
      '/game/act3-scene10/shot-wide.webp',
      '/game/act3-scene10/shot-wait.webp',
      '/game/act3-scene10/shot-drag.webp',
      '/game/act3-scene10/shot-sink.webp',
    ],
    next: 'substitutes',
    kickoff: KICKOFF,
  },
  substitutes: {
    id: 'substitutes',
    act: 3,
    number: 11,
    title: 'The Shop of Substitutes',
    film: '/game/act3-scene11/scene.mp4',
    poster: '/game/act3-scene11/shot-wide.webp',
    shots: [
      '/game/act3-scene11/shot-wide.webp',
      '/game/act3-scene11/shot-counter.webp',
      '/game/act3-scene11/shot-gum.webp',
      '/game/act3-scene11/shot-itch.webp',
    ],
    next: 'monster',
    kickoff: KICKOFF,
  },
  monster: {
    id: 'monster',
    act: 4,
    number: 12,
    title: 'The Lair of the Little Nicotine Monster',
    film: '/game/act4-scene12/scene.mp4?v=2',
    poster: '/game/act4-scene12/shot-wide.webp?v=2',
    shots: [
      '/game/act4-scene12/shot-wide.webp?v=2',
      '/game/act4-scene12/shot-lair.webp?v=2',
      '/game/act4-scene12/shot-itch.webp?v=2',
      '/game/act4-scene12/shot-starve.webp?v=2',
    ],
    next: 'ritual',
    kickoff: KICKOFF,
  },
  ritual: {
    id: 'ritual',
    act: 4,
    number: 13,
    title: 'The Ritual of the Last Cigarette',
    film: '/game/act4-scene13/scene.mp4?v=2',
    poster: '/game/act4-scene13/shot-wide.webp?v=2',
    shots: [
      '/game/act4-scene13/shot-wide.webp?v=2',
      '/game/act4-scene13/shot-drag.webp?v=2',
      '/game/act4-scene13/shot-stub.webp?v=2',
      '/game/act4-scene13/shot-door.webp?v=2',
    ],
    next: 'weeks',
    kickoff: KICKOFF,
    afterLabel: 'I am free',
  },
  weeks: {
    id: 'weeks',
    act: 4,
    number: 14,
    title: 'Trial: The First Three Weeks',
    film: '/game/act4-scene14/scene.mp4',
    poster: '/game/act4-scene14/shot-wide.webp',
    shots: [
      '/game/act4-scene14/shot-wide.webp',
      '/game/act4-scene14/shot-coffee.webp',
      '/game/act4-scene14/shot-scream.webp',
      '/game/act4-scene14/shot-hold.webp',
    ],
    next: 'truth',
    kickoff: KICKOFF,
  },
  truth: {
    id: 'truth',
    act: 4,
    number: 15,
    title: 'The Moment of Truth',
    film: '/game/act4-scene15/scene.mp4?v=1',
    poster: '/game/act4-scene15/shot-wide.webp?v=1',
    shots: [
      '/game/act4-scene15/shot-wide.webp?v=1',
      '/game/act4-scene15/shot-sky.webp?v=1',
      '/game/act4-scene15/shot-pity.webp?v=1',
      '/game/act4-scene15/shot-free.webp?v=1',
    ],
    next: null,
    kickoff: KICKOFF,
    afterLabel: 'You are free forever',
  },
};

export const FIRST_SCENE: SceneId = 'pitcher';
export const SCENE_ORDER: SceneId[] = ['pitcher', 'firstPuff', 'labyrinth', 'shoes', 'stress', 'boredom', 'relax', 'combo', 'willpower', 'swamp', 'substitutes', 'monster', 'ritual', 'weeks', 'truth'];

export function isSceneId(value: string): value is SceneId {
  return (SCENE_ORDER as readonly string[]).includes(value);
}

export function sceneOf(id: SceneId): SceneDef {
  return SCENES[id];
}

export function neighbor(id: SceneId, step: 1 | -1): SceneId | null {
  const index = SCENE_ORDER.indexOf(id) + step;
  return SCENE_ORDER[index] ?? null;
}
