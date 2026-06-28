import './vscodeStub'; // must come first: stubs `vscode` for the modules pulled in below
import { test } from 'node:test';
import assert from 'node:assert';
import { applyPatch } from '../applyPatch';
import { defaultDoc, parseDoc, serializeDoc, ChatDoc } from '../chatDocument';

const makeDoc = (): ChatDoc => defaultDoc({ provider: 'ollama', temperature: 0.7, maxTokens: 2048 });

test('applyPatch with null/undefined is a no-op', () => {
  const a = makeDoc();
  const before = JSON.stringify(a);
  applyPatch(a, null);
  applyPatch(a, undefined);
  applyPatch(a, 'not an object' as unknown as null);
  assert.equal(JSON.stringify(a), before);
});

test('applyPatch sets valid top-level string fields', () => {
  const doc = makeDoc();
  applyPatch(doc, { title: 'Hello', model: 'gpt-x', systemPrompt: 'be brief' });
  assert.equal(doc.title, 'Hello');
  assert.equal(doc.model, 'gpt-x');
  assert.equal(doc.systemPrompt, 'be brief');
});

test('applyPatch ignores invalid top-level field types', () => {
  const doc = makeDoc();
  const origTitle = doc.title;
  const origModel = doc.model;
  applyPatch(doc, { title: 123 as unknown as string, model: null as unknown as string });
  assert.equal(doc.title, origTitle);
  assert.equal(doc.model, origModel);
});

test('applyPatch accepts a valid provider and rejects an unknown one', () => {
  const doc = makeDoc();
  applyPatch(doc, { provider: 'anthropic' });
  assert.equal(doc.provider, 'anthropic');
  applyPatch(doc, { provider: 'definitely-not-a-provider' });
  assert.equal(doc.provider, 'anthropic'); // unchanged
});

test('applyPatch validates spellLang against the allowed set', () => {
  const doc = makeDoc();
  applyPatch(doc, { spellLang: 'es' });
  assert.equal(doc.spellLang, 'es');
  applyPatch(doc, { spellLang: 'auto' });
  assert.equal(doc.spellLang, 'auto');
  applyPatch(doc, { spellLang: 'xx' }); // not allowed
  assert.equal(doc.spellLang, 'auto'); // unchanged
});

test('applyPatch updates scalar params and ignores invalid ones', () => {
  const doc = makeDoc();
  applyPatch(doc, { params: { temperature: 0.9, thinking: true, tools: true, stop: ['END', 5, 'STOP'] } });
  assert.equal(doc.params.temperature, 0.9);
  assert.equal(doc.params.thinking, true);
  assert.equal(doc.params.tools, true);
  assert.deepEqual(doc.params.stop, ['END', 'STOP']); // non-strings filtered out

  applyPatch(doc, { params: { temperature: NaN } });
  assert.equal(doc.params.temperature, 0.9); // NaN rejected, unchanged
});

test('applyPatch updates toggle params (enabled + value)', () => {
  const doc = makeDoc();
  applyPatch(doc, { params: { maxTokens: { enabled: true, value: 512 } } });
  assert.equal(doc.params.maxTokens.enabled, true);
  assert.equal(doc.params.maxTokens.value, 512);

  // Partial / invalid toggle updates leave the other field intact.
  applyPatch(doc, { params: { maxTokens: { value: NaN } } });
  assert.equal(doc.params.maxTokens.enabled, true);
  assert.equal(doc.params.maxTokens.value, 512); // NaN rejected
  applyPatch(doc, { params: { maxTokens: { enabled: false } } });
  assert.equal(doc.params.maxTokens.enabled, false);
  assert.equal(doc.params.maxTokens.value, 512);
});

test('applyPatch updates ui panel visibility and validates booleans', () => {
  const doc = makeDoc();
  applyPatch(doc, { ui: { thinkOpen: false, toolsOpen: true } });
  assert.deepEqual(doc.ui, { thinkOpen: false, toolsOpen: true });

  // A partial patch leaves the other panel's state intact.
  applyPatch(doc, { ui: { thinkOpen: true } });
  assert.deepEqual(doc.ui, { thinkOpen: true, toolsOpen: true });

  // Non-boolean values are rejected (the JSON boundary is untrusted).
  applyPatch(doc, { ui: { thinkOpen: 'oops' as unknown as boolean } });
  assert.equal(doc.ui?.thinkOpen, true); // unchanged
});

test('parseDoc/serializeDoc round-trips ui and omits it when absent', () => {
  const defaults = { provider: 'ollama' as const, temperature: 0.7, maxTokens: 2048 };

  // Round-trip: a persisted ui survives parse → serialize → parse.
  const withUi = parseDoc(JSON.stringify({
    version: 2, provider: 'ollama', model: 'm', systemPrompt: '',
    ui: { thinkOpen: false, toolsOpen: true }, params: { temperature: 0.7 }, messages: [],
  }), defaults);
  assert.deepEqual(withUi.ui, { thinkOpen: false, toolsOpen: true });
  const reparsed = parseDoc(serializeDoc(withUi), defaults);
  assert.deepEqual(reparsed.ui, { thinkOpen: false, toolsOpen: true });

  // A doc without ui must not emit a "ui" key (chats predating the feature stay clean).
  const noUi = parseDoc(JSON.stringify({
    version: 2, provider: 'ollama', model: 'm', systemPrompt: '', params: { temperature: 0.7 }, messages: [],
  }), defaults);
  assert.equal(noUi.ui, undefined);
  assert.ok(!/"ui":/.test(serializeDoc(noUi)));

  // A corrupt ui (invalid value) keeps only the valid field.
  const partial = parseDoc(JSON.stringify({
    version: 2, provider: 'ollama', model: 'm', systemPrompt: '',
    ui: { thinkOpen: 'x', toolsOpen: true }, params: { temperature: 0.7 }, messages: [],
  }), defaults);
  assert.deepEqual(partial.ui, { toolsOpen: true });
});
