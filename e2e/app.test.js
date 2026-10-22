// Browser tests against the production build (run `npm run build` first):
// login gate, viewer on the phone, admin editing on the desktop. Every page
// must load without script errors, console errors (e.g. CSP) or sideways scrolling.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, ROOT, PASSWORDS } from '../tests/helpers.js';

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1366, height: 860 } };

let srv; let browser; let admin;
const problems = [];

before(async () => {
  if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) throw new Error('No build found — run `npm run build` first.');
  srv = await startServer({ env: { NODE_ENV: 'production' } });
  admin = await srv.login('admin');
  browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
});
after(async () => {
  await browser?.close();
  await srv?.stop();
});

// allow401: a wrong password is answered with 401, which the browser logs as a
// failed request — expected in the login test, a problem anywhere else.
async function open(device, { allow401 = false } = {}) {
  const ctx = await browser.newContext(device);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (allow401 && /status of 401/.test(m.text())) return;
    problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  return { ctx, page };
}

async function login(page, username, password) {
  await page.goto(`${srv.base}/`);
  await page.fill('input[name=username]', username);
  await page.fill('input[name=password]', password);
  await page.click('button[type=submit]');
  await page.waitForSelector('.sidebar');
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Poll the API (node side) until `check` passes. */
async function until(fn, check, ms = 5000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (check(last)) return last;
    await new Promise((r) => setTimeout(r, 150));
  }
  assert.fail(`condition not met; last value: ${JSON.stringify(last).slice(0, 300)}`);
}

test('nothing but the login without a session', async () => {
  const { ctx, page } = await open(PHONE, { allow401: true });
  await page.goto(`${srv.base}/fach/kosten-leistungsrechnung`);
  await page.waitForSelector('.login-card');
  assert.equal(await page.locator('.sidebar').count(), 0);
  await page.fill('input[name=username]', 'User');
  await page.fill('input[name=password]', 'falsch');
  await page.click('button[type=submit]');
  await page.waitForSelector('.login-error');
  assert.match(await page.textContent('.login-error'), /falsch/);
  // The right password lands on the page that was asked for.
  await page.fill('input[name=password]', PASSWORDS.user);
  await page.click('button[type=submit]');
  await page.waitForSelector('.subject-head');
  assert.match(await page.textContent('h1'), /Kosten- & Leistungsrechnung/);
  await ctx.close();
});

test('viewer on the phone: semester, subjects, no editing', async () => {
  const { ctx, page } = await open(PHONE);
  await login(page, 'User', PASSWORDS.user);
  await page.waitForSelector('.subj-card');
  assert.equal(await page.locator('.subj-card').count(), 5);
  assert.ok(await sideways(page) <= 1, 'start page scrolls sideways');

  // Drawer navigation.
  await page.click('button[aria-label="Menü öffnen"]');
  await page.click('.sidebar >> text=Grundlagen der BWL');
  await page.waitForSelector('.subject-head');
  assert.equal(await page.locator('button:has-text("Kapitel")').count(), 0, 'viewer sees no "new chapter" button');
  assert.ok(await sideways(page) <= 1, 'subject page scrolls sideways');

  await page.goto(`${srv.base}/papierkorb`);
  await page.waitForSelector('text=Nur für Admins');
  await page.goto(`${srv.base}/semester/semester-1`);
  await page.waitForSelector('.subj-card');
  assert.equal(await page.locator('button:has-text("Fach")').count(), 0);
  await ctx.close();
});

test('admin on the desktop: create a chapter, add blocks, publish', async () => {
  const { ctx, page } = await open(DESKTOP);
  await login(page, 'Admin', PASSWORDS.admin);
  await page.click('.sidebar >> text=Kosten- & Leistungsrechnung');
  await page.waitForSelector('.subject-head');
  await page.click('button:has-text("Kapitel")');
  await page.fill('#chapter-form input', 'Teilkostenrechnung');
  await page.click('.modal-foot button:has-text("Anlegen")');
  await page.waitForSelector('.editor');
  const id = new URL(page.url()).pathname.split('/').pop();

  await page.fill('.ed-type-text textarea', 'Die **Deckungsbeitragsrechnung** trennt fixe und variable Kosten.');
  await page.click('button:has-text("Baustein hinzufügen")');
  await page.fill('.picker-search input', 'defin');
  await page.keyboard.press('Enter');
  await page.fill('.ed-term', 'Deckungsbeitrag');
  await page.fill('.ed-type-definition textarea', 'Erlös minus variable Kosten.');

  // "/" in an empty text block opens the menu and replaces the block.
  await page.click('button:has-text("Baustein hinzufügen")');
  await page.click('.picker-item:has-text("Text")');
  await page.locator('.ed-type-text textarea').last().fill('/');
  await page.waitForSelector('.picker-grid');
  await page.click('.picker-item:has-text("Karteikarte")');
  await page.locator('.ed-type-flashcard textarea').first().fill('Was ist der DB?');
  await page.locator('.ed-type-flashcard textarea').last().fill('Erlös − variable Kosten');

  await page.waitForSelector('.save-state.ok');
  await page.click('.status-btn');
  const saved = await until(() => admin(`/api/chapters/${id}`), (r) => r.data?.chapter?.status === 'published' && r.data.chapter.blocks.length === 3);
  assert.deepEqual(saved.data.chapter.blocks.map((b) => b.type), ['text', 'definition', 'flashcard']);
  assert.equal(saved.data.chapter.blocks[1].term, 'Deckungsbeitrag');
  assert.equal(saved.data.chapter.blocks[2].back, 'Erlös − variable Kosten');

  // Read mode renders the Markdown.
  await page.click('button[role=tab]:has-text("Ansehen")');
  await page.waitForSelector('.blocks strong:has-text("Deckungsbeitragsrechnung")');
  assert.ok(await sideways(page) <= 1);
  await ctx.close();
});

test('viewer on the phone: read, quiz, flashcards, search', async () => {
  const c = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'grundlagen-bwl', title: 'Ökonomisches Prinzip' } })).data.chapter;
  await admin(`/api/chapters/${c.id}`, {
    method: 'PATCH',
    json: {
      status: 'published',
      blocks: [
        { type: 'callout', variant: 'important', text: 'Maximal- und Minimalprinzip unterscheiden.' },
        { type: 'quiz', question: 'Gegebener Input, maximaler Output?', options: [{ text: 'Maximalprinzip', correct: true }, { text: 'Minimalprinzip', correct: false }] },
        { type: 'flashcard', front: 'Minimalprinzip?', back: 'Gegebener Output mit minimalem Input.' },
        { type: 'table', rows: [['Prinzip', 'Vorgabe', 'Ziel'], ['Maximal', 'Input', 'Output max.'], ['Minimal', 'Output', 'Input min.']] },
      ],
    },
  });
  const { ctx, page } = await open(PHONE);
  await login(page, 'User', PASSWORDS.user);
  await page.goto(`${srv.base}/kapitel/${c.id}`);
  await page.waitForSelector('.blocks');
  assert.equal(await page.locator('.admin-bar').count(), 0, 'no admin bar for viewers');
  await page.click('.blk-quiz-opt:has-text("Maximalprinzip")');
  await page.click('button:has-text("Antwort prüfen")');
  await page.waitForSelector('.blk-quiz-result.right');
  await page.click('.blk-card');
  await page.waitForSelector('.blk-card.flipped');
  await page.click('button:has-text("Als gelernt markieren")');
  await page.waitForSelector('.learned-btn.on');
  assert.ok(await sideways(page) <= 1, 'chapter page scrolls sideways (table must scroll inside its box)');

  await page.goto(`${srv.base}/fach/grundlagen-bwl/karteikarten`);
  await page.waitForSelector('.study-card');
  await page.click('.study-card');
  await page.click('.study-btn.ok');
  await page.waitForSelector('.study-done');

  await page.click('button[aria-label="Suchen"]');
  await page.fill('.search-input', 'minimalprinzip');
  await page.waitForSelector('.search-hit');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/kapitel\//);
  await ctx.close();
});

test('interactive demos: sliders move the curves and the numbers', async () => {
  const c = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'economical-framework', title: 'Demos' } })).data.chapter;
  await admin(`/api/chapters/${c.id}`, {
    method: 'PATCH',
    json: { status: 'published', lang: 'en', blocks: [
      { type: 'supplyDemand', a: 100, b: 2, c: -20, d: 4 },
      { type: 'consumerChoice', m: 100, p1: 2, p2: 5, alpha: 0.5 },
    ] },
  });
  const { ctx, page } = await open(PHONE);
  await login(page, 'User', PASSWORDS.user);
  await page.goto(`${srv.base}/kapitel/${c.id}`);
  await page.waitForSelector('.demo svg');
  const [market, choice] = [page.locator('.demo').nth(0), page.locator('.demo').nth(1)];
  const readout = (demo, label) => demo.locator('.demo-readout', { hasText: label }).first().locator('strong').textContent();
  assert.equal(await readout(market, 'P*'), '20');
  assert.equal(await readout(market, 'Consumer surplus'), '900');
  await market.locator('input[type=range]').nth(0).fill('140'); // a: demand at P = 0
  assert.equal(await readout(market, 'P*'), '26.67');
  assert.equal(await market.locator('.demo-base').count(), 2, 'starting curves stay visible, dashed');
  await market.locator('button', { hasText: 'Reset' }).click();
  assert.equal(await readout(market, 'P*'), '20');
  await market.locator('button', { hasText: 'Price ceiling' }).click();
  await market.locator('input[type=range]').last().fill('15');
  assert.equal(await readout(market, 'Shortage'), '30');
  assert.equal(await readout(market, 'Quantity traded'), '40');

  assert.equal(await readout(choice, 'x₁*'), '25');
  await choice.locator('input[type=range]').nth(1).fill('4'); // p₁
  assert.equal(await readout(choice, 'x₁*'), '12.5');
  assert.equal(await readout(choice, 'x₂*'), '10');
  assert.ok(await sideways(page) <= 1, 'demo page scrolls sideways');
  await ctx.close();
});

test('no script errors, console errors or CSP violations on any page', () => {
  assert.deepEqual(problems, []);
});
