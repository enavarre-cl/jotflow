import './vscodeStub'; // must come first: importing ../mcpElicit pulls in `vscode` at module load
import { test } from 'node:test';
import assert from 'node:assert';
import { isConfirmation, confirmationAcceptContent } from '../mcpElicit';

test('isConfirmation: no fields is a confirmation', () => {
  assert.equal(isConfirmation(undefined), true);
  assert.equal(isConfirmation({ type: 'object' }), true);
  assert.equal(isConfirmation({ type: 'object', properties: {} }), true);
});

test('isConfirmation: a single boolean field is a confirmation', () => {
  assert.equal(isConfirmation({ properties: { ok: { type: 'boolean' } } }), true);
});

test('isConfirmation: requesting data is NOT a confirmation', () => {
  assert.equal(isConfirmation({ properties: { token: { type: 'string' } } }), false);
  assert.equal(isConfirmation({ properties: { env: { type: 'string', enum: ['a', 'b'] } } }), false);
  assert.equal(isConfirmation({ properties: { a: { type: 'boolean' }, b: { type: 'boolean' } } }), false);
});

test('confirmationAcceptContent: empty for no fields, { field: true } for a single boolean', () => {
  assert.deepEqual(confirmationAcceptContent(undefined), {});
  assert.deepEqual(confirmationAcceptContent({ properties: {} }), {});
  assert.deepEqual(confirmationAcceptContent({ properties: { proceed: { type: 'boolean' } } }), { proceed: true });
});
