import './vscodeStub'; // must come first: stubs `vscode` for inference.ts and its imports
import { test } from 'node:test';
import assert from 'node:assert';
import { runInference } from '../inference';
import type { InferenceDeps } from '../inference';
import { defaultDoc, ChatDoc } from '../chatDocument';
import type { ChatMessage, ChatResult, StreamCallbacks, LLMProvider } from '../providers/types';
import type { ToolHub } from '../tools';
import * as vscode from 'vscode';
import type { Webview } from 'vscode';

/**
 * Integration tests for the agentic turn (`runInference`): streaming, the tool loop, and the
 * failure/abort/cap branches. The provider is injected via the `buildProvider` seam, so a scripted
 * fake stands in for a real backend — no network, no vscode host. Covers what only `tsc` + manual F5
 * touched before: that a streamed answer accumulates, a tool call round-trips and is persisted, bad
 * tool args don't run the tool, the loop is bounded, and abort ≠ failure.
 */

const DEFAULTS = { provider: 'ollama' as const, temperature: 0.7, maxTokens: 2048 };
type Msg = Record<string, unknown>;
/** A scripted backend turn: drive the stream callbacks, then resolve a ChatResult. */
type ChatStep = (cb: StreamCallbacks) => ChatResult | Promise<ChatResult>;

function mkDoc(opts: { tools?: boolean } = {}): ChatDoc {
  const d = defaultDoc(DEFAULTS);
  d.model = 'm';
  if (opts.tools) d.params.tools = true;
  return d;
}

/** A provider whose `chat()` plays the next scripted step and records each call's wire/params. */
function fakeProvider(steps: ChatStep[]) {
  const calls: { model: string; messages: ChatMessage[] }[] = [];
  const provider: LLMProvider = {
    id: 'fake',
    async listModels() { return []; },
    async chat(model, messages, _params, cb) {
      calls.push({ model, messages: messages.map((m) => ({ ...m })) }); // snapshot the wire at call time
      return steps[Math.min(calls.length - 1, steps.length - 1)](cb);
    },
  };
  return { provider, calls };
}

interface DepsOpts {
  doc: ChatDoc;
  steps: ChatStep[];
  toolOut?: (name: string) => string;
  abortRef?: { current: AbortController | undefined };
}
function makeDeps(opts: DepsOpts) {
  const messages: Msg[] = [];
  const wrote: ChatDoc[] = [];
  const toolCalls: { name: string; args: Record<string, unknown> }[] = [];
  const { provider, calls } = fakeProvider(opts.steps);
  const abortRef = opts.abortRef ?? { current: undefined as AbortController | undefined };
  const toolHub = {
    ensureStarted: async () => {},
    schemas: () => [{ name: 'fs_read', parameters: {} }],
    mcpErrors: () => [],
    call: async (name: string, args: Record<string, unknown>) => { toolCalls.push({ name, args }); return opts.toolOut ? opts.toolOut(name) : 'TOOL_OUT'; },
  };
  const deps: InferenceDeps = {
    webview: { postMessage: (m: Msg) => { messages.push(m); return Promise.resolve(true); } } as unknown as Webview,
    toolHub: toolHub as unknown as ToolHub,
    modelContexts: {},
    resolveSystemPrompt: () => 'You are helpful.',
    ensureSummary: async () => '',
    resolveAttachment: (a) => a,
    getDoc: () => opts.doc,
    writeDoc: async (d) => { wrote.push(d); },
    sendHistory: () => {},
    abortRef,
    buildProvider: () => provider,
  };
  return { deps, messages, wrote, toolCalls, providerCalls: calls, abortRef };
}

const of = (msgs: Msg[], type: string): Msg[] => msgs.filter((m) => m.type === type);
const user = (text: string): ChatMessage[] => [{ role: 'user', content: text }];

// ── Streaming ───────────────────────────────────────────────────────────────────────────────────
test('streams deltas and returns the accumulated answer + usage', async () => {
  const doc = mkDoc();
  const step: ChatStep = (cb) => {
    cb.onDelta('Hel'); cb.onDelta('lo');
    return { answer: 'Hello', thinking: '', usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } };
  };
  const { deps, messages, providerCalls } = makeDeps({ doc, steps: [step] });

  const r = await runInference(doc, user('hi'), false, deps);

  assert.equal(r.answer, 'Hello');
  assert.equal(r.failed, false);
  assert.equal(r.usage?.totalTokens, 3);
  assert.equal(of(messages, 'streamStart').length, 1);
  assert.deepEqual(of(messages, 'streamDelta').map((m) => m.delta), ['Hel', 'lo']);
  assert.equal(of(messages, 'streamEnd').length, 1);
  // The wire carries the system prompt first and the user message last.
  const wire = providerCalls[0].messages;
  assert.equal(wire[0].role, 'system');
  assert.equal(wire[wire.length - 1].content, 'hi');
});

test('routes reasoning deltas to streamReasoning and returns thinking', async () => {
  const doc = mkDoc();
  const step: ChatStep = (cb) => { cb.onReasoning?.('pondering'); cb.onDelta('A'); return { answer: 'A', thinking: 'pondering' }; };
  const { deps, messages } = makeDeps({ doc, steps: [step] });

  const r = await runInference(doc, user('q'), false, deps);

  assert.equal(r.thinking, 'pondering');
  assert.equal(of(messages, 'streamReasoning')[0].delta, 'pondering');
});

// ── Agentic loop ──────────────────────────────────────────────────────────────────────────────
test('runs the tool loop: call → result fed back → final answer, persisted in order', async () => {
  const doc = mkDoc({ tools: true });
  const steps: ChatStep[] = [
    () => ({ answer: '', thinking: '', toolCalls: [{ id: 't1', name: 'fs_read', arguments: '{"path":"a.txt"}' }] }),
    (cb) => { cb.onDelta('Done'); return { answer: 'Done', thinking: '' }; },
  ];
  const { deps, messages, toolCalls, providerCalls, wrote } = makeDeps({ doc, steps, toolOut: () => 'file body' });

  const r = await runInference(doc, user('read a'), true, deps);

  assert.equal(r.answer, 'Done');
  assert.equal(r.usedTools, true);
  assert.equal(providerCalls.length, 2, 'looped exactly once');
  // The tool was executed with the parsed args.
  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].name, 'fs_read');
  assert.deepEqual(toolCalls[0].args, { path: 'a.txt' });
  // The webview saw the live tool activity.
  assert.equal(of(messages, 'toolCall')[0].name, 'fs_read');
  assert.equal(of(messages, 'toolResult')[0].content, 'file body');
  // The exchange was persisted to the doc, in order, with the call id linked.
  assert.deepEqual(doc.messages.map((m) => m.role), ['assistant', 'tool']);
  assert.equal(doc.messages[1].toolCallId, 't1');
  assert.ok(wrote.length >= 1, 'an intermediate writeDoc happened in the loop');
  // The second backend call saw the tool result in its wire.
  assert.ok(providerCalls[1].messages.some((m) => m.role === 'tool' && m.content === 'file body'));
});

test('invalid tool-arg JSON is reported to the model, not executed', async () => {
  const doc = mkDoc({ tools: true });
  const steps: ChatStep[] = [
    () => ({ answer: '', thinking: '', toolCalls: [{ id: 't1', name: 'fs_read', arguments: '{not json' }] }),
    () => ({ answer: 'recovered', thinking: '' }),
  ];
  const { deps, messages, toolCalls } = makeDeps({ doc, steps });

  const r = await runInference(doc, user('x'), true, deps);

  assert.equal(toolCalls.length, 0, 'the tool must not run with bad arguments');
  assert.match(String(of(messages, 'toolResult')[0].content), /not valid JSON/i);
  assert.equal(r.answer, 'recovered');
});

test('the tool loop is bounded (a model that always asks for tools stops at the cap)', async () => {
  const doc = mkDoc({ tools: true });
  const alwaysTool: ChatStep = () => ({ answer: '', thinking: '', toolCalls: [{ id: 't', name: 'fs_read', arguments: '{}' }] });
  const { deps, providerCalls } = makeDeps({ doc, steps: [alwaysTool], toolOut: () => 'out' });

  await runInference(doc, user('loop'), true, deps);

  assert.equal(providerCalls.length, 8, 'stops at the default maxIterations, no runaway');
});

// ── Failure / abort ─────────────────────────────────────────────────────────────────────────────
test('a provider error posts an error and fails the turn', async () => {
  const doc = mkDoc();
  const { deps, messages } = makeDeps({ doc, steps: [() => { throw new Error('boom'); }] });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.failed, true);
  assert.match(String(of(messages, 'error')[0].message), /boom/);
});

test('abort is not a failure: no error toast, no "no content" notice', async () => {
  const doc = mkDoc();
  const abortRef = { current: undefined as AbortController | undefined };
  const step: ChatStep = (cb) => { cb.onDelta('partial'); abortRef.current?.abort(); throw new Error('aborted'); };
  const { deps, messages } = makeDeps({ doc, steps: [step], abortRef });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.failed, false, 'a user Stop is not a failure');
  assert.equal(of(messages, 'error').length, 0, 'no error toast on abort');
});

test('an empty completion (no answer/thinking/tools) surfaces the "no content" error', async () => {
  const doc = mkDoc();
  const { deps, messages } = makeDeps({ doc, steps: [() => ({ answer: '', thinking: '' })] });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.answer, '');
  assert.equal(r.failed, false);
  assert.match(String(of(messages, 'error')[0].message), /no content/i);
});

// ── Stop keeps the partial response ─────────────────────────────────────────────────────────────
test('Stop keeps the text streamed so far as the answer (and the thinking)', async () => {
  const doc = mkDoc();
  const abortRef = { current: undefined as AbortController | undefined };
  const step: ChatStep = (cb) => {
    cb.onReasoning?.('thought'); cb.onDelta('partial '); cb.onDelta('answer');
    abortRef.current?.abort();
    throw new Error('aborted');
  };
  const { deps, messages } = makeDeps({ doc, steps: [step], abortRef });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.answer, 'partial answer', 'the partial text is returned so the caller persists it');
  assert.equal(r.thinking, 'thought');
  assert.equal(r.failed, false);
  assert.equal(of(messages, 'error').length, 0);
});

test('Stop mid tool-loop keeps only the current call\'s partial text (no duplicate of the tool-call text)', async () => {
  const doc = mkDoc({ tools: true });
  const abortRef = { current: undefined as AbortController | undefined };
  const steps: ChatStep[] = [
    (cb) => { cb.onDelta('Let me look.'); return { answer: 'Let me look.', thinking: '', toolCalls: [{ id: 't1', name: 'fs_read', arguments: '{}' }] }; },
    (cb) => { cb.onDelta('The file says'); abortRef.current?.abort(); throw new Error('aborted'); },
  ];
  const { deps } = makeDeps({ doc, steps, abortRef });

  const r = await runInference(doc, user('read'), true, deps);

  assert.equal(r.answer, 'The file says');
  assert.equal(r.usedTools, true);
  // The completed tool exchange stays on the doc (its text lives there, not in the final answer).
  assert.deepEqual(doc.messages.map((m) => m.role), ['assistant', 'tool']);
  assert.equal(doc.messages[0].content, 'Let me look.');
});

// ── Loop guard ──────────────────────────────────────────────────────────────────────────────────
/** A backend that streams `good` and then loops `la la la…` until its signal fires (as readLines would). */
const loopingStep = (good: string, channel: 'answer' | 'thinking' | 'tool'): ChatStep => (cb) => {
  cb.onDelta(good);
  const emit = channel === 'answer' ? cb.onDelta : channel === 'thinking' ? cb.onReasoning! : cb.onToolDelta!;
  for (let i = 0; i < 1000 && !cb.signal.aborted; i++) emit('la ');
  if (cb.signal.aborted) throw new Error('aborted');
  return { answer: good + 'la '.repeat(1000), thinking: '', toolCalls: [{ id: 't', name: 'fs_read', arguments: '{}' }] };
};

test('a model stuck repeating itself is cut: the run is dropped, the text before it kept, no failure', async () => {
  const doc = mkDoc();
  const { deps, messages } = makeDeps({ doc, steps: [loopingStep('The capital is Paris.\n', 'answer')] });

  const r = await runInference(doc, user('capital?'), false, deps);

  assert.equal(r.answer, 'The capital is Paris.', 'kept the good part, dropped the loop');
  assert.equal(r.failed, false, 'a guard cut is not a failure: the partial answer gets persisted');
  assert.equal(r.thinking, '');
  assert.match(String(of(messages, 'error')[0].message), /repeating itself/);
  assert.equal(of(messages, 'streamEnd').length, 1);
  // Forwarding to the webview stopped at the cut instead of relaying the whole runaway stream.
  const streamed = of(messages, 'streamDelta').map((m) => String(m.delta)).join('');
  assert.ok(streamed.length < 2000, `only ${streamed.length} chars reached the webview`);
});

test('a loop in the thinking channel cuts the turn, trims the thinking and keeps the answer text', async () => {
  const doc = mkDoc();
  const step: ChatStep = (cb) => {
    cb.onReasoning?.('Let me think.\n');
    cb.onDelta('Partial answer');
    for (let i = 0; i < 1000 && !cb.signal.aborted; i++) cb.onReasoning?.('la ');
    throw new Error('aborted');
  };
  const { deps, messages } = makeDeps({ doc, steps: [step] });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.thinking, 'Let me think.');
  assert.equal(r.answer, 'Partial answer');
  assert.match(String(of(messages, 'error')[0].message), /while thinking/);
});

test('a loop in tool-call arguments ends the turn without running the tool', async () => {
  const doc = mkDoc({ tools: true });
  const { deps, toolCalls, messages, providerCalls } = makeDeps({ doc, steps: [loopingStep('Reading…', 'tool')] });

  const r = await runInference(doc, user('x'), true, deps);

  assert.equal(toolCalls.length, 0, 'the runaway call is never executed');
  assert.equal(providerCalls.length, 1, 'no further iterations');
  assert.equal(r.answer, 'Reading…');
  assert.equal(r.usedTools, false);
  assert.match(String(of(messages, 'error')[0].message), /tool call/);
});

test('a guard cut with nothing salvageable posts the loop banner only (no "no content" error)', async () => {
  const doc = mkDoc();
  const { deps, messages } = makeDeps({ doc, steps: [loopingStep('', 'answer')] });

  const r = await runInference(doc, user('x'), false, deps);

  assert.equal(r.answer, '');
  assert.equal(of(messages, 'error').length, 1);
  assert.match(String(of(messages, 'error')[0].message), /repeating itself/);
});

test('the guard can be switched off (jotflow.stopOnRepetition = false)', async () => {
  const doc = mkDoc();
  const ws = vscode.workspace as unknown as { getConfiguration: (s: string) => { get: (k: string, d?: unknown) => unknown } };
  const orig = ws.getConfiguration;
  ws.getConfiguration = () => ({ get: (k, d) => (k === 'stopOnRepetition' ? false : d) });
  try {
    const step: ChatStep = (cb) => {
      for (let i = 0; i < 1000; i++) cb.onDelta('la ');
      assert.equal(cb.signal.aborted, false, 'the stream is never cut');
      return { answer: 'la '.repeat(1000), thinking: '' };
    };
    const { deps, messages } = makeDeps({ doc, steps: [step] });

    const r = await runInference(doc, user('x'), false, deps);

    assert.equal(r.answer.length, 3000);
    assert.equal(of(messages, 'error').length, 0);
  } finally {
    ws.getConfiguration = orig;
  }
});
