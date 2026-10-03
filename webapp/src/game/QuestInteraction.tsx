import { useState } from 'react';

export type QuestInteractionProps = { roomId: string; onComplete: (summary: string) => void };
const buttonStyle = { minHeight: 44, minWidth: 44 };
const momentCards: Record<string, string[]> = {
  pleasure: ['Вкус', 'Пауза', 'Предвкушение', 'Разговор', 'Облегчение'],
  ritual: ['Движение рук', 'Зажигалка', 'Вкус', 'Выход на улицу', 'Ощущения'],
  company: ['Разговор', 'Близость', 'Общий ритуал', 'Музыка', 'Пауза'],
};

export function QuestInteraction({ roomId, onComplete }: QuestInteractionProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState(0);
  const [count, setCount] = useState(10);
  const [cost, setCost] = useState(2000);
  const [thought, setThought] = useState('');
  const [fear, setFear] = useState('');
  const [support, setSupport] = useState('');
  const [message, setMessage] = useState('');
  const [flipped, setFlipped] = useState<number[]>([]);
  const finish = (summary: string) => onComplete(summary);
  const action = (label: string, handler: () => void, pressed?: boolean) => (
    <button type="button" className="qi-card" style={buttonStyle} onClick={handler} aria-pressed={pressed}>{label}</button>
  );
  let content;

  if (momentCards[roomId]) {
    const cards = momentCards[roomId];
    content = <>
      <p>Собери момент из двух или трёх частей. Нажми на карточку ещё раз, чтобы убрать её.</p>
      <div className="qi-cards">{cards.map(card => <span key={card}>{action(card, () => {
        setSelected(previous => previous.includes(card) ? previous.filter(item => item !== card) : previous.length < 3 ? [...previous, card] : previous);
      }, selected.includes(card))}</span>)}</div>
      <div className="qi-result" aria-live="polite">{selected.length ? `Твой момент: ${selected.join(' + ')}` : 'Выбери, из чего состоит этот момент.'}</div>
      <button type="button" className="qi-primary" style={buttonStyle} disabled={selected.length < 2} onClick={() => finish(`Состав момента: ${selected.join(', ')}.`)}>Сохранить сочетание</button>
    </>;
  } else if (roomId === 'origin') {
    const chronology = ['Герой попробовал первую сигарету', 'Перекуры появились в расписании', 'Герой заметил повторяющийся маршрут'];
    content = <>
      <p>Восстанови историю вымышленного героя: нажимай на события от первого к последнему. Это не проверка твоей истории.</p>
      <div className="qi-cards">{[2, 0, 1].map(index => <span key={index}>{action(chronology[index], () => {
        if (index === selected.length) { setSelected(previous => [...previous, chronology[index]]); setMessage('Событие встало на своё место.'); }
        else setMessage('Этот фрагмент относится к другому моменту. Можно попробовать другую карточку.');
      }, selected.includes(chronology[index]))}</span>)}</div>
      <ol className="qi-result">{selected.map(item => <li key={item}>{item}</li>)}</ol>
      <p aria-live="polite">{message}</p>
      <button type="button" className="qi-primary" style={buttonStyle} disabled={selected.length !== 3} onClick={() => finish('Собрана хронология героя: проба → привычное расписание → замеченный повтор.')}>Открыть своё воспоминание</button>
    </>;
  } else if (roomId === 'stress') {
    const scenes = ['Телефон звонит. Задача ждёт. Герой остаётся у стола.', 'Телефон без звука. Герой вышел на короткую паузу. Задача всё ещё ждёт.'];
    content = <>
      <p>Переключай две версии сцены. Заметь, что изменилось и что осталось.</p>
      <div className="qi-cards">{action('Сцена А', () => setView(0), view === 0)}{action('Сцена Б', () => setView(1), view === 1)}</div>
      <div className="qi-scene" aria-live="polite">{scenes[view]}</div>
      <label className="qi-label">Что заметил?<textarea className="qi-input" value={thought} onChange={event => setThought(event.target.value)} rows={2} maxLength={300} placeholder="Можно оставить пустым" /></label>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(thought.trim() || 'Сравнил две сцены: обстоятельства и пауза меняются отдельно.')}>Продолжить исследование</button>
    </>;
  } else if (roomId === 'loop') {
    const labels = ['До', 'Во время', 'После'];
    const scenes = ['Ожидание: хочется прервать происходящее.', 'Перерыв: внимание переходит к знакомому действию.', 'После: день продолжается. Что осталось от ожидания?'];
    content = <>
      <p>Перемотай один вымышленный перекур. Каждый кадр показывает отдельную часть момента.</p>
      <div className="qi-cards">{labels.map((label, index) => <span key={label}>{action(label, () => setView(index), view === index)}</span>)}</div>
      <div className="qi-scene" aria-live="polite">{scenes[view]}</div>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(`Рассмотрел временные части момента. Выбранный кадр: ${labels[view]}.`)}>Перейти к своему примеру</button>
    </>;
  } else if (roomId === 'price') {
    const monthly = Math.round(count / 20 * cost * 30);
    content = <>
      <p>Передвинь два ползунка и посмотри, как меняется сумма. Это оценка для пачки из 20 сигарет, не оценка тебя.</p>
      <label className="qi-label" htmlFor="qi-count">Сигарет в день: {count}</label>
      <input id="qi-count" className="qi-range" style={{ minHeight: 44 }} type="range" min={0} max={60} value={count} onChange={event => setCount(Number(event.target.value))} />
      <label className="qi-label" htmlFor="qi-cost">Цена пачки, в твоей валюте: {cost}</label>
      <input id="qi-cost" className="qi-range" style={{ minHeight: 44 }} type="range" min={0} max={10000} step={50} value={cost} onChange={event => setCost(Number(event.target.value))} />
      <output className="qi-result" aria-live="polite">Около {monthly.toLocaleString('ru-RU')} за 30 дней</output>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(`Личная оценка: ${count} сигарет в день, пачка ${cost}, примерно ${monthly} за 30 дней.`)}>Сохранить оценку</button>
    </>;
  } else if (roomId === 'tomorrow') {
    const days = ['Сегодня: на работе много задач.', 'Завтра: появился новый звонок.', 'Ещё день: впереди встреча с друзьями.', 'Ещё день: часть дел закончилась, другие остались.'];
    content = <>
      <p>Перелистни до трёх дней. Дата меняется вместе с обстоятельствами; выбирать дату отказа здесь не нужно.</p>
      <div className="qi-scene" aria-live="polite">{days[view]}</div>
      <div className="qi-cards">{action(view < 3 ? 'Перенести на завтра' : 'Три страницы просмотрены', () => setView(previous => Math.min(3, previous + 1)))}</div>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(`Просмотрено ${view + 1} календарных страниц. Решение о готовности не требовалось.`)}>Оставить календарь и продолжить</button>
    </>;
  } else if (roomId === 'world') {
    const cards = [ ['Красивый образ', 'Образ обещает стиль. Что обещает сама привычка?'], ['Предупреждение', 'Твоя реакция на страх может отличаться от замысла автора.'], ['Запрет', 'Общественное правило и личная мотивация — разные вопросы.'] ];
    content = <>
      <p>Переверни плакаты. На обороте — вопрос к сообщению, а не готовый ответ.</p>
      <div className="qi-cards">{cards.map((card, index) => <span key={index}>{action(flipped.includes(index) ? card[1] : card[0], () => setFlipped(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index]), flipped.includes(index))}</span>)}</div>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(`Рассмотрел сообщения: ${flipped.map(index => cards[index][0]).join(', ') || 'пока оставил открытым'}.`)}>Обсудить свою реакцию</button>
    </>;
  } else if (roomId === 'withdrawal') {
    content = <>
      <p>Собери одну пару: трудность и поддержка. Это черновик, его можно изменить.</p>
      <div className="qi-cards">{['Раздражительность', 'Сильное желание', 'Компания курящих'].map(item => <span key={item}>{action(item, () => setFear(item), fear === item)}</span>)}</div>
      <p>Что стоит поставить рядом?</p>
      <div className="qi-cards">{['Пауза', 'Разговор с близким', 'Обсудить помощь специалиста'].map(item => <span key={item}>{action(item, () => setSupport(item), support === item)}</span>)}</div>
      <div className="qi-result" aria-live="polite">{fear && support ? `${fear} → ${support}` : 'Выбери трудность и поддержку.'}</div>
      <button type="button" className="qi-primary" style={buttonStyle} disabled={!fear || !support} onClick={() => finish(`Черновик поддержки: ${fear} → ${support}.`)}>Сохранить пару</button>
    </>;
  } else {
    content = <>
      <p>Оставь короткую запись, которую хочешь взять с собой. Можно продолжить без записи.</p>
      <label className="qi-label">Моя мысль<textarea className="qi-input" value={thought} onChange={event => setThought(event.target.value)} maxLength={300} rows={3} placeholder="Твои слова, даже если вопрос ещё открыт" /></label>
      <button type="button" className="qi-primary" style={buttonStyle} onClick={() => finish(thought.trim() || 'Оставил вопрос открытым и продолжил путь.')}>Продолжить</button>
    </>;
  }
  return <section className="qi-root" aria-label="Действие в комнате">{content}</section>;
}
