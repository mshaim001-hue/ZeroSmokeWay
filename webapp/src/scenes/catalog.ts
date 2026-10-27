import type { Phase } from './act1/sceneFlow';

export type { Phase };
export type SceneId = 'pitcher' | 'well';

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

const KICKOFF = 'Фильм закончился. Игрок это только что увидел. Скажи первую реплику.';

export const SCENES: Record<SceneId, SceneDef> = {
  pitcher: {
    id: 'pitcher',
    act: 1,
    number: 1,
    title: 'Сад Хищного Растения',
    film: '/game/act1-scene1/scene.mp4',
    poster: '/game/act1-scene1/shot-wide.webp',
    shots: [
      '/game/act1-scene1/shot-wide.webp',
      '/game/act1-scene1/shot-nectar.webp',
      '/game/act1-scene1/shot-slip.webp',
      '/game/act1-scene1/shot-bottom.webp',
    ],
    next: 'well',
    kickoff: KICKOFF,
  },
  well: {
    id: 'well',
    act: 1,
    number: 2,
    title: 'Соляной колодец',
    film: '/game/act1-scene2/scene.mp4',
    poster: '/game/act1-scene2/shot-wide.webp',
    shots: [
      '/game/act1-scene2/shot-wide.webp',
      '/game/act1-scene2/shot-drink.webp',
      '/game/act1-scene2/shot-sting.webp',
      '/game/act1-scene2/shot-loop.webp',
    ],
    next: null,
    kickoff: KICKOFF,
  },
};

export const FIRST_SCENE: SceneId = 'pitcher';

export function sceneOf(id: SceneId): SceneDef {
  return SCENES[id];
}
