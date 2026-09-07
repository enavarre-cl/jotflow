import * as vscode from 'vscode';
import { buildProvider, ChatMessage, GenerationParams } from './providers';
import { LoopGuard } from './providers/loopGuard';
import { tr } from './i18n';
import { estTokens } from './chatHelpers';
import { ChatDoc } from './chatDocument';

/** num_ctx for a summary call. Ollama silently truncates the prompt to num_ctx, so with its small
 *  default a large block would be cut to its tail and the summary would miss most of the conversation.
 *  Size the window to fit the whole input + the reply, honoring the user's configured window as a
 *  floor and 128k as the ceiling, rounded up to Ollama's 256-token step. */
export function summaryContextTokens(inputTokens: number, configured: number): number {
  const needed = inputTokens + 1024 /* reply */ + 512 /* headroom */;
  return Math.min(131072, Math.ceil(Math.max(needed, configured, 4096) / 256) * 256);
}

export interface SummaryDeps {
  webview: vscode.Webview;
  writeDoc: (doc: ChatDoc, opts?: { save?: boolean; prune?: boolean }) => Promise<void>;
  abortRef: { current: AbortController | undefined };
}

/** Incremental conversation summarization (rolling summary to preserve context). */
export function makeSummary(deps: SummaryDeps) {
  const { webview, writeDoc, abortRef } = deps;
    // Calls the model to summarise a block of messages (no streaming to the UI).
    const summarizeMessages = async (
      doc: ChatDoc,
      prevText: string,
      msgs: ChatMessage[]
    ): Promise<string> => {
      const convo = msgs
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      const instruction =
        (prevText
          ? `Previous summary of the conversation:\n${prevText}\n\nIntegrate the following new messages into a single updated summary.`
          : 'Summarize the following conversation.') +
        '\nKeep facts, decisions, data, names and pending tasks. Be concise. Reply with only the summary, in the same language as the conversation.\n\n--- Conversation ---\n' +
        convo;
      const wire: ChatMessage[] = [
        { role: 'system', content: 'You are an assistant that summarizes conversations to preserve context.' },
        { role: 'user', content: instruction },
      ];
      // The summary request must READ the whole block, so for Ollama size num_ctx to fit it (else the
      // server truncates the input to its small default and summarises only the tail — the "resumir
      // doesn't work with a big context" bug). Other backends manage their own window.
      const params: GenerationParams = { temperature: 0.3, maxTokens: 1024 };
      if (doc.provider === 'ollama') {
        const inputTokens = estTokens(wire.map((m) => m.content).join('\n'));
        const configured = doc.params.contextLength.enabled ? doc.params.contextLength.value : 0;
        params.contextLength = summaryContextTokens(inputTokens, configured);
      }
      const ac = new AbortController();
      abortRef.current = ac;
      let text = '';
      let reasoning = '';
      // Same runaway-repetition guard as a chat turn: a looping model would otherwise yield a garbage
      // summary that gets stored and replayed on every later turn. A hit fails the summary instead.
      const guardOn = vscode.workspace.getConfiguration('jotflow').get<boolean>('stopOnRepetition', true) !== false;
      const guards = guardOn ? [new LoopGuard(), new LoopGuard()] : undefined;
      let looped = false;
      const watch = (g: number, d: string): void => { if (guards?.[g].push(d) && !looped) { looped = true; ac.abort(); } };
      try {
        // No explicit timeout here on purpose: cancellation/timeout is handled by the provider
        // through the AbortSignal passed below.
        await buildProvider(doc.provider).chat(doc.model, wire, params, {
          signal: ac.signal,
          onDelta: (d) => { text += d; watch(0, d); },
          onReasoning: (d) => { reasoning += d; watch(1, d); },
        });
      } catch (err) {
        if (!looped) throw err; // a guard cut is reported below, not as the provider's abort error
      } finally {
        abortRef.current = undefined;
      }
      if (looped) throw new Error(tr('The model got stuck repeating itself.'));
      // Some reasoning models return text only in the thinking channel.
      return (text.trim() || reasoning.trim());
    };
    const ensureSummary = async (
      doc: ChatDoc,
      history: ChatMessage[],
      targetUpTo: number
    ): Promise<string> => {
      const prev = doc.summary;
      if (prev && prev.upTo >= targetUpTo) return prev.text;
      const startFrom = prev ? prev.upTo : 0;
      const block = history.slice(startFrom, targetUpTo);
      if (!block.length) return prev?.text ?? '';
      // PERSISTENT indicator (with spinner) throughout the model call; removed on completion
      // or failure. (Previously it was a notice that auto-closed after 6 s, leaving a feedback gap.)
      webview.postMessage({ type: 'summarizing', active: true, message: tr('🗜️ Summarizing previous context…') });
      try {
        const text = await summarizeMessages(doc, prev?.text ?? '', block);
        if (text) {
          doc.summary = { text, upTo: targetUpTo };
          await writeDoc(doc);
        }
        return doc.summary?.text ?? '';
      } finally {
        webview.postMessage({ type: 'summarizing', active: false });
      }
    };
  return { ensureSummary };
}
