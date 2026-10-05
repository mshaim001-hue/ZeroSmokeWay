/**
 * Core-path smoke test. Default: canvas gestures; PLAY_MODE=buttons: accessibility controls.
 * Run with npm run qa:core while the local app is running.
 * Run: npx playwright test is not used — plain node + playwright.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'docs/qa/playthrough-run');
const BASE = process.env.PLAY_URL || 'http://127.0.0.1:5173/';
const GESTURES = process.env.PLAY_MODE !== 'buttons';
const notes = [];
const issues = [];

function log(step, detail = '') {
  const line = detail ? `${step}: ${detail}` : step;
  notes.push(line);
  console.log('•', line);
}
function issue(msg) {
  issues.push(msg);
  console.warn('! ', msg);
}

async function shot(page, name) {
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, `${String(notes.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function visibleText(page) {
  return page.locator('main').innerText();
}

async function clickIf(page, role, name, opts = {}) {
  const btn = page.getByRole(role, { name, ...opts });
  if (await btn.count() === 0) {
    issue(`Button not found: ${role} "${name}"`);
    return false;
  }
  await btn.first().click({ timeout: 8000 });
  return true;
}

async function completeNote(page, text) {
  const write = page.getByRole('button', { name: /Написать свою мысль|Написать иначе/ });
  if (await write.count()) await write.first().click();
  const area = page.locator('textarea').filter({ has: page.locator('xpath=ancestor::label[contains(., "Моя запись")]') });
  const box = (await area.count()) ? area.first() : page.locator('.quest-note textarea, label.quest-field textarea').last();
  await box.fill(text);
  const save = page.getByRole('button', { name: /Сохранить и открыть проход|Выйти из лабиринта/ });
  if (await save.isDisabled()) {
    issue(`Save still disabled after note: "${text}"`);
    await shot(page, 'save-disabled');
    return false;
  }
  await save.click();
  return true;
}

async function openDoorByLabel(page, label) {
  // Prefer list buttons under doors; map canvas is harder.
  const door = page.locator('button.quest-door').filter({ hasText: label });
  if (await door.count()) {
    await door.first().click();
    return true;
  }
  // Fallback: any button containing door title
  const any = page.getByRole('button', { name: new RegExp(label) });
  if (await any.count()) {
    await any.first().click();
    return true;
  }
  issue(`Door not found: ${label}`);
  return false;
}

async function ensureScene(page) {
  const sceneTab = page.getByRole('button', { name: /^Комната/ });
  if (await sceneTab.count()) await sceneTab.click();
}

async function canvasPoint(page, x, y) {
  const canvas = page.locator('.quest-room-canvas canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Scene canvas is not visible');
  return { x: box.x + box.width*x, y: box.y + box.height*y, width:box.width };
}
async function canvasDrag(page, fromX, fromY, toX, toY) {
  const from = await canvasPoint(page, fromX, fromY);
  const to = await canvasPoint(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, {steps:20});
  await page.mouse.up();
}
async function canvasTap(page,x,y) {
  const p = await canvasPoint(page,x,y); await page.mouse.click(p.x,p.y);
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (err) => issue(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') issue(`console.error: ${msg.text()}`);
  });

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    log('Home loaded', BASE);
    await shot(page, 'home');

    const homeText = await visibleText(page);
    if (!/Порог, четыре главные|Войти|Что держит/.test(homeText)) {
      issue('Home copy does not mention core path / enter');
    }
    if (/Десять дверей/.test(homeText)) issue('Home still says ten doors');

    await clickIf(page, 'button', /Войти/);
    await page.waitForTimeout(400);
    log('Entered doors / reason screen');
    await shot(page, 'reason');

    await clickIf(page, 'button', /Сигареты с кофе или после еды/);
    await page.waitForTimeout(600);
    await ensureScene(page);
    log('Entry room', (await page.locator('h1').first().innerText().catch(() => '')) || '');
    await shot(page, 'entry');

    // Entry: keep two things via HTML buttons
    if (GESTURES) {
      const p = await canvasPoint(page,.5,.34);
      const slot = Math.min(p.width*.28,110)/p.width;
      await canvasDrag(page,.5-slot,.34,.5-slot,.76);
      await canvasDrag(page,.5-slot/2,.34,.5-slot/2,.76);
    } else for (const label of ['Удовольствие', 'Поддержка']) {
      const btn = page.locator('button').filter({ hasText: label }).first();
      if (await btn.count()) await btn.click();
      else issue(`Entry object button missing: ${label}`);
    }
    await page.waitForTimeout(300);
    if (!(await completeNote(page, 'Мне важна пауза с кофе, не только сигарета'))) {
      throw new Error('Could not complete entry');
    }
    log('Completed entry');
    await page.waitForTimeout(500);
    await shot(page, 'after-entry');

    const doorsText = await visibleText(page);
    if (!/ГЛАВНЫХ|главн/i.test(doorsText)) issue('Doors screen missing core progress copy');
    if (/\/ 10/.test(doorsText) && !/\/ 4/.test(doorsText)) issue('Still showing /10 progress');

    const coreDoors = [
      { match: /Без сигареты уже не то|Кофе остывает/, room: 'pleasure', setup: async () => {
        if (GESTURES) { await canvasDrag(page,.5,.38,.5,.78); return; }
        // Remove cigarette from table
        const cig = page.locator('button').filter({ hasText: 'Сигарета' }).first();
        if (await cig.count()) await cig.click();
        else issue('Pleasure cigarette button missing');
      }, note: 'Кофе и пауза остаются без сигареты' },
      { match: /Как я буду справляться|Тихая комната/, room: 'stress', setup: async () => {
        if (GESTURES) {
          await canvasTap(page,.5,.72); await canvasTap(page,.81,.72);
          const p=await canvasPoint(page,.5,.32); await page.mouse.move(p.x,p.y); await page.mouse.down();
          await page.waitForTimeout(2200); await page.mouse.up(); return;
        }
        for (const label of ['Передышка', 'Сигарета']) {
          const btn = page.locator('button').filter({ hasText: label }).first();
          if (await btn.count()) await btn.click();
        }
        const hold = page.getByRole('button', { name: /Остановить шум/ });
        if (await hold.count()) await hold.click();
        else issue('Stress hold fallback button missing');
      }, note: 'Шум утих, вопрос о сигарете остался' },
      { match: /Почему снова хочется|Ещё одна/, room: 'loop', setup: async () => {
        if (GESTURES) {
          const box=await page.locator('.quest-room-canvas canvas').boundingBox();
          const radius=Math.min(box.width*.2,box.height*.17);
          for(let i=0;i<3;i++){const angle=-Math.PI/2+i*Math.PI*2/3; await canvasTap(page,.5+Math.cos(angle)*radius/box.width,.3+Math.sin(angle)*radius/box.height);}
          await canvasDrag(page,.5,.3,.85,.3); return;
        }
        for (const label of ['Хочется', 'Легче', 'Снова']) {
          const btn = page.locator('button').filter({ hasText: label }).first();
          if (await btn.count()) await btn.click();
        }
        const tear = page.getByRole('button', { name: /Разомкнуть круг/ });
        if (await tear.count()) await tear.click();
        else issue('Loop tear fallback missing');
      }, note: 'Петля видна, я с ней спорю' },
      { match: /Откуда взялись эти обещания|Красивая пачка/, room: 'world', setup: async () => {
        if (GESTURES) {
          for(const x of [.19,.5,.81])await canvasTap(page,x,.72);
          for(let i=0;i<3;i++)await canvasDrag(page,.5,.3,.85,.3); return;
        }
        for (const label of ['Образ', 'Чужие слова', 'Предупреждения']) {
          const btn = page.locator('button').filter({ hasText: label }).first();
          if (await btn.count()) await btn.click();
        }
        for (let i = 0; i < 3; i++) {
          const swipe = page.getByRole('button', { name: /Снять следующий слой/ });
          if (await swipe.count()) await swipe.click();
          await page.waitForTimeout(150);
        }
      }, note: 'Под упаковкой мой собственный вопрос' },
    ];

    for (const step of coreDoors) {
      const opened = await openDoorByLabel(page, step.match);
      if (!opened) throw new Error(`Cannot open core door ${step.room}`);
      await page.waitForTimeout(500);
      await ensureScene(page);
      const title = await page.locator('h1').first().innerText().catch(() => step.room);
      if (!step.match.test(title)) throw new Error(`Wrong room: expected ${step.room}, got ${title}`);
      log(`Opened ${step.room}`, title);
      await shot(page, step.room);

      // Chat should not be required; opening visible in scene
      const scene = await visibleText(page);
      if (!/Поговорить|Комната|Что взять/.test(scene)) issue(`${step.room}: scene chrome missing`);

      // Optional: open talk once in pleasure to check seeding
      if (step.room === 'pleasure') {
        const talk = page.getByRole('button', { name: /Открыть разговор|Разговор|Поговорить/ }).first();
        if (await talk.count()) {
          await talk.click();
          await page.waitForTimeout(400);
          const chat = await visibleText(page);
          if (!/После «Что держит»|пауза|кофе|приятн/i.test(chat)) {
            issue('Talk after entry did not echo previous note or opening');
          } else log('Talk echo ok');
          await shot(page, 'pleasure-talk');
          await ensureScene(page);
        }
      }

      await step.setup();
      await page.waitForTimeout(350);
      if (!(await completeNote(page, step.note))) throw new Error(`Could not complete ${step.room}`);
      log(`Completed ${step.room}`);
      await page.waitForTimeout(500);
      await shot(page, `after-${step.room}`);
    }

    const afterCore = await visibleText(page);
    if (!/Выход открыт|Свобода|выход открыт/i.test(afterCore)) {
      issue('Freedom not clearly available after four core rooms');
    } else log('Freedom available');

    // Side door still listed
    if (await page.locator('button.quest-door-side, button.quest-door').filter({ hasText: /ЕЩЁ|праздник|ритуал|Сколько/i }).count()) {
      log('Side doors still visible');
    } else {
      issue('No obvious side-door markers after core path');
    }

    if (!(await openDoorByLabel(page, /Свобода|Выход/))) throw new Error('Cannot open freedom');
    await page.waitForTimeout(500);
    await ensureScene(page);
    for (const label of ['Что оставить', 'Что отпустить', 'Следующий шаг']) {
      const btn = page.locator('button').filter({ hasText: label }).first();
      if (await btn.count()) await btn.click();
    }
    const openExit = page.getByRole('button', { name: /Открыть выход/ });
    if (await openExit.count()) await openExit.click();
    await completeNote(page, 'Хочу попробовать жить без сигарет');
    await page.waitForTimeout(600);
    const ending = await visibleText(page);
    if (!/Дверь открыта|ЛАБИРИНТ ПРОЙДЕН|Скачать/i.test(ending)) issue('Ending screen not reached');
    else log('Ending reached');
    await shot(page, 'ending');

  } finally {
    const report = [
      `# Core path: ${GESTURES?'canvas gestures':'accessibility buttons'}`,
      GESTURES?'Canvas drags, hold and swipes exercised.':'Canvas gestures are not covered by this mode.',
      '',
      `URL: ${BASE}`,
      `Time: ${new Date().toISOString()}`,
      '',
      '## Steps',
      ...notes.map((n) => `- ${n}`),
      '',
      '## Issues',
      ...(issues.length ? issues.map((i) => `- ${i}`) : ['- none']),
      '',
    ].join('\n');
    writeFileSync(join(OUT, 'report.md'), report);
    await browser.close();
  }

  console.log('\n=== REPORT ===');
  console.log(issues.length ? `Issues: ${issues.length}` : 'No issues found');
  for (const i of issues) console.log('-', i);
  if (issues.length) process.exitCode = 2;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
