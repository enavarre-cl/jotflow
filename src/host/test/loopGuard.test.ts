import { test } from 'node:test';
import assert from 'node:assert';
import { LoopGuard, DEFAULT_LOOP_GUARD } from '../providers/loopGuard';
import type { LoopHit } from '../providers/loopGuard';

/**
 * The runaway-repetition detector: the three rules (exact period, collapsed vocabulary, collapsed
 * alphabet) fire on the degenerate output some models fall into, report where the run starts (so
 * the caller can cut there), latch, and stay quiet on legitimate — even repetitive — text.
 */

/** Streams `text` in small chunks (as a backend would) and returns the first hit, if any. */
function stream(text: string, guard = new LoopGuard(), chunk = 7): LoopHit | undefined {
  for (let i = 0; i < text.length; i += chunk) {
    const hit = guard.push(text.slice(i, i + chunk));
    if (hit) return hit;
  }
  return undefined;
}

/** Deterministic pseudo-random picks (seeded LCG) so the "fuzzy" loops are never exactly periodic. */
function picker(seed: number): (n: number) => number {
  let s = seed >>> 0;
  // Use the HIGH bits: an LCG's low bits cycle with a tiny period (bit 0 alternates), which would
  // make the "fuzzy" text exactly periodic and trip the period rule instead of the one under test.
  return (n) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * n); };
}
function fuzzyLoop(vocab: string[], count: number, seed = 7): string {
  const pick = picker(seed);
  return Array.from({ length: count }, () => vocab[pick(vocab.length)]).join(' ');
}

// ── Detection ───────────────────────────────────────────────────────────────────────────────────
test('exact repetition of a short unit is a period hit that starts at the first repeat', () => {
  const prefix = 'Here is the answer.\n';
  const hit = stream(prefix + 'la '.repeat(300));

  assert.ok(hit, 'must detect');
  assert.equal(hit.rule, 'period');
  assert.equal(hit.start, prefix.length, 'the cut lands right after the legitimate text');
});

test('a whole sentence pasted over and over is a period hit', () => {
  const line = 'I need to check the file again before I answer this question. ';
  const hit = stream('Sure.\n' + line.repeat(12));

  assert.ok(hit);
  assert.equal(hit.rule, 'period');
  assert.equal(hit.start, 'Sure.\n'.length);
});

test('the fuzzy "la la l l laL" loop (never exactly periodic) is a tokens hit', () => {
  const prefix = 'The answer is 42.\n';
  const hit = stream(prefix + fuzzyLoop(['la', 'l', 'laL', 'lL'], 600));

  assert.ok(hit, 'must detect');
  assert.equal(hit.rule, 'tokens');
  assert.equal(hit.start, prefix.length, 'only the loop vocabulary is cut, not the sentence before it');
});

test('a no-space alphabet collapse ("lalallalala…") is a chars hit', () => {
  const pick = picker(3);
  const garbage = Array.from({ length: 1500 }, () => (pick(2) ? 'l' : 'a')).join('');
  const hit = stream('Result:\n' + garbage);

  assert.ok(hit, 'must detect');
  assert.equal(hit.rule, 'chars');
  assert.equal(hit.start, 'Result:\n'.length);
});

test('runaway whitespace is detected too', () => {
  const hit = stream('Done.' + '\n'.repeat(600));
  assert.ok(hit);
  assert.equal(hit.rule, 'period');
  assert.equal(hit.start, 'Done.'.length);
});

test('the hit latches: later pushes return the same hit', () => {
  const g = new LoopGuard();
  const first = stream('ab'.repeat(400), g);
  assert.ok(first);
  const later = g.push('more text that is perfectly fine');
  assert.deepEqual(later, first);
});

test('start/length are absolute offsets into the whole channel, past the retained tail', () => {
  const g = new LoopGuard();
  const long = Array.from({ length: 200 }, (_, i) => `Paragraph ${i} says something different each time.`).join('\n') + '\n';
  assert.equal(stream(long, g), undefined, 'legit prose first');
  const hit = stream('la '.repeat(300), g);
  assert.ok(hit);
  assert.equal(hit.start, long.length);
  assert.equal(hit.start + hit.length, g.length);
});

// ── No false positives ──────────────────────────────────────────────────────────────────────────
test('ordinary prose never trips the guard', () => {
  const prose = Array.from({ length: 80 }, (_, i) =>
    `Sentence number ${i} talks about topic ${(i * 7) % 13} in some detail, with a few different words each time.`).join(' ');
  assert.equal(stream(prose), undefined);
});

test('code with repeated lines (break; / return) is not a loop', () => {
  const code = Array.from({ length: 40 }, (_, i) =>
    `    case ${i}:\n      return handle${i}(value);\n      break;\n`).join('');
  assert.equal(stream(code), undefined);
});

test('markdown rules, table separators and short repeated units are fine', () => {
  const md = [
    '# Title', '='.repeat(120), '', '| a | b | c |', '|---|---|---|',
    ...Array.from({ length: 20 }, (_, i) => `| row ${i} | value ${i * 3} | ok |`),
    '', '-'.repeat(80), '', 'Closing paragraph with several words in it.',
  ].join('\n');
  assert.equal(stream(md), undefined);
});

test('a refrain repeated a few times is below the bar', () => {
  const song = Array.from({ length: 4 }, (_, i) => `Verse ${i}: something new happens here.\nLa la la, here we go again.\n`).join('');
  assert.equal(stream(song), undefined);
});

test('binary-ish dumps with a 4-char alphabet stay under the chars rule', () => {
  const pick = picker(11);
  const bits = Array.from({ length: 900 }, () => (pick(2) ? '1' : '0') + (pick(3) === 0 ? '\n' : ' ')).join('');
  const hit = stream(bits);
  assert.ok(!hit || hit.rule !== 'chars', 'four distinct chars (0 1 space newline) is not an alphabet collapse');
});

// ── Options ─────────────────────────────────────────────────────────────────────────────────────
test('thresholds are configurable', () => {
  const strict = new LoopGuard({ ...DEFAULT_LOOP_GUARD, minRun: 40, minRepeats: 4 });
  const hit = stream('x.\n' + 'yo '.repeat(20), strict);
  assert.ok(hit);
  assert.equal(hit.rule, 'period');
  assert.equal(hit.start, 3);
  assert.equal(stream('x.\n' + 'yo '.repeat(20)), undefined, 'the defaults need a much longer run');
});
