import { useCallback, useState } from 'react';
import {
  LS_CIGS_IN_PACK,
  LS_CIGS_PER_DAY,
  LS_PRICE_PER_PACK,
  LS_QUIT_AT_MS,
  calcMetrics,
  defaultCigsInPack,
  defaultCigsPerDay,
  defaultPricePerPack,
  readNumber,
  readQuitAtMs,
} from './quitTracking';
import { QuitTrackingSettingsForm } from './ProgressQuitScreen';

function formatQuitDateRu(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function collectZswStorage(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('zsw')) {
      out[k] = localStorage.getItem(k);
    }
  }
  return out;
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
      {onClick ? <span className="settings-row-chevron">›</span> : null}
    </button>
  );
}

type Props = {
  onBack?: () => void;
  embedInOverlay?: boolean;
};

export function SettingsQuitScreen({ onBack, embedInOverlay = false }: Props) {
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

  function onPremium() {
    window.alert('Премиум — позже. Сейчас всё бесплатно.');
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

  function onBackup() {
    const data = collectZswStorage();
    downloadText(`zerosmokeway-backup-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  function onExportCsv() {
    const quit = readQuitAtMs();
    const now = Date.now();
    const m = calcMetrics(now, quit);
    const lines = [
      ['metric', 'value'],
      ['quit_at_iso', quit ? new Date(quit).toISOString() : ''],
      ['exported_at_iso', new Date(now).toISOString()],
      ['elapsed_ms', String(m.elapsed)],
      ['day_number', String(m.dayNumber)],
      ['year_percent', String(m.yearPercent)],
      ['money_saved_kzt', String(m.moneySaved)],
      ['cigs_avoided', String(m.cigsAvoided)],
      ['cigs_per_day', String(readNumber(LS_CIGS_PER_DAY, defaultCigsPerDay))],
      ['price_per_pack_kzt', String(readNumber(LS_PRICE_PER_PACK, defaultPricePerPack))],
      ['cigs_in_pack', String(readNumber(LS_CIGS_IN_PACK, defaultCigsInPack))],
    ];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadText(`zerosmokeway-export-${Date.now()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }

  function onBiometric() {
    window.alert('Биометрическая блокировка в веб-версии пока недоступна.');
  }

  return (
    <div className="settings-screen" data-rev={rev}>
      {!embedInOverlay && (
        <header className="settings-app-header">
          <button type="button" className="btn-toolbar" onClick={() => onBack?.()} aria-label="Назад">
            ←
          </button>
          <span className="settings-bar-title">Настройки</span>
          <span className="settings-bar-spacer" aria-hidden />
        </header>
      )}

      <div className="settings-body">
        <SettingsRow icon="👑" title="Перейти на премиум" desc="Увеличьте свои шансы на успех" onClick={onPremium} />

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

        <h3 className="settings-section-title">Данные и безопасность</h3>
        <div className="settings-card">
          <SettingsRow
            icon="☁️"
            title="Резервное копирование и восстановление"
            desc="Сохранение и восстановление данных"
            onClick={onBackup}
          />
          <SettingsRow
            icon="📄"
            title="Экспорт в CSV"
            desc="Сохраните данные для внешнего анализа"
            onClick={onExportCsv}
          />
          <SettingsRow icon="🔐" title="Биометрическая блокировка" desc="Вход по отпечатку или лицу" onClick={onBiometric} />
        </div>
      </div>
    </div>
  );
}
