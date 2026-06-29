import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { decodeUtf8Window, readTextWindow } from '../fsRead';

test('decodeUtf8Window drops a trailing partial multibyte char (no U+FFFD)', () => {
  const full = Buffer.from('a€', 'utf8'); // 'a' (1B) + '€' (E2 82 AC, 3B) = 4 bytes
  const cut = full.subarray(0, 3);        // 'a' + E2 82 — '€' missing its last byte
  const r = decodeUtf8Window(cut);
  assert.equal(r.text, 'a');              // the partial '€' is dropped
  assert.ok(!r.text.includes('�'));
  assert.equal(r.consumed, 1);            // resume at byte 1, the start of '€'
});

test('decodeUtf8Window on a clean boundary consumes everything', () => {
  const buf = Buffer.from('a€', 'utf8');
  const r = decodeUtf8Window(buf);
  assert.equal(r.text, 'a€');
  assert.equal(r.consumed, 4);
});

test('readTextWindow paginates multibyte text without splitting a char or losing data', () => {
  const file = path.join(os.tmpdir(), `jf-fsread-${process.pid}.txt`);
  const content = 'café €uro ☕ ñandú '.repeat(40); // lots of 2/3-byte chars
  fs.writeFileSync(file, content, 'utf8');
  try {
    let offset = 0;
    let out = '';
    for (let i = 0; i < 1000; i++) {
      const w = readTextWindow(file, offset, 7); // tiny 7-byte windows land mid-char on purpose
      assert.ok(!w.text.includes('�'), `replacement char at offset ${offset}`);
      out += w.text;
      if (!w.more) break;
      assert.ok(w.nextOffset > offset, 'must advance (no stall)');
      offset = w.nextOffset;
    }
    assert.equal(out, content); // reassembled byte-for-byte across all windows
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('readTextWindow rejects binary (a NUL byte)', () => {
  const file = path.join(os.tmpdir(), `jf-fsread-bin-${process.pid}.bin`);
  fs.writeFileSync(file, Buffer.from([0x41, 0x00, 0x42]));
  try {
    assert.throws(() => readTextWindow(file, 0, 1000), /Binary/);
  } finally {
    fs.rmSync(file, { force: true });
  }
});
