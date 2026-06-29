/**
 * Reading text files in byte windows, safe to paginate. Byte-based (not line-based) so a giant
 * single-line file never loads whole, and **character-aligned**: `nextOffset` is the byte position
 * after the last COMPLETE UTF-8 character, so a window boundary never splits a multibyte char across
 * two reads. Binary (incl. UTF-16, which has NUL bytes) is rejected. Used by the `fs_read` tool.
 */
import * as fs from 'fs';
import { StringDecoder } from 'string_decoder';

/**
 * Pure: decode a UTF-8 byte window. The `StringDecoder` drops a trailing partial multibyte char (no
 * stray U+FFFD); `consumed` is how many bytes formed COMPLETE characters — i.e. where the next read
 * should resume so it starts on a character boundary.
 */
export function decodeUtf8Window(buf: Buffer): { text: string; consumed: number } {
  const text = new StringDecoder('utf8').write(buf);
  return { text, consumed: Buffer.byteLength(text, 'utf8') };
}

export interface ReadWindow { text: string; nextOffset: number; size: number; more: boolean }

/**
 * Reads up to `limit` bytes of `file` starting at byte `offset`, as UTF-8 text aligned to character
 * boundaries. Throws on binary (a NUL byte in the window). `nextOffset` is where to resume.
 */
export function readTextWindow(file: string, offset: number, limit: number): ReadWindow {
  const size = fs.statSync(file).size;
  const start = Math.max(0, Math.min(Math.floor(offset) || 0, size));
  // At least 4 bytes (the largest UTF-8 char) so a window always fits ≥1 char and can't stall.
  const toRead = Math.min(size - start, Math.max(4, limit));
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(toRead);
    const read = fs.readSync(fd, buf, 0, toRead, start); // may be < toRead; decode only what we got
    const slice = buf.subarray(0, read);
    if (slice.includes(0)) throw new Error('Binary file (contains NUL bytes) — not a text file.');
    const { text, consumed } = decodeUtf8Window(slice);
    const nextOffset = start + consumed;
    return { text, nextOffset, size, more: nextOffset < size };
  } finally {
    fs.closeSync(fd);
  }
}
