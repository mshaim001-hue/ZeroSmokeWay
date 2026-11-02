import { useState } from 'react';
import { CURRENCIES, parseEstimates, type QuitEstimates } from './estimates';

type Props = {
  initial: QuitEstimates | null;
  busy?: boolean;
  onSave: (estimates: QuitEstimates) => void;
  onCancel?: () => void;
};

export function EstimateForm({ initial, busy, onSave, onCancel }: Props) {
  const [cigarettesPerDay, setCigarettesPerDay] = useState(String(initial?.cigarettesPerDay ?? ''));
  const [packPrice, setPackPrice] = useState(String(initial?.packPrice ?? ''));
  const [packSize, setPackSize] = useState(String(initial?.packSize ?? 20));
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
  const [issue, setIssue] = useState('');

  function submit() {
    const parsed = parseEstimates({ cigarettesPerDay, packPrice, packSize, currency });
    if (!parsed) {
      setIssue('Enter a daily count, pack price, pack size, and currency.');
      return;
    }
    setIssue('');
    onSave(parsed);
  }

  return (
    <form className="support-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label>
        Cigarettes a day
        <input inputMode="decimal" value={cigarettesPerDay} onChange={e => setCigarettesPerDay(e.target.value)} />
      </label>
      <label>
        Price of a pack
        <input inputMode="decimal" value={packPrice} onChange={e => setPackPrice(e.target.value)} />
      </label>
      <label>
        Cigarettes in a pack
        <input inputMode="numeric" value={packSize} onChange={e => setPackSize(e.target.value)} />
      </label>
      <label>
        Currency
        <select value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCIES.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {issue ? <p className="support-note" role="status">{issue}</p> : null}
      <button type="submit" className="support-primary" disabled={busy}>Save estimates</button>
      {onCancel ? <button type="button" className="support-ghost" onClick={onCancel}>Cancel</button> : null}
    </form>
  );
}
