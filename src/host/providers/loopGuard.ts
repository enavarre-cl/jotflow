/**
 * Degenerate-output detector for one streamed channel (answer, thinking, or tool arguments).
 *
 * Some models (small/quantized ones on OpenRouter, e.g. Gemma) fall into a loop and emit
 * `la la la la l la l l la laL …` until `max_tokens` — burning credits and, if the text is fed
 * back on the next turn, looping again. The guard watches the tail of the stream and reports a
 * hit as soon as the text degenerates, so the caller can cut the stream and drop the run.
 *
 * Pure (no vscode / no I/O) and unit-tested. Three complementary rules, all over the tail only:
 *
 * - **period** — an exact repeating unit of ≤ `maxPeriod` chars, repeated ≥ `minRepeats` times
 *   over ≥ `minRun` chars (`abcabcabc…`, a line/paragraph pasted over and over, `\n\n\n\n…`).
 * - **tokens** — the last `window` chars hold ≥ `minTokens` whitespace-separated tokens but only
 *   ≤ `maxDistinctTokens` distinct ones (case-folded): the fuzzy `la la l l laL la` loop that is
 *   never exactly periodic.
 * - **chars** — the last `window` chars use ≤ `maxDistinctChars` distinct characters
 *   (`lalalallalalalla…` with no spaces and no exact period).
 *
 * Thresholds are deliberately high so legitimate repetition (a `----` rule, a `}` line, a table
 * separator, a refrain) never trips them: a real run has to be hundreds of characters long.
 */

export type LoopRule = 'period' | 'tokens' | 'chars';

export interface LoopHit {
  rule: LoopRule;
  /** Offset (in the whole channel text) where the degenerate run starts — cut the text here. */
  start: number;
  /** Length of the run (chars) from `start` to the end of what was pushed. */
  length: number;
}

export interface LoopGuardOptions {
  /** Shortest periodic tail (chars) that counts as a loop. */
  minRun: number;
  /** Longest repeating unit considered by the period rule (chars). */
  maxPeriod: number;
  /** Times the unit must repeat back to back. */
  minRepeats: number;
  /** Tail window (chars) analysed by the vocabulary rules; both need a full window. */
  window: number;
  /** Minimum whitespace-separated tokens inside the window for the tokens rule. */
  minTokens: number;
  /** Maximum distinct (case-folded) tokens inside the window for the tokens rule. */
  maxDistinctTokens: number;
  /** Maximum distinct characters inside the window for the chars rule. */
  maxDistinctChars: number;
}

export const DEFAULT_LOOP_GUARD: LoopGuardOptions = {
  minRun: 400,
  maxPeriod: 200,
  minRepeats: 6,
  window: 800,
  minTokens: 80,
  maxDistinctTokens: 5,
  maxDistinctChars: 3,
};

/** Re-analyse only every this many pushed chars: deltas are tiny, and the rules read the tail anyway. */
const CHECK_EVERY = 16;

export class LoopGuard {
  private tail = '';
  private total = 0;
  private sinceCheck = 0;
  private hit: LoopHit | undefined;
  private readonly cap: number;

  constructor(private readonly o: LoopGuardOptions = DEFAULT_LOOP_GUARD) {
    // Keep enough tail to hold the longest run any rule needs, with room to locate its start.
    this.cap = 2 * Math.max(o.minRun, o.maxPeriod * o.minRepeats, o.window);
  }

  /** Total chars pushed so far. */
  get length(): number { return this.total; }

  /**
   * Feeds a stream delta. Returns the hit once the text degenerates; latches, so every later push
   * returns the same hit (the caller is expected to stop pushing anyway).
   */
  push(delta: string): LoopHit | undefined {
    if (this.hit) return this.hit;
    if (!delta) return undefined;
    this.total += delta.length;
    this.tail = (this.tail + delta).slice(-this.cap);
    this.sinceCheck += delta.length;
    if (this.sinceCheck < CHECK_EVERY) return undefined;
    this.sinceCheck = 0;
    this.hit = this.periodic() ?? this.collapsedTokens() ?? this.collapsedChars();
    return this.hit;
  }

  private mkHit(rule: LoopRule, runLength: number): LoopHit {
    return { rule, start: this.total - runLength, length: runLength };
  }

  /** Smallest period p whose repetition covers a long enough suffix of the tail. */
  private periodic(): LoopHit | undefined {
    const T = this.tail;
    const L = T.length;
    if (L < this.o.minRun) return undefined;
    for (let p = 1; p <= this.o.maxPeriod && p * this.o.minRepeats <= L; p++) {
      // Count trailing positions that echo the char one period back; the run is those + the unit.
      let i = L - 1;
      while (i - p >= 0 && T.charCodeAt(i) === T.charCodeAt(i - p)) i--;
      const run = (L - 1 - i) + p;
      if (run >= this.o.minRun && run >= p * this.o.minRepeats) return this.mkHit('period', run);
    }
    return undefined;
  }

  /** Window full of tokens drawn from a tiny vocabulary. */
  private collapsedTokens(): LoopHit | undefined {
    const w = this.window();
    if (!w) return undefined;
    const toks = w.split(/\s+/).filter(Boolean);
    if (toks.length < this.o.minTokens) return undefined;
    const vocab = new Set(toks.map((t) => t.toLowerCase()));
    if (vocab.size > this.o.maxDistinctTokens) return undefined;
    // The run is the longest suffix of the tail made only of those tokens (and whitespace), so a
    // legitimate sentence right before the loop is not cut with it.
    let start = this.tail.length;
    for (const m of [...this.tail.matchAll(/\S+/g)].reverse()) {
      if (!vocab.has(m[0].toLowerCase())) break;
      start = m.index ?? start;
    }
    return this.mkHit('tokens', this.tail.length - start);
  }

  /** Window written with only a handful of distinct characters. */
  private collapsedChars(): LoopHit | undefined {
    const w = this.window();
    if (!w) return undefined;
    const chars = new Set<string>();
    for (let i = 0; i < w.length; i++) { // code units, like the tail[] walk below
      chars.add(w[i]);
      if (chars.size > this.o.maxDistinctChars) return undefined;
    }
    let start = this.tail.length;
    while (start > 0 && chars.has(this.tail[start - 1])) start--;
    return this.mkHit('chars', this.tail.length - start);
  }

  /** The last `window` chars, or '' until a full window has been seen. */
  private window(): string {
    return this.tail.length < this.o.window ? '' : this.tail.slice(-this.o.window);
  }
}
