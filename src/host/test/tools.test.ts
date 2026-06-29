import './vscodeStub'; // must come first: importing ../tools pulls in `vscode` at module load
import { test } from 'node:test';
import assert from 'node:assert';
import { applyTextEdit } from '../tools';

test('applyTextEdit replaces the single occurrence', () => {
  const r = applyTextEdit('const a = 1;', 'a = 1', 'a = 2', false);
  assert.equal(r.text, 'const a = 2;');
  assert.equal(r.count, 1);
});

test('applyTextEdit replace_all replaces every occurrence', () => {
  const r = applyTextEdit('x x x', 'x', 'y', true);
  assert.equal(r.text, 'y y y');
  assert.equal(r.count, 3);
});

test('applyTextEdit treats $ in the replacement literally (no regex interpolation)', () => {
  const r = applyTextEdit('price: PLACEHOLDER', 'PLACEHOLDER', '$5 & $10', false);
  assert.equal(r.text, 'price: $5 & $10');
});

test('applyTextEdit throws when old_text is missing', () => {
  assert.throws(() => applyTextEdit('hello', 'world', 'x', false), /not found/);
});

test('applyTextEdit throws on an ambiguous match without replace_all', () => {
  assert.throws(() => applyTextEdit('a a', 'a', 'b', false), /appears 2 times/);
});

test('applyTextEdit throws on empty old_text', () => {
  assert.throws(() => applyTextEdit('hi', '', 'x', false), /empty/);
});
