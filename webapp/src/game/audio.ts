type Profile = { root: number; cutoff: number; pace: number; level: number; noise: number };
const PROFILES: Record<string, Profile> = {
  corridor: { root: 146.83, cutoff: 520, pace: 6, level: .12, noise: .012 },
  pleasure: { root: 293.66, cutoff: 1250, pace: 5, level: .12, noise: .006 },
  stress: { root: 146.83, cutoff: 420, pace: 3.8, level: .11, noise: .01 },
  origin: { root: 293.66, cutoff: 900, pace: 7, level: .09, noise: .008 },
  company: { root: 220, cutoff: 1050, pace: 5, level: .11, noise: .006 },
  tomorrow: { root: 146.83, cutoff: 650, pace: 4.5, level: .10, noise: .008 },
  mirror: { root: 293.66, cutoff: 750, pace: 8, level: .08, noise: .003 },
  freedom: { root: 293.66, cutoff: 1600, pace: 7, level: .10, noise: .002 },
};
type Layer = { gain: GainNode; filter: BiquadFilterNode; sources: (OscillatorNode | AudioBufferSourceNode)[] };

/** Original, low-intensity soundtrack. unlock must be called from a user gesture. */
export class LabyrinthAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private layer?: Layer;
  private layers = new Set<Layer>();
  private effects = new Set<OscillatorNode | AudioBufferSourceNode>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private beat?: ReturnType<typeof setTimeout>;
  private profile = 'corridor';
  private appliedProfile?: string;
  private volume = .35;
  private muted = false;
  private destroyed = false;
  private note = 0;
  private reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private visibility = () => {
    if (!this.context || this.destroyed) return;
    if (document.hidden) {
      this.stopBeat();
      void this.context.suspend().catch(() => {});
    } else {
      void this.context.resume().then(() => {
        if (this.destroyed || document.hidden) return;
        if (this.appliedProfile !== this.profile) this.makeLayer();
        this.schedule();
      }).catch(() => {});
    }
  };

  async unlock(): Promise<void> {
    if (this.destroyed || typeof window === 'undefined') return;
    try {
      if (!this.context) {
        const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) return;
        const ctx = new Constructor();
        this.context = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        limiter.attack.value = .01;
        limiter.release.value = .3;
        this.master.connect(limiter).connect(ctx.destination);
        document.addEventListener('visibilitychange', this.visibility);
        this.makeLayer();
      }
      if (!document.hidden) {
        await this.context.resume();
        if (this.destroyed || document.hidden) return;
        if (this.appliedProfile !== this.profile) this.makeLayer();
        this.schedule();
      }
    } catch { /* Unsupported or gesture-restricted browser: game remains playable. */ }
  }

  setRoom(profile: string): void {
    const next = Object.hasOwn(PROFILES, profile) ? profile : 'corridor';
    if (next === this.profile) return;
    this.profile = next;
    this.note = 0;
    if (this.context && !this.destroyed && !document.hidden) {
      this.makeLayer();
      this.schedule();
    }
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    this.updateMaster();
    this.schedule();
  }
  setMuted(value: boolean): void {
    this.muted = value;
    this.updateMaster();
    this.schedule();
  }
  private updateMaster(): void {
    if (!this.context || !this.master) return;
    const param = this.master.gain;
    param.cancelScheduledValues(this.context.currentTime);
    param.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .08);
  }

  private makeLayer(): void {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const p = PROFILES[this.profile];
    const old = this.layer;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    gain.gain.linearRampToValueAtTime(this.reduced ? p.level * .7 : p.level, ctx.currentTime + 2.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.cutoff;
    filter.Q.value = .4;
    filter.connect(gain);
    const sources: Layer['sources'] = [];
    for (const [index, ratio] of [1, 1.5].entries()) {
      const osc = ctx.createOscillator();
      osc.type = index ? 'sine' : 'triangle';
      osc.frequency.value = p.root * ratio / 2;
      const quiet = ctx.createGain();
      quiet.gain.value = index ? .18 : .24;
      osc.connect(quiet).connect(filter);
      osc.start();
      sources.push(osc);
    }
    if (!this.reduced) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const quiet = ctx.createGain();
      quiet.gain.value = p.noise;
      noise.connect(quiet).connect(filter);
      noise.start();
      sources.push(noise);
    }
    this.layer = { gain, filter, sources };
    this.appliedProfile = this.profile;
    this.layers.add(this.layer);
    if (old) {
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, .45);
      this.later(() => this.stopLayer(old), 2600);
    }
  }
  private stopLayer(layer: Layer): void {
    for (const source of layer.sources) {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
    }
    layer.filter.disconnect();
    layer.gain.disconnect();
    this.layers.delete(layer);
  }
  private later(action: () => void, delay: number): void {
    const timer = setTimeout(() => { this.timers.delete(timer); if (!this.destroyed) action(); }, delay);
    this.timers.add(timer);
  }
  private stopBeat(): void {
    if (this.beat !== undefined) clearTimeout(this.beat);
    this.beat = undefined;
  }
  private schedule(): void {
    this.stopBeat();
    if (!this.context || this.context.state !== 'running' || document.hidden || this.destroyed || this.muted || this.volume === 0) return;
    const p = PROFILES[this.profile];
    this.beat = setTimeout(() => {
      this.tone(p.root * [1, 1.5, 2.25][this.note++ % 3], .018, 2.2);
      this.schedule();
    }, p.pace * (this.reduced ? 1.5 : 1) * 1000);
  }
  private tone(frequency: number, level: number, duration: number, delay = 0): void {
    const ctx = this.context;
    if (!ctx || !this.master || ctx.state !== 'running' || document.hidden || this.destroyed || this.muted || this.volume === 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + .18);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain).connect(this.master);
    this.effects.add(osc);
    osc.onended = () => { this.effects.delete(osc); osc.disconnect(); gain.disconnect(); };
    osc.start(start);
    osc.stop(start + duration + .05);
  }
  playDoor(): void {
    if (this.effects.size > 12) return;
    this.tone(73.42, .018, .8);
    this.tone(110, .01, 1, .12);
  }
  playDiscovery(): void {
    if (this.effects.size > 12) return;
    [293.66, 440, 660].forEach((frequency, i) => this.tone(frequency, .025, 1.8, i * .18));
  }
  destroy(): void {
    this.destroyed = true;
    this.stopBeat();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.visibility);
    for (const layer of this.layers) this.stopLayer(layer);
    for (const effect of this.effects) { try { effect.stop(); } catch { /* already stopped */ } effect.disconnect(); }
    this.effects.clear();
    this.master?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
    this.master = undefined;
    this.layer = undefined;
  }
}
