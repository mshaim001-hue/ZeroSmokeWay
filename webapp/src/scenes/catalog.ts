import type { Phase } from './act1/sceneFlow';

export type { Phase };
export type SceneId = 'pitcher' | 'firstPuff' | 'labyrinth' | 'shoes';

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
    film: '/game/act1-scene1/scene.mp4',
    poster: '/game/act1-scene1/shot-wide.webp',
    shots: [
      '/game/act1-scene1/shot-wide.webp',
      '/game/act1-scene1/shot-nectar.webp',
      '/game/act1-scene1/shot-slip.webp',
      '/game/act1-scene1/shot-bottom.webp',
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
    film: '/game/act1-scene4/scene.mp4',
    poster: '/game/act1-scene4/shot-wide.webp',
    shots: [
      '/game/act1-scene4/shot-wide.webp',
      '/game/act1-scene4/shot-pinch.webp',
      '/game/act1-scene4/shot-off.webp',
      '/game/act1-scene4/shot-back.webp',
    ],
    next: null,
    kickoff: KICKOFF,
  },
};

export const FIRST_SCENE: SceneId = 'pitcher';
export const SCENE_ORDER: SceneId[] = ['pitcher', 'firstPuff', 'labyrinth', 'shoes'];

export function sceneOf(id: SceneId): SceneDef {
  return SCENES[id];
}

export function neighbor(id: SceneId, step: 1 | -1): SceneId | null {
  const index = SCENE_ORDER.indexOf(id) + step;
  return SCENE_ORDER[index] ?? null;
}
