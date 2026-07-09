import './vscodeStub'; // must come first: stubs `vscode` for the modules pulled in below
import { test } from 'node:test';
import assert from 'node:assert';
import { summaryContextTokens } from '../summary';

// Regression for the "resumir doesn't work with a big (50k) context on Ollama" bug: the summary call
// must size num_ctx to fit the whole block, or Ollama truncates the input to its small default.
test('summaryContextTokens fits the block, with floor/ceiling and 256-step rounding', () => {
  // A small block → the 4096 floor.
  assert.equal(summaryContextTokens(100, 0), 4096);

  // A ~50k-token block fits the whole input + reply (+ headroom), rounded up to Ollama's 256 step.
  const big = summaryContextTokens(50000, 0);
  assert.ok(big >= 50000 + 1024 + 512, 'window fits the whole input + reply');
  assert.equal(big % 256, 0, 'rounded to the 256 step');
  assert.equal(big, Math.ceil((50000 + 1536) / 256) * 256);

  // The user's configured window acts as a floor.
  assert.equal(summaryContextTokens(100, 32768), 32768);

  // Capped at 128k even for an enormous block (the model still has to support it).
  assert.equal(summaryContextTokens(500000, 0), 131072);
});
