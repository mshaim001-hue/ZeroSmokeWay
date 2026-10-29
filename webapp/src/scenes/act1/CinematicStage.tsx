import { useEffect, useRef, useState } from 'react';
import { SHOT_MS, type Phase } from './sceneFlow';

type Props = {
  phase: Phase;
  reducedMotion: boolean;
  film: string;
  poster: string;
  shots: readonly string[];
  onEnded: () => void;
};

export function CinematicStage({ phase, reducedMotion, film, poster, shots, onEnded }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [shot, setShot] = useState(0);
  const [useStills, setUseStills] = useState(false);
  const ended = useRef(false);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  function finish() {
    if (ended.current || phase !== 'playing') return;
    ended.current = true;
    onEndedRef.current();
  }

  useEffect(() => {
    ended.current = false;
    setShot(0);
    setUseStills(false);
    const node = video.current;
    if (!node) return;
    node.pause();
    try { node.currentTime = 0; } catch { /* not ready */ }
    if (phase !== 'playing') return;
    node.muted = false;
    const play = node.play();
    if (play) play.catch(() => setUseStills(true));
    const seconds = Number.isFinite(node.duration) && node.duration > 0 ? node.duration : 12;
    const fallback = window.setTimeout(finish, seconds * 1000 + 400);
    return () => window.clearTimeout(fallback);
  }, [phase, film]);

  useEffect(() => {
    if (phase !== 'playing' || !useStills) return;
    const wait = reducedMotion ? 400 : SHOT_MS;
    if (shot >= shots.length - 1) {
      const id = window.setTimeout(finish, wait);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShot(index => Math.min(shots.length - 1, index + 1)), wait);
    return () => window.clearTimeout(id);
  }, [phase, useStills, shot, reducedMotion, shots.length]);

  const still = useStills || phase !== 'playing';
  const frame = still ? shots[phase === 'playing' ? shot : 0] : poster;

  return (
    <div className="scene1-cinema">
      <img className={`scene1-frame ${phase === 'playing' && useStills ? 'is-live' : ''}`} src={frame} alt="" />
      <video
        ref={video}
        className={`scene1-film ${phase === 'playing' && !useStills ? 'is-live' : ''}`}
        src={film}
        poster={poster}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={() => setUseStills(true)}
      />
    </div>
  );
}
