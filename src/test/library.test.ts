import './vscodeStub'; // must come first: library.ts pulls in ../http, which imports `vscode`
import { test } from 'node:test';
import assert from 'node:assert';
import {
  parseSize, parsePulls, decodeEntities, parseSearchHtml, parseTagsHtml, dedupeTags,
} from '../ollama/library';

// --- numeric/text helpers ---
test('parseSize converts human sizes to bytes (decimal units)', () => {
  assert.strictEqual(parseSize('4.7GB'), 4_700_000_000);
  assert.strictEqual(parseSize('398MB'), 398_000_000);
  assert.strictEqual(parseSize('20GB'), 20_000_000_000);
  assert.strictEqual(parseSize('512KB'), 512_000);
  assert.strictEqual(parseSize('nonsense'), 0);
});

test('parsePulls expands K/M/B suffixes', () => {
  assert.strictEqual(parsePulls('33.3M'), 33_300_000);
  assert.strictEqual(parsePulls('569.4K'), 569_400);
  assert.strictEqual(parsePulls('1234'), 1234);
  assert.strictEqual(parsePulls('1.2B'), 1_200_000_000);
});

test('decodeEntities decodes the common HTML entities', () => {
  assert.strictEqual(decodeEntities('Alibaba&#39;s models'), "Alibaba's models");
  assert.strictEqual(decodeEntities('a &amp; b &lt;c&gt;'), 'a & b <c>');
});

// --- search HTML ---
const SEARCH_HTML = `
<ul role="list">
<li x-test-model class="flex">
  <a href="/library/qwen3" class="group w-full">
    <div class="flex flex-col mb-1" title="qwen3">
      <h2><span x-test-search-response-title>qwen3</span></h2>
      <p class="max-w-lg break-words text-neutral-800 text-md">Qwen3 is Alibaba&#39;s family.</p>
    </div>
    <span x-test-capability class="x">vision</span>
    <span x-test-capability class="x">tools</span>
    <span x-test-capability class="x">thinking</span>
    <span x-test-size class="x">8b</span>
    <span x-test-pull-count>31.3M</span>
  </a>
</li>
<li x-test-model class="flex">
  <a href="/library/gemma3" class="group w-full">
    <div class="flex flex-col mb-1" title="gemma3">
      <h2><span x-test-search-response-title>gemma3</span></h2>
      <p class="max-w-lg break-words text-neutral-800 text-md">Gemma 3 models.</p>
    </div>
    <span x-test-pull-count>5M</span>
  </a>
</li>
</ul>`;

test('parseSearchHtml extracts name, description, capabilities and pulls', () => {
  const out = parseSearchHtml(SEARCH_HTML);
  assert.strictEqual(out.length, 2);
  assert.deepStrictEqual(out[0], {
    name: 'qwen3',
    description: "Qwen3 is Alibaba's family.",
    capabilities: ['vision', 'tools', 'thinking'],
    pulls: 31_300_000,
  });
  assert.deepStrictEqual(out[1], {
    name: 'gemma3', description: 'Gemma 3 models.', capabilities: [], pulls: 5_000_000,
  });
});

test('parseSearchHtml returns nothing for HTML without result rows', () => {
  assert.deepStrictEqual(parseSearchHtml('<html><body>no models</body></html>'), []);
});

// --- tags HTML (mirrors the mobile row: href → font-mono digest → • size •) ---
const TAGS_HTML = `
<a href="/library/qwen2.5:latest" class="md:hidden flex">
  <span class="font-mono">
    845dbda0ea48</span> • 4.7GB • 32K context window
<a href="/library/qwen2.5:7b" class="md:hidden flex">
  <span class="font-mono">
    845dbda0ea48</span> • 4.7GB • 32K context window
<a href="/library/qwen2.5:0.5b" class="md:hidden flex">
  <span class="font-mono">
    a8b0c5157701</span> • 398MB • 32K context window`;

test('parseTagsHtml extracts every tag/digest/size tuple', () => {
  const tags = parseTagsHtml(TAGS_HTML);
  assert.strictEqual(tags.length, 3);
  assert.deepStrictEqual(tags[0], { tag: 'latest', digest: '845dbda0ea48', bytes: 4_700_000_000 });
  assert.deepStrictEqual(tags[2], { tag: '0.5b', digest: 'a8b0c5157701', bytes: 398_000_000 });
});

test('dedupeTags collapses aliases by digest, prefers a specific tag over latest, sorts by size', () => {
  const out = dedupeTags(parseTagsHtml(TAGS_HTML));
  assert.strictEqual(out.length, 2);
  // sorted ascending by size → 0.5b first, then the 845… digest (latest/7b alias)
  assert.strictEqual(out[0].tag, '0.5b');
  assert.strictEqual(out[1].tag, '7b'); // 'latest' dropped in favour of the explicit '7b'
});
