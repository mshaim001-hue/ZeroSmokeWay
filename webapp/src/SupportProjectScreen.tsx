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
    </button>
  );
}

export function SupportProjectScreen() {
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

        <h3 className="settings-section-title">О нас</h3>
        <div className="settings-card">
          <div className="support-about-inner">
            <p className="support-hero-lead">Мы — студенты Tomorrow School.</p>
            <p className="support-hero-lead">
              ZeroSmokeWay — наш первый социальный проект и приложение, которое помогает людям отказаться от курения без
              давления, осуждения и запугивания.
            </p>
            <p className="support-hero-lead">
              Мы верим, что поддержка, спокойный подход и понимание работают лучше, чем стыд и жёсткие запреты.
            </p>
            <p className="support-hero-lead">
              Наша цель — не просто говорить о проблеме, а действительно помогать людям проходить этот путь легче и
              осознаннее.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
