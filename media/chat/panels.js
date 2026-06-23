/**
 * Reasoning + tools side panels: their visibility (open/updateSide) and content rendering
 * (showThinking / showTools). Owns only the panel DOM refs; no streaming/scroll state.
 */
import { $, escapeHtml } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { ICONS } from '../core/icons.js';
import { renderRaw as renderMarkdownImpl } from '../render/markdown.js';

const configPanel = $('config');
const thinkPanel = $('thinking');
const thinkContent = $('thinkContent');
const toolsPanel = $('tools');
const toolsContent = $('toolsContent');
const sidepanels = $('sidepanels');

export function updateSide() {
  const open = !configPanel.classList.contains('hidden')
    || !thinkPanel.classList.contains('hidden')
    || !toolsPanel.classList.contains('hidden');
  sidepanels.classList.toggle('hidden', !open);
}
export function openThink() { thinkPanel.classList.remove('hidden'); updateSide(); }
export function openTools() { toolsPanel.classList.remove('hidden'); updateSide(); }

// Renders a list of tool activity in the panel.
export function showTools(activity) {
  toolsContent.innerHTML = '';
  if (!activity || !activity.length) {
    toolsContent.classList.add('empty');
    toolsContent.textContent = t('No tool activity.');
    return;
  }
  toolsContent.classList.remove('empty');
  for (const a of activity) {
    const item = document.createElement('div');
    item.className = 'tool-item';
    const head = document.createElement('div');
    head.className = 'tool-item-head';
    head.innerHTML = ICONS.tool + '<span>' + escapeHtml(a.name) + '</span>';
    item.appendChild(head);
    if (a.args && a.args !== '{}') {
      const args = document.createElement('div');
      args.className = 'tool-args';
      args.textContent = a.args;
      item.appendChild(args);
    }
    if (a.result !== undefined) {
      const pre = document.createElement('pre');
      pre.textContent = a.result;
      item.appendChild(pre);
    }
    toolsContent.appendChild(item);
  }
  toolsContent.scrollTop = toolsContent.scrollHeight;
}

export function showThinking(text) {
  if (text) {
    thinkContent.innerHTML = renderMarkdownImpl(text); // called per-frame during reasoning: no cache
    thinkContent.classList.remove('empty');
  } else {
    thinkContent.textContent = t('This message has no reasoning.');
    thinkContent.classList.add('empty');
  }
  thinkContent.scrollTop = thinkContent.scrollHeight;
}
