// Live UI smoke check on a disposable origin with stress/personal conversation open.
// Sends synthetic input to the configured AI. Does not overwrite user saves.
async (page) => {
  await page.locator('main').ariaSnapshot();
  const finish=page.getByRole('button',{name:'Сохранить вывод и открыть двери',exact:true});
  const messages=[
    'Вчера после рабочего звонка я вышел во двор и закурил. Я ожидал, что сигарета уберёт тревогу из-за разговора.',
    'Потом сравнил: тревога о работе осталась. Стало легче от того, что вышел и побыл один. Сигарета закончилась, а проблему пришлось решать.',
    'Мой вывод: мне нужна пауза и тишина, а не обязательно сигарета. Ожидал исчезновения тревоги, но фактически получил передышку. Я хочу сохранять паузу другим способом.'
  ];
  for(const [index,message] of messages.entries()) {
    await page.getByRole('textbox',{name:'Сообщение ведущему',exact:true}).fill(message);
    await page.getByRole('button',{name:'Отправить сообщение',exact:true}).click();
    await page.getByRole('status').waitFor({state:'detached',timeout:20000});
    if(index<2 && await finish.isEnabled()) throw new Error('Premature room completion');
  }
  if(!await finish.isEnabled()) throw new Error('AI did not confirm example/comparison/conclusion; inspect dialogue');
  await finish.click();
  await page.getByRole('button',{name:/Выбрать другую дверь/}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Город за стеной/}).click();
  await page.locator('.lab-transition.active').waitFor({state:'detached'});
  await page.getByRole('heading',{name:'Город за стеной',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/nonlinear-route.png'});
}
