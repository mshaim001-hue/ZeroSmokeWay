import { currentOpenInterval, type PlayerProgress } from '../auth/progressModel';
import { annotateNrt, milestoneProgress, usesNrtFromMemory } from './bodyCards';
import { allStretchesMs, estimateFromMs, formatCigarettes, formatMoney } from './estimates';
import { EstimateForm } from './EstimateForm';
import { smokeFreeClock } from './timer';
import type { QuitEstimates } from './estimates';

const KOFI = 'https://ko-fi.com/underdot';

type Props = {
  progress: PlayerProgress;
  now: number;
  onTalk: () => void;
  onStartCount: () => void;
  onSaveEstimates: (estimates: QuitEstimates) => void;
  onEditEstimates: () => void;
  editingEstimates: boolean;
  busy?: boolean;
};

function Ring({ ratio }: { ratio: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, ratio)));
  return (
    <svg className="support-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E3EAE6" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={r} fill="none" stroke="#25846C" strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

export function TodayScreen({
  progress, now, onTalk, onStartCount, onSaveEstimates, onEditEstimates, editingEstimates, busy,
}: Props) {
  const open = currentOpenInterval(progress);
  const clock = open ? smokeFreeClock(open.startedAt, now) : null;
  const miles = milestoneProgress(open?.startedAt ?? null, now);
  const nrt = usesNrtFromMemory(progress.memory);
  const next = miles.next ? annotateNrt([miles.next], nrt)[0] : null;
  const reached = miles.reached.length ? annotateNrt([miles.reached[miles.reached.length - 1]], nrt)[0] : null;
  const estimates = progress.estimates;
  const currentMs = open ? clock?.totalMs ?? 0 : 0;
  const stats = estimates ? estimateFromMs(estimates, currentMs) : null;

  return (
    <div className="support-scroll">
      <section className="support-card" aria-live="polite">
        <h2>Your smoke-free time</h2>
        {open && clock && clock.totalMs > 0 ? (
          <div className="support-clock">
            <div className="support-clock-unit"><strong>{clock.days}</strong><span>days</span></div>
            <div className="support-clock-unit"><strong>{clock.hours}</strong><span>hours</span></div>
            <div className="support-clock-unit"><strong>{clock.minutes}</strong><span>minutes</span></div>
            {clock.showSeconds ? <div className="support-clock-unit"><strong>{clock.seconds}</strong><span>seconds</span></div> : null}
          </div>
        ) : (
          <p className="support-clock-zero">Your smoke-free time starts here</p>
        )}
        {!open ? (
          <>
            <p className="support-note">The live count is off while you are smoking again. Past stretches stay in history.</p>
            <button type="button" className="support-primary" style={{ marginTop: 12 }} onClick={onStartCount}>Start a new count</button>
          </>
        ) : next ? (
          <div className="support-next">
            <Ring ratio={miles.ratio} />
            <p>
              Next: {next.title}
              <small>Time to this milestone — not a measure of recovery. {Math.round(miles.ratio * 100)}% of the way there.</small>
            </p>
          </div>
        ) : (
          <p className="support-note">Every listed milestone on this path is already behind you.</p>
        )}
      </section>

      {estimates && !editingEstimates && stats ? (
        <div className="support-row">
          <section className="support-card support-metric">
            <h2>Money saved</h2>
            <strong>{formatMoney(stats.money, estimates.currency)}</strong>
            <p className="support-note">This stretch. Approximate.</p>
            <button type="button" className="support-ghost" onClick={onEditEstimates}>Edit estimates</button>
          </section>
          <section className="support-card support-metric">
            <h2>Cigarettes avoided</h2>
            <strong>{formatCigarettes(stats.cigarettes)}</strong>
            <p className="support-note">This stretch. Approximate.</p>
          </section>
        </div>
      ) : (
        <section className="support-card">
          <h2>Set up your estimates</h2>
          <p className="support-note">Cigarettes a day, pack price, pack size, and currency — only what you confirm here.</p>
          <EstimateForm initial={estimates} busy={busy} onSave={onSaveEstimates} onCancel={editingEstimates ? onEditEstimates : undefined} />
        </section>
      )}

      <section className="support-card support-muse">
        <h2>Need a moment?</h2>
        <p>Talk to Muse. You don’t have to work it out alone.</p>
        <button type="button" className="support-primary" onClick={onTalk}>Talk to Muse</button>
      </section>

      <section className="support-card">
        <h2>General milestones</h2>
        <p className="support-note">Your experience may vary. These are public-health notes, not a reading of your body.</p>
        <div className="support-milestones">
          {reached ? (
            <article className="support-mile is-done">
              <span className="support-mile-tag">Reached</span>
              <h3>{reached.title}</h3>
              <p>{reached.body}</p>
              <a href={reached.source.url} target="_blank" rel="noopener noreferrer">{reached.source.name}</a>
            </article>
          ) : null}
          {next ? (
            <article className="support-mile is-next">
              <span className="support-mile-tag">Upcoming</span>
              <h3>{next.title}</h3>
              <p>{next.body}</p>
              <a href={next.source.url} target="_blank" rel="noopener noreferrer">{next.source.name}</a>
            </article>
          ) : null}
        </div>
      </section>

      <section className="support-card support-kofi">
        <h3>Help ZeroSmokeWay grow</h3>
        <p className="support-note">If this project has been useful to you, you can support its development.</p>
        <a className="support-secondary" href={KOFI} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>Support on Ko-fi ↗</a>
      </section>
      {estimates && allStretchesMs(progress.intervals, now) > currentMs ? (
        <p className="support-note">All smoke-free stretches, including earlier ones, are on Progress.</p>
      ) : null}
    </div>
  );
}
