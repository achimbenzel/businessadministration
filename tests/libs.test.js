// Pure functions: Markdown subset, normalizers, file names, host check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseParagraphs, safeHref, stripInline } from '../src/lib/inline.js';
import { normalizeChapter, normalizeUrl, blockText } from '../server/schema.js';
import { str, num, isId } from '../server/schema/base.js';
import { sanitize } from '../server/files.js';
import { isAllowedHost } from '../server/http.js';

test('inline markdown → tokens', () => {
  assert.deepEqual(parseInline('a **b** c'), [{ t: 'text', v: 'a ' }, { t: 'b', children: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' c' }]);
  assert.deepEqual(parseInline('*i* und _j_').filter((t) => t.t === 'i').length, 2);
  assert.deepEqual(parseInline('==Merke=='), [{ t: 'mark', children: [{ t: 'text', v: 'Merke' }] }]);
  assert.deepEqual(parseInline('`x*y*z`'), [{ t: 'code', v: 'x*y*z' }]);
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ t: 'text', v: '2 * 3 * 4' }]); // not italics
  const link = parseInline('[HS](https://hs-mainz.de)')[0];
  assert.equal(link.t, 'link');
  assert.equal(link.href, 'https://hs-mainz.de');
  assert.equal(parseInline('siehe https://example.com/a.')[1].href, 'https://example.com/a');
});

test('links are only ever http(s) or mailto', () => {
  assert.deepEqual(parseInline('[x](javascript:alert(1))').map((t) => t.t), ['text']);
  assert.equal(safeHref('data:text/html,hi'), null);
  assert.equal(safeHref('www.hs-mainz.de'), 'https://www.hs-mainz.de');
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.equal(normalizeUrl('hs-mainz.de/x'), 'https://hs-mainz.de/x');
  assert.equal(normalizeUrl('HTTPS://A.de'), 'HTTPS://A.de');
});

test('paragraphs and lists', () => {
  assert.deepEqual(parseParagraphs('Eins\nzwei\n\n- a\n- b\n1. x\n2. y\nEnde'), [
    { type: 'p', text: 'Eins\nzwei' },
    { type: 'ul', items: ['a', 'b'] },
    { type: 'ol', items: ['x', 'y'] },
    { type: 'p', text: 'Ende' },
  ]);
  assert.equal(stripInline('**fett** und [Link](https://a.de)'), 'fett und Link');
});

test('normalizers fill defaults and clamp', () => {
  assert.equal(str(null), '');
  assert.equal(str('abc', 2), 'ab');
  assert.equal(num('x', 0, 10, 5), 5);
  assert.equal(num('99', 0, 10, 5), 10);
  assert.equal(isId(undefined), false);
  const c = normalizeChapter({});
  assert.ok(isId(c.id));
  assert.equal(c.title, 'Unbenanntes Kapitel');
  assert.equal(c.status, 'draft');
  assert.deepEqual(c.blocks, []);
  assert.equal(normalizeChapter({ status: 'secret' }).status, 'draft');
  assert.equal(blockText({ type: 'quiz', question: 'Q', options: [{ text: 'A' }], explanation: 'E' }), 'Q A E');
});

test('file names are made safe', () => {
  assert.equal(sanitize('../../etc/passwd'), 'passwd');
  assert.equal(sanitize('Übung Nr. 1 (Lösung).pdf'), 'Ubung-Nr.-1-Losung-.pdf');
  assert.equal(sanitize('Straße.png'), 'Strasse.png');
  assert.equal(sanitize('...'), 'datei');
  assert.equal(sanitize('a\\b\\c.txt'), 'c.txt');
});

test('host allowlist', () => {
  for (const h of ['localhost:4200', '127.0.0.1', '[::1]:4300', 'laptop', 'pc.local', 'x.tail9.ts.net']) assert.ok(isAllowedHost(h), h);
  for (const h of ['evil.com', 'lernen.example.de']) assert.equal(isAllowedHost(h), false, h);
});
