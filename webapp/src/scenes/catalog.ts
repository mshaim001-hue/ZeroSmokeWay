import type { Phase } from './act1/sceneFlow';

export type { Phase };
export type SceneId = 'pitcher' | 'firstPuff' | 'labyrinth' | 'shoes' | 'stress' | 'boredom' | 'relax';

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
    film: '/game/act1-scene2/scene.mp4?v=10',
    poster: '/game/act1-scene2/shot-wide.webp?v=10',
    shots: [
      '/game/act1-scene2/shot-wide.webp?v=10',
      '/game/act1-scene2/shot-pressure.webp?v=10',
      '/game/act1-scene2/shot-burn.webp?v=10',
      '/game/act1-scene2/shot-spin.webp?v=10',
    ],
    next: 'labyrinth',
    kickoff: KICKOFF,
  },
  labyrinth: {
    id: 'labyrinth',
    act: 1,
    number: 3,
    title: 'The Brainwashing Labyrinth',
    film: '/game/act1-scene3/scene.mp4',
    poster: '/game/act1-scene3/shot-wide.webp',
    shots: [
      '/game/act1-scene3/shot-wide.webp',
      '/game/act1-scene3/shot-last.webp',
      '/game/act1-scene3/shot-myth.webp',
      '/game/act1-scene3/shot-peel.webp',
    ],
    next: 'shoes',
    kickoff: KICKOFF,
  },
  shoes: {
    id: 'shoes',
    act: 1,
    number: 4,
    title: 'The Tight Shoes Paradox',
    film: '/game/act1-scene4/scene.mp4?v=2',
    poster: '/game/act1-scene4/shot-wide.webp?v=2',
    shots: [
      '/game/act1-scene4/shot-wide.webp?v=2',
      '/game/act1-scene4/shot-pinch.webp?v=2',
      '/game/act1-scene4/shot-off.webp?v=2',
      '/game/act1-scene4/shot-back.webp?v=2',
    ],
    next: 'stress',
    kickoff: KICKOFF,
  },
  stress: {
    id: 'stress',
    act: 2,
    number: 5,
    title: 'Boss: Stress',
    film: '/game/act2-scene5/scene.mp4?v=6',
    poster: '/game/act2-scene5/shot-wide.webp?v=6',
    shots: [
      '/game/act2-scene5/shot-wide.webp?v=6',
      '/game/act2-scene5/shot-storm.webp?v=6',
      '/game/act2-scene5/shot-drag.webp?v=6',
      '/game/act2-scene5/shot-graph.webp?v=6',
    ],
    next: 'boredom',
    kickoff: KICKOFF,
  },
  boredom: {
    id: 'boredom',
    act: 2,
    number: 6,
    title: 'Bosses: Boredom and Concentration',
    film: '/game/act2-scene6/scene.mp4',
    poster: '/game/act2-scene6/shot-wide.webp',
    shots: [
      '/game/act2-scene6/shot-wide.webp',
      '/game/act2-scene6/shot-puff.webp',
      '/game/act2-scene6/shot-paradox.webp',
      '/game/act2-scene6/shot-starve.webp',
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
    next: null,
    kickoff: KICKOFF,
  },
};

export const FIRST_SCENE: SceneId = 'pitcher';
export const SCENE_ORDER: SceneId[] = ['pitcher', 'firstPuff', 'labyrinth', 'shoes', 'stress', 'boredom', 'relax'];

export function sceneOf(id: SceneId): SceneDef {
  return SCENES[id];
}

export function neighbor(id: SceneId, step: 1 | -1): SceneId | null {
  const index = SCENE_ORDER.indexOf(id) + step;
  return SCENE_ORDER[index] ?? null;
}
