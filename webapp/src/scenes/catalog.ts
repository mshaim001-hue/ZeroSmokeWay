import type { Phase } from './act1/sceneFlow';

export type { Phase };
export type SceneId = 'pitcher' | 'firstPuff';

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
    next: null,
    kickoff: KICKOFF,
  },
};

export const FIRST_SCENE: SceneId = 'pitcher';
export const SCENE_ORDER: SceneId[] = ['pitcher', 'firstPuff'];

export function sceneOf(id: SceneId): SceneDef {
  return SCENES[id];
}

export function neighbor(id: SceneId, step: 1 | -1): SceneId | null {
  const index = SCENE_ORDER.indexOf(id) + step;
  return SCENE_ORDER[index] ?? null;
}
