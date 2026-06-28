import { test } from 'node:test';
import assert from 'node:assert';
import { CircuitBreaker } from '../circuitBreaker';

test('stays closed until threshold consecutive failures', () => {
  let now = 0;
  const cb = new CircuitBreaker(3, 1000, () => now);
  assert.equal(cb.open, false);
  cb.recordFailure();
  cb.recordFailure();
  assert.equal(cb.open, false, 'still closed after 2 of 3 failures');
  cb.recordFailure();
  assert.equal(cb.open, true, 'open on the 3rd consecutive failure');
});

test('opens for the cooldown window, then closes once it elapses', () => {
  let now = 0;
  const cb = new CircuitBreaker(2, 1000, () => now);
  cb.recordFailure();
  cb.recordFailure();
  assert.equal(cb.open, true);
  now = 999;
  assert.equal(cb.open, true, 'still open within the cooldown');
  now = 1000;
  assert.equal(cb.open, false, 'closed once the cooldown elapses');
});

test('a success resets the failure count', () => {
  let now = 0;
  const cb = new CircuitBreaker(2, 1000, () => now);
  cb.recordFailure();
  cb.recordSuccess();
  cb.recordFailure();
  assert.equal(cb.open, false, 'one failure after a reset is not enough to trip');
});

test('constructs with defaults and starts closed', () => {
  const cb = new CircuitBreaker();
  assert.equal(cb.open, false);
});
