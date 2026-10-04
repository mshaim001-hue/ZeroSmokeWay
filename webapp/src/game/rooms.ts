export const THEME_IDS = ['pleasure','stress','origin','company','ritual','loop','price','tomorrow','withdrawal','world'] as const;
export type ThemeId = typeof THEME_IDS[number];
export type RoomId = 'entry' | ThemeId | 'freedom';
export type Mechanic = 'keep' | 'pause' | 'rewind' | 'company' | 'cycle' | 'price' | 'clock' | 'weather' | 'unpack' | 'exit';
export type SceneObject = { id: string; label: string; detail: string; symbol: string };
export type RoomDefinition = {
  title: string; door: string; subtitle: string; profile: string; color: number; mechanic: Mechanic;
  opening: string; instruction: string; before: string; after: string; action: string; reward: string;
  objects: SceneObject[]; neighbours: RoomId[];
};
const object = (id: string, label: string, symbol: string, detail: string): SceneObject => ({id,label,symbol,detail});
export const ROOMS: Record<RoomId, RoomDefinition> = {
  entry: {
    title:'Что держит',door:'Моя причина',subtitle:'С чего начинается твой путь',profile:'corridor',color:0xd8bc8e,mechanic:'keep',
    opening:'Если перестать курить, по чему ты будешь скучать?',instruction:'Три вещи связаны вместе. Коснись их, затем перетащи вниз то, что держит тебя рядом с сигаретой.',
    before:'Всё связано с сигаретой',after:'Ты сам выбираешь, что оставить',action:'Разделить',reward:'В стене появились три прохода. На каждом — другой вопрос о твоей причине.',
    objects:[object('pleasure','Удовольствие','cup','Какие сигареты ты ждёшь с удовольствием?'),object('support','Поддержка','lamp','В чём сигарета, по твоему ощущению, помогает?'),object('habit','Привычка','ring','Бывает, что закуриваешь, даже не задумавшись?')],neighbours:['pleasure','stress','ritual'],
  },
  pleasure:{
    title:'Кофе остывает',door:'Без сигареты уже не то?',subtitle:'Удовольствие и ожидание',profile:'pleasure',color:0xe7ba78,mechanic:'keep',
    opening:'Какая сигарета для тебя самая приятная в течение дня?',instruction:'На столе кофе, сигарета и пауза. Перетащи вниз то, что можно убрать. Оставь одну или две вещи — стол изменится сам.',
    before:'Кофе + сигарета + пауза',after:'Та же чашка. То же время. Другой состав.',action:'Изменить стол',reward:'За столом стало больше света. Отсюда видна дверь к тому, с чего всё началось.',
    objects:[object('coffee','Кофе','cup','Что нравится в самом кофе?'),object('cigarette','Сигарета','cigarette','Вкус, затяжка, ощущение после — что именно приятно?'),object('pause','Пауза','clock','Кому принадлежат эти десять минут?')],neighbours:['origin','ritual','company'],
  },
  stress:{
    title:'Тихая комната',door:'Как я буду справляться?',subtitle:'Напряжение и передышка',profile:'stress',color:0x94bdcd,mechanic:'pause',
    opening:'В какие моменты сигарета кажется тебе особенно нужной?',instruction:'Коснись передышки и сигареты. Затем удерживай центр, пока шум не затихнет.',
    before:'Шум не оставляет места для мысли',after:'Пауза появилась. Вопрос о сигарете остался.',action:'Остановить шум',reward:'Шум отступил. За перегородкой видна дверь с твоим следующим страхом.',
    objects:[object('phone','Звонки','phone','Что меняется в проблеме после сигареты?'),object('pause','Передышка','clock','Что даёт возможность на несколько минут отойти?'),object('cigarette','Сигарета','cigarette','Как отличаешь помощь сигареты от конца неприятного разговора?')],neighbours:['withdrawal','tomorrow','loop'],
  },
  origin:{
    title:'Первая дверь',door:'Я выбирал курить столько лет?',subtitle:'Начало и сегодняшний взгляд',profile:'origin',color:0xc6aa91,mechanic:'rewind',
    opening:'Когда попробовал первую сигарету, чего ты от неё ждал?',instruction:'Передвинь время от сегодняшнего дня к началу. Открой три отметки на линии.',
    before:'Сегодня',after:'До первой сигареты',action:'Отмотать время',reward:'Линия прошлого перестала уходить в темноту. У тебя есть взгляд, которого тогда не было.',
    objects:[object('first','Первая','match','Собирался курить годами или просто пробовал?'),object('regular','Каждый день','pack','Когда это стало обычной частью дня?'),object('today','Сегодня','mirror','С нынешним знанием начал бы снова?')],neighbours:['price','world','tomorrow'],
  },
  company:{
    title:'Место за столом',door:'А как же друзья и праздники?',subtitle:'Люди и чувство принадлежности',profile:'company',color:0xe0a89d,mechanic:'company',
    opening:'Что пугает в компании курящих, если самому не курить?',instruction:'Погаси сигареты за столом. Люди останутся. Выбери место, на котором хочешь сидеть.',
    before:'Все вместе — и все курят',after:'Те же люди. Дым исчез.',action:'Погасить сигареты',reward:'В стене появился проём к следующему празднику. Твоё место за столом осталось.',
    objects:[object('friends','Люди','people','Что связывает вас помимо курения?'),object('offer','Предложение','cigarette','Что ответишь на «давай одну»?'),object('place','Моё место','chair','Чувствовал бы себя лишним — и почему?')],neighbours:['withdrawal','ritual','loop'],
  },
  ritual:{
    title:'Разобрать по частям',door:'Что я люблю в этом ритуале?',subtitle:'Движения, вкус, пауза',profile:'pleasure',color:0xd4bd8f,mechanic:'keep',
    opening:'Что тебе нравится в самом ритуале курения?',instruction:'Разложи ритуал. Коснись предметов и убери то, без чего он всё ещё имеет смысл для тебя.',
    before:'Один неразделимый ритуал',after:'Отдельные вещи, которые можно рассмотреть',action:'Разложить',reward:'На полке остались выбранные тобой вещи. За ней стала видна повторяющаяся петля.',
    objects:[object('hands','Руки','hand','Если дело в движениях рук, зачем поджигать сигарету?'),object('taste','Вкус','cigarette','Что нравится во вкусе? А если привычной марки нет?'),object('break','Перерыв','chair','Хотелось бы сохранить этот перерыв без сигареты?')],neighbours:['loop','pleasure','company'],
  },
  loop:{
    title:'Ещё одна',door:'Почему снова хочется?',subtitle:'Обещание и повтор',profile:'mirror',color:0xb7addb,mechanic:'cycle',
    opening:'Как понимаешь, что пора закурить следующую сигарету?',instruction:'Коснись трёх звеньев. Затем потяни круг в сторону — петля станет проходом.',
    before:'Хочется → сигарета → снова хочется',after:'Петля видна целиком',action:'Разомкнуть круг',reward:'Круг стал проходом. Объяснение можно проверить, а не принимать на веру.',
    objects:[object('want','Хочется','ring','Откуда берётся ощущение, что чего-то не хватает?'),object('relief','Легче','cigarette','Это новое удовольствие или исчезновение неприятного ощущения?'),object('again','Снова','clock','Что происходит между этой сигаретой и следующей?')],neighbours:['withdrawal','tomorrow','price'],
  },
  price:{
    title:'Счёт открыт',door:'Сколько это забирает?',subtitle:'Деньги, время, планы',profile:'origin',color:0xd5c48f,mechanic:'price',
    opening:'Что в цене курения раздражает тебя больше всего: деньги, время или зависимость от пачки?',instruction:'Настрой свой расход. Переключи день и год: из монет сложится то, на что уходят деньги.',
    before:'Одна покупка почти незаметна',after:'Та же привычка за год',action:'Показать год',reward:'Стена из монет опустилась. За ней — время, которым ты ещё распоряжаешься.',
    objects:[object('money','Деньги','coin','Какую цену пачки обычно платишь?'),object('time','Время','clock','Что приходится откладывать ради сигареты?'),object('plans','Планы','door','Бывало, менял маршрут или выходил ночью за пачкой?')],neighbours:['tomorrow','world','origin'],
  },
  tomorrow:{
    title:'Завтра',door:'Когда будет подходящий момент?',subtitle:'Откладывание и условия',profile:'tomorrow',color:0xb4c7b5,mechanic:'clock',
    opening:'Как выглядит тот подходящий момент, когда будет легче бросить?',instruction:'Передвинь «завтра» дальше. Посмотри, как дверь отдаляется. Потом останови часы там, где хочешь.',
    before:'После работы. После праздников. Потом.',after:'Часы остановлены на твоём выборе',action:'Остановить часы',reward:'Дверь перестала отодвигаться. Это ещё не обещание бросить — ты увидел своё условие.',
    objects:[object('work','Работа','phone','Что должно измениться на работе?'),object('holiday','После праздников','cup','Появится ли после них другое «потом»?'),object('now','Сейчас','clock','Чего именно ты ждёшь?')],neighbours:['withdrawal','price','loop'],
  },
  withdrawal:{
    title:'За шумом',door:'А если без сигареты будет трудно?',subtitle:'Тяга, раздражение, страх',profile:'stress',color:0x8eafcf,mechanic:'weather',
    opening:'Чего больше всего боишься без сигарет: тяги, раздражения, трудностей с работой или чего-то другого?',instruction:'Сделай свой страх видимым. Усиль или ослабь бурю, затем открой окно и назови, что тебе поможет.',
    before:'Страх заполняет всю комнату',after:'За ним видно пространство',action:'Открыть окно',reward:'В комнате стало видно дальше. Трудность получила имя, с ней можно продолжать разговор.',
    objects:[object('craving','Тяга','wave','Как представляешь себе желание закурить без сигареты?'),object('mood','Настроение','cloud','Что тревожит в отношениях с близкими?'),object('help','Помощь','lamp','Какая поддержка была бы полезна именно тебе?')],neighbours:['company','stress','tomorrow'],
  },
  world:{
    title:'Красивая пачка',door:'Откуда взялись эти обещания?',subtitle:'Упаковка и чужие слова',profile:'mirror',color:0xc49db8,mechanic:'unpack',
    opening:'Какие слова или образы когда-то делали курение привлекательным для тебя?',instruction:'Коснись образа, чужих слов и предупреждений. Затем смахни с пачки три слоя.',
    before:'Образ, который тебе предложили',after:'Твой взгляд без упаковки',action:'Снять следующий слой',reward:'Пачка потеряла надписи. Теперь осталось то, что ты сам о ней думаешь.',
    objects:[object('image','Образ','pack','Свобода, взросление, уверенность — что обещало курение?'),object('voices','Чужие слова','people','Кто говорил тебе, что сигарета помогает?'),object('warning','Предупреждения','sign','Что меняют пугающие надписи лично для тебя?')],neighbours:['origin','price','company'],
  },
  freedom:{
    title:'Выход',door:'Свобода',subtitle:'Что ты берёшь с собой',profile:'freedom',color:0xe5d6ab,mechanic:'exit',
    opening:'Ты прошёл разные стороны своей привычки. Что теперь думаешь о жизни без сигареты?',instruction:'Зажги три огня своего пути. Когда будешь готов, открой выход.',
    before:'Выход собран из твоего пути',after:'Дверь открыта',action:'Открыть выход',reward:'Лабиринт пройден. Решение о курении остаётся твоим.',
    objects:[object('keep','Что оставить','cup','Что ценное из своей жизни ты хочешь сохранить?'),object('leave','Что отпустить','ring','Что больше не хочешь отдавать сигаретам?'),object('next','Следующий шаг','door','Что ты выбираешь сделать после игры?')],neighbours:[],
  },
};
export const ROOM_IDS = ['entry', ...THEME_IDS, 'freedom'] as RoomId[];
export function entryOpening(reason: string): string {
  if (['Сигарету с кофе или после еды','Мне нравится'].includes(reason)) return 'Что тебе нравится в сигарете с кофе или после еды?';
  if (['Возможность успокоиться','Помогает расслабиться'].includes(reason)) return 'Как ты замечаешь, что сигарета помогла тебе успокоиться?';
  if (reason === 'Не знаю. Я просто курю') return 'Чаще замечаешь, что хочется курить, или уже находишь себя с сигаретой?';
  return reason ? `Ты написал: «${reason}». Чего тебе будет не хватать без сигареты?` : ROOMS.entry.opening;
}
