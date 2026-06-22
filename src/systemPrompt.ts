import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatDoc } from './chatDocument';
import { tr } from './i18n';

/** Resolves the effective system prompt (file or inline) with a path allow-list. One dep: the doc. */
export function makeSystemPrompt(document: vscode.TextDocument) {
    const sysPromptRoots = (): string[] => [
      path.dirname(document.uri.fsPath),
      ...(vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath),
    ];
    const sysPromptPathAllowed = (resolved: string): boolean =>
      sysPromptRoots().some((root) => resolved === root || resolved.startsWith(root + path.sep));

    let sysPromptWarned = ''; // debounce: warn once per broken file, not on every send

    // Reads the EFFECTIVE system prompt (file if usable, else inline). No side effects.
    // `fileFailed` = a systemPromptFile was set but is missing/empty/outside the workspace.
    const readSystemPrompt = (doc: ChatDoc): { text: string; fileFailed: boolean } => {
      if (doc.systemPromptFile) {
        const resolved = path.resolve(path.dirname(document.uri.fsPath), doc.systemPromptFile);
        if (sysPromptPathAllowed(resolved)) {
          try {
            const text = fs.readFileSync(resolved, 'utf8');
            if (text.trim()) return { text, fileFailed: false };
          } catch { /* missing/unreadable */ }
        }
        return { text: doc.systemPrompt || '', fileFailed: true };
      }
      return { text: doc.systemPrompt || '', fileFailed: false };
    };

    // Effective system prompt for sending; warns once (visibly) if a referenced file couldn't be
    // used, instead of silently using the inline prompt (which looks like the prompt is ignored).
    const resolveSystemPrompt = (doc: ChatDoc): string => {
      const { text, fileFailed } = readSystemPrompt(doc);
      if (fileFailed) {
        const file = doc.systemPromptFile || '';
        if (sysPromptWarned !== file) {
          sysPromptWarned = file;
          void vscode.window.showWarningMessage(
            `${tr('System prompt file not used (missing, empty, or outside the workspace); using the inline prompt instead:')} ${file}`
          );
        }
      } else {
        sysPromptWarned = '';
      }
      return text;
    };
  return { resolveSystemPrompt, readSystemPrompt, sysPromptPathAllowed };
}
