export type Phase = 'idle' | 'playing' | 'chat';

export const SHOTS = [
  '/game/act1-scene1/shot-wide.webp',
  '/game/act1-scene1/shot-nectar.webp',
  '/game/act1-scene1/shot-slip.webp',
  '/game/act1-scene1/shot-bottom.webp',
] as const;

export const FILM = '/game/act1-scene1/scene.mp4';
export const POSTER = SHOTS[0];
export const SHOT_MS = 2800;
export const OPENING_KICKOFF = 'The film ended. The player just watched it. Speak the first line.';

export function nextShotIndex(index: number): number {
  return Math.min(SHOTS.length - 1, index + 1);
}

export function filmFinished(shotIndex: number, usedVideo: boolean, videoEnded: boolean): boolean {
  return usedVideo ? videoEnded : shotIndex >= SHOTS.length - 1;
}
