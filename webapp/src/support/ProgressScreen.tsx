import { currentOpenInterval, type PlayerProgress } from '../auth/progressModel';
import { BODY_CARDS, annotateNrt, reachedMilestones, usesNrtFromMemory } from './bodyCards';
import { allStretchesMs, estimateFromMs, formatCigarettes, formatMoney, intervalDurationMs } from './estimates';
import { EstimateForm } from './EstimateForm';
import { formatDuration } from './timer';
import type { QuitEstimates } from './estimates';

type Props = {
  progress: PlayerProgress;
  now: number;
  editingEstimates: boolean;
  busy?: boolean;
  onSaveEstimates: (estimates: QuitEstimates) => void;
  onEditEstimates: () => void;
  onCorrectStatus?: () => void;
};

export function ProgressScreen({
  progress, now, editingEstimates, busy, onSaveEstimates, onEditEstimates, onCorrectStatus,
}: Props) {
  const open = currentOpenInterval(progress);
  const nrt = usesNrtFromMemory(progress.memory);
  const reached = open ? new Set(reachedMilestones(open.startedAt, now).map(item => item.id)) : new Set<string>();
  const estimates = progress.estimates;
  const currentMs = open ? intervalDurationMs(open, now) : 0;
  const allMs = allStretchesMs(progress.intervals, now);
  const currentStats = estimates ? estimateFromMs(estimates, currentMs) : null;
  const allStats = estimates ? estimateFromMs(estimates, allMs) : null;
  const past = progress.intervals.filter(item => item.endedAt);

  return (
    <div className="support-scroll">
      {estimates && currentStats && allStats && !editingEstimates ? (
        <>
          <section className="support-card support-metric">
            <h2>This stretch</h2>
            <strong>{formatMoney(currentStats.money, estimates.currency)}</strong>
            <p className="support-note">{formatCigarettes(currentStats.cigarettes)} cigarettes avoided. Approximate, from the live count only.</p>
          </section>
          <section className="support-card support-metric">
            <h2>All smoke-free stretches</h2>
            <strong>{formatMoney(allStats.money, estimates.currency)}</strong>
            <p className="support-note">{formatCigarettes(allStats.cigarettes)} cigarettes avoided across every confirmed interval. Time spent smoking again is not counted.</p>
            <button type="button" className="support-ghost" onClick={onEditEstimates}>Edit estimates</button>
          </section>
        </>
      ) : (
        <section className="support-card">
          <h2>Set up your estimates</h2>
          <p className="support-note">These numbers stay yours. Chat notes are not used as settings.</p>
          <EstimateForm initial={estimates} busy={busy} onSave={onSaveEstimates} onCancel={editingEstimates ? onEditEstimates : undefined} />
        </section>
      )}

      <section className="support-card">
        <h2>General milestones</h2>
        <p className="support-note">Your experience may vary. Upcoming notes are not treated as already true.</p>
        <div className="support-milestones">
          {BODY_CARDS.map(card => {
            const done = reached.has(card.id);
            const item = annotateNrt([card], nrt)[0];
            return (
              <article key={card.id} className={`support-mile ${done ? 'is-done' : 'is-soon'}`}>
                <span className="support-mile-tag">{done ? 'Reached' : 'Upcoming'}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.name}</a>
              </article>
            );
          })}
        </div>
      </section>

      {past.length ? (
        <section className="support-card">
          <h2>Earlier stretches</h2>
          <ol className="support-history">
            {past.map(item => (
              <li key={item.id}>
                {new Date(item.startedAt).toLocaleString()} — {new Date(item.endedAt).toLocaleString()}
                <span className="support-note"> {formatDuration(intervalDurationMs(item, now))}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="support-note">No earlier stretches yet.</p>
      )}

      {onCorrectStatus ? (
        <section className="support-card">
          <h2>Status</h2>
          <p className="support-note">
            {open
              ? 'If you smoked and need to correct the live count, you can record it here. This does not need the talk.'
              : 'The live count is off. You can start a new count when a last cigarette is already behind you.'}
          </p>
          <button type="button" className="support-ghost" style={{ marginTop: 10 }} disabled={busy} onClick={onCorrectStatus}>
            {open ? 'I smoked — update status' : 'Start a new count'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
