import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(web, 'index.html'), 'utf8');

test('homepage has a unique title, description, canonical and JSON-LD', () => {
  assert.match(html, /<title>ZeroSmokeWay — why you still smoke<\/title>/);
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /quit-smoking coach<\/title>/i);
});

test('GEO crawl files exist in public', () => {
  const pub = join(web, 'public');
  for (const name of ['robots.txt', 'sitemap.xml', 'llms.txt', 'about.html', 'og.jpg']) {
    assert.equal(existsSync(join(pub, name)), true, name);
  }
  const robots = readFileSync(join(pub, 'robots.txt'), 'utf8');
  assert.match(robots, /OAI-SearchBot/);
  assert.match(robots, /Sitemap:/);
  assert.doesNotMatch(robots, /Disallow: \//);
  const llms = readFileSync(join(pub, 'llms.txt'), 'utf8');
  assert.match(llms, /Not a quit-smoking coach/);
  const about = readFileSync(join(pub, 'about.html'), 'utf8');
  assert.match(about, /FAQPage/);
  assert.match(about, /<h1>/);
});
