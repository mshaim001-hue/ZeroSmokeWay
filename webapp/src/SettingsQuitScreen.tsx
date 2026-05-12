import { useCallback, useState } from 'react';
import {
  LS_QUIT_AT_MS,
  readQuitAtMs,
} from './quitTracking';
import { QuitTrackingSettingsForm } from './ProgressQuitScreen';

function formatQuitDateRu(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

type RowProps = {
  icon: string;
  title: string;
  desc?: string;
  onClick?: () => void;
  muted?: boolean;
};

function SettingsRow({ icon, title, desc, onClick, muted }: RowProps) {
  return (
    <button
      type="button"
      className={'settings-row' + (muted ? ' settings-row--muted' : '')}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="settings-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="settings-row-text">
        <span className="settings-row-title">{title}</span>
        {desc ? <span className="settings-row-desc">{desc}</span> : null}
      </span>
    </button>
  );
}

export function SettingsQuitScreen() {
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev((x) => x + 1), []);

  const quitAt = readQuitAtMs();

  const quitDateText =
    quitAt != null ? `Дата отказа от курения: ${formatQuitDateRu(quitAt)} г.` : 'Дата отказа не задана — задай во вкладке «Прогресс».';

  function onStartOver() {
    if (!quitAt) {
      window.alert('Сначала начни отсчёт на вкладке «Прогресс».');
      return;
    }
    if (!window.confirm('Сбросить дату отказа и начать заново? Статистика на этом устройстве обнулится.')) {
      return;
    }
    localStorage.removeItem(LS_QUIT_AT_MS);
    refresh();
  }

  async function onShare() {
    const quit = readQuitAtMs();
    const text =
      quit != null
        ? `Без сигарет с ${formatQuitDateRu(quit)} — ZeroSmokeWay`
        : 'ZeroSmokeWay — честный разговор о курении без давления.';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'ZeroSmokeWay', text });
        return;
      } catch (e: unknown) {
        const name = e instanceof Error ? e.name : '';
        if (name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      window.alert('Ссылка и текст скопированы в буфер.');
    } catch {
      window.prompt('Скопируй вручную:', `${text} ${window.location.href}`);
    }
  }

  function onProfile() {
    window.alert('Редактирование профиля — скоро. Пока данные только в этом браузере.');
  }

  return (
    <div className="settings-screen" data-rev={rev}>
      <div className="settings-body">
        <h3 className="settings-section-title">Мой прогресс</h3>
        <div className="settings-card">
          <SettingsRow icon="📅" title="Начать заново" desc={quitDateText} onClick={onStartOver} />
          <SettingsRow icon="👤" title="Профиль пользователя" desc="Редактирование настроек профиля" onClick={onProfile} />
          <SettingsRow icon="🔗" title="Поделиться прогрессом" onClick={onShare} />
        </div>

        <div className="settings-subcard">
          <p className="settings-subcard-title">Расход до отказа (для расчёта в «Прогресс»)</p>
          <QuitTrackingSettingsForm />
        </div>
      </div>
    </div>
  );
}
