/**
 * MCP elicitation (`elicitation/create`): a server asks the user for structured input mid-operation.
 * The server sends a `message` + a flat `requestedSchema` (object of primitive props); we render VS
 * Code UI from it and reply `{ action, content }`. Pure schema helpers (testable) live alongside the
 * vscode-driven prompt. See §U / ARCHITECTURE for the server→client direction.
 */
import * as vscode from 'vscode';

export type ElicitAction = 'accept' | 'decline' | 'cancel';
export interface ElicitResult { action: ElicitAction; content?: Record<string, unknown> }

interface SchemaProp { type?: string; title?: string; description?: string; enum?: unknown[] }
export interface RequestedSchema { type?: string; properties?: Record<string, SchemaProp>; required?: string[] }

/** A "confirmation" elicitation = no inputs, or a single boolean field (a plain approve/deny). */
export function isConfirmation(schema: RequestedSchema | undefined): boolean {
  const keys = Object.keys(schema?.properties ?? {});
  if (keys.length === 0) return true;
  return keys.length === 1 && schema!.properties![keys[0]].type === 'boolean';
}

/** The `content` to reply with when a confirmation is auto-accepted: `{}` or `{ field: true }`. */
export function confirmationAcceptContent(schema: RequestedSchema | undefined): Record<string, unknown> {
  const keys = Object.keys(schema?.properties ?? {});
  return keys.length === 1 && schema!.properties![keys[0]].type === 'boolean' ? { [keys[0]]: true } : {};
}

/** Prompts the user from the schema and returns the MCP elicitation result. `message` is pre-prefixed. */
export async function runElicitation(message: string, schema: RequestedSchema | undefined): Promise<ElicitResult> {
  const props = schema?.properties ?? {};
  const keys = Object.keys(props);

  // No fields → a plain confirmation (Allow / Decline).
  if (keys.length === 0) {
    const choice = await vscode.window.showInformationMessage(message, { modal: true }, 'Allow', 'Decline');
    if (choice === undefined) return { action: 'cancel' };
    return choice === 'Allow' ? { action: 'accept', content: {} } : { action: 'decline' };
  }
  // Single boolean → Yes / No, captured as the field's value.
  if (keys.length === 1 && props[keys[0]].type === 'boolean') {
    const choice = await vscode.window.showInformationMessage(message, { modal: true }, 'Yes', 'No');
    if (choice === undefined) return { action: 'cancel' };
    return { action: 'accept', content: { [keys[0]]: choice === 'Yes' } };
  }

  // Otherwise collect each field in sequence; any dismissal cancels the whole thing.
  const content: Record<string, unknown> = {};
  for (const key of keys) {
    const p = props[key];
    const label = p.title || p.description || key;
    if (Array.isArray(p.enum) && p.enum.length) {
      const pick = await vscode.window.showQuickPick(p.enum.map(String), { title: message, placeHolder: label });
      if (pick === undefined) return { action: 'cancel' };
      content[key] = pick;
    } else if (p.type === 'boolean') {
      const pick = await vscode.window.showQuickPick(['Yes', 'No'], { title: message, placeHolder: label });
      if (pick === undefined) return { action: 'cancel' };
      content[key] = pick === 'Yes';
    } else if (p.type === 'number' || p.type === 'integer') {
      const v = await vscode.window.showInputBox({
        title: message, prompt: label,
        validateInput: (s) => (s.trim() === '' || isNaN(Number(s)) ? 'Enter a number' : undefined),
      });
      if (v === undefined) return { action: 'cancel' };
      content[key] = Number(v);
    } else {
      const v = await vscode.window.showInputBox({ title: message, prompt: label });
      if (v === undefined) return { action: 'cancel' };
      content[key] = v;
    }
  }
  return { action: 'accept', content };
}
