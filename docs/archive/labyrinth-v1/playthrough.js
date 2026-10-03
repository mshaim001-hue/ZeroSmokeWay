async (page) => {
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('zsw_labyrinth_v1')));
  const signature = state => `${state.view}/${state.roomId}/${state.stage}/${state.stepIndex}/${state.completed.length}`;
  let testedReload = false;
  const visited = new Set();
  for (let action = 0; action < 150; action++) {
    await page.locator('main').ariaSnapshot();
    const state = await read();
    if (state.view === 'ending') {
      if (state.completed.length !== 11) throw new Error('Premature ending');
      await page.getByRole('heading', {name: /Выход/}).waitFor();
      await page.screenshot({path:'output/playwright/mobile-ending.png'});
      const documentResult = {rooms:state.completed.length,actions:action,reload:testedReload,visited:[...visited]};
      await page.evaluate(result => { document.documentElement.dataset.qaResult = JSON.stringify(result); }, documentResult);
      return;
    }
    visited.add(state.roomId);
    const previous = signature(state);
    if (state.stage === 'intro') {
      await page.locator('.lab-transition.active').waitFor({state:'detached'});
      await page.getByRole('button',{name:'Осмотреть предмет',exact:true}).click();
    } else if (state.stage === 'task') {
      const task=page.getByRole('region',{name:'Действие в комнате'});
      if (['pleasure','ritual','company'].includes(state.roomId)) {
        await task.locator('.qi-card').nth(0).click();
        await task.locator('.qi-card').nth(1).click();
      } else if (state.roomId === 'origin') {
        for (const name of ['Герой попробовал первую сигарету','Перекуры появились в расписании','Герой заметил повторяющийся маршрут']) await task.getByRole('button',{name,exact:true}).click();
      } else if (state.roomId === 'stress') {
        await task.getByRole('button',{name:'Сцена Б',exact:true}).click();
      } else if (state.roomId === 'loop') {
        await task.getByRole('button',{name:'Во время',exact:true}).click();
        await task.getByRole('button',{name:'После',exact:true}).click();
      } else if (state.roomId === 'tomorrow') {
        for (let i=0;i<3;i++) await task.getByRole('button',{name:'Перенести на завтра',exact:true}).click();
      } else if (state.roomId === 'world') {
        await task.getByRole('button',{name:'Красивый образ',exact:true}).click();
        await task.getByRole('button',{name:'Предупреждение',exact:true}).click();
      } else if (state.roomId === 'withdrawal') {
        await task.getByRole('button',{name:'Сильное желание',exact:true}).click();
        await task.getByRole('button',{name:'Разговор с близким',exact:true}).click();
      }
      await task.locator('.qi-primary').click();
    } else if (state.stage === 'steps') {
      // Choose the last offered answer, including disagreement and uncertainty.
      await page.locator('.answer-choices button').last().click();
    } else if (state.stage === 'reflection') {
      await page.locator('.room-panel .lab-primary').click();
    } else if (state.stage === 'doors') {
      const note=`Запись для ${state.roomId}: могу оставить вопрос открытым.`;
      await page.getByRole('textbox',{name:'Моя заметка о комнате'}).fill(note);
      if (!testedReload) {
        await page.reload();
        await page.getByRole('button',{name:'Продолжить путь',exact:true}).click();
        await page.locator('main').ariaSnapshot();
        if (await page.getByRole('textbox',{name:'Моя заметка о комнате'}).inputValue() !== note) throw new Error('Note lost on reload');
        testedReload = true;
      }
      if (state.completed.length === 11) await page.getByRole('button',{name:'Выйти из лабиринта',exact:true}).click();
      else await page.locator('.next-door').last().click();
    } else throw new Error(`Unexpected state ${previous}`);
    await page.waitForFunction(previous => {
      const state=JSON.parse(localStorage.getItem('zsw_labyrinth_v1'));
      return `${state.view}/${state.roomId}/${state.stage}/${state.stepIndex}/${state.completed.length}` !== previous;
    },previous,{timeout:10000});
  }
  throw new Error('Too many actions without ending');
}
