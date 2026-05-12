import { readQuitAtMs } from './quitTracking';

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

function SupportRow({ icon, title, desc, onClick, muted }: RowProps) {
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
};

export function SupportProjectScreen({ onBack }: Props) {
  async function onShare() {
    const quit = readQuitAtMs();
    const text =
      quit != null
        ? `Без сигарет с ${formatQuitDateRu(quit)} — ZeroSmokeWay`
        : 'ZeroSmokeWay — честный разговор о курении без давления.';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'ZeroSmokeWay', text, url: window.location.href });
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

  function onRate() {
    window.alert('Оценка в каталоге приложений — когда появится отдельная публикация. Спасибо за намерение помочь.');
  }

  function onDonate() {
    window.alert('Пожертвования и подписка — позже. Сейчас лучшая помощь — рассказать о ZeroSmokeWay тем, кому это актуально.');
  }

  function onFeedback() {
    const subject = encodeURIComponent('ZeroSmokeWay — обратная связь');
    const body = encodeURIComponent(
      `Здравствуйте!\n\n(Опишите идею, вопрос или замечание. Версия: веб.)\n\n`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="settings-screen support-screen">
      <header className="settings-app-header">
        <button type="button" className="settings-bar-btn" onClick={() => onBack?.()} aria-label="Назад">
          ←
        </button>
        <span className="settings-bar-title">Поддержка проекта</span>
        <span className="settings-bar-spacer" aria-hidden />
      </header>

      <div className="settings-body">
        <div className="support-hero">
          <span className="support-hero-icon" aria-hidden>
            💚
          </span>
          <h2 className="support-hero-title">Спасибо, что пользуешься ZeroSmokeWay</h2>
          <p className="support-hero-lead">
            Мы развиваем сервис без давления и морализаторства. Любая поддержка — от рассказа другу до отзыва — помогает
            держать проект живым.
          </p>
        </div>

        <h3 className="settings-section-title">Чем можно помочь</h3>
        <div className="settings-card">
          <SupportRow
            icon="🔗"
            title="Поделиться ссылкой"
            desc="Расскажи тем, кто как раз ищет такой формат"
            onClick={onShare}
          />
          <SupportRow
            icon="⭐"
            title="Оценить приложение"
            desc="Позже — в магазине приложений или на странице проекта"
            onClick={onRate}
            muted
          />
          <SupportRow
            icon="✉️"
            title="Написать нам"
            desc="Идея, вопрос или замечание — откроется почта"
            onClick={onFeedback}
          />
        </div>

        <h3 className="settings-section-title">Ещё</h3>
        <div className="settings-card">
          <SupportRow
            icon="🎁"
            title="Материальная поддержка"
            desc="Пожертвования и премиум — в планах"
            onClick={onDonate}
            muted
          />
        </div>

        <p className="support-footnote">
          Отдельное спасибо за терпение к ранней версии и за честный диалог в чате — это тоже часть сообщества.
        </p>
      </div>
    </div>
  );
}
