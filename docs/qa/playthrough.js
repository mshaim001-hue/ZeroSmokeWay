// Run against a disposable test browser with an active journey.
// Sends synthetic test messages to the configured guide API.
async (page) => {
  for (let action = 0; action < 40; action++) {
    await page.locator('main').ariaSnapshot();
    const finish = page.getByRole('button', {name:'Закончить разговор и открыть двери',exact:true});
    if (await finish.count()) {
      await page.locator('.lab-transition.active').waitFor({state:'detached'});
      await page.getByRole('textbox',{name:'Сообщение ведущему',exact:true}).fill('Тестовый пример: для меня важна возможность сделать паузу.');
      await page.getByRole('button',{name:'Отправить сообщение',exact:true}).click();
      await page.getByRole('status').waitFor({state:'detached',timeout:20000});
      await finish.click();
    } else if (await page.locator('.next-door').count()) {
      await page.getByRole('textbox',{name:'Моя заметка о комнате',exact:true}).fill('Тестовая заметка о разговоре.');
      await page.locator('.next-door').last().click();
    } else if (await page.getByRole('button',{name:'Выйти из лабиринта',exact:true}).count()) {
      await page.getByRole('button',{name:'Выйти из лабиринта',exact:true}).click();
      await page.getByRole('heading',{name:/Выход/}).waitFor();
      await page.screenshot({path:'output/playwright/dialogue-ending.png'});
      return;
    } else throw new Error('Start a disposable journey before running the walkthrough');
  }
  throw new Error('Route did not reach ending');
}
