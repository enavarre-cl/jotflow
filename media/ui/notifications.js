// Notices bar: dismissible info/error banners and the persistent "summarizing…" indicator.
import { t } from '../core/i18n.js';
import { $ } from '../core/dom.js';

const noticesEl = $('notices');

export function notice(text, isError) {
  const el = document.createElement('div');
  el.className = 'banner' + (isError ? ' error' : '');
  const span = document.createElement('span');
  span.className = 'banner-text';
  span.textContent = text;
  const x = document.createElement('button');
  x.className = 'banner-x';
  x.textContent = '×';
  x.title = t('Dismiss');
  x.addEventListener('click', () => el.remove());
  el.appendChild(span);
  el.appendChild(x);
  noticesEl.appendChild(el);
  if (!isError) setTimeout(() => el.remove(), 6000); // informational notices auto-dismiss
  return el;
}

// Persistent "summarizing…" indicator (with spinner); lasts the whole operation, no auto-dismiss.
let summarizingEl = null;
export function showSummarizing(text) {
  if (summarizingEl && summarizingEl.isConnected) return;
  const el = document.createElement('div');
  el.className = 'banner summarizing';
  const spin = document.createElement('span');
  spin.className = 'banner-spin';
  const span = document.createElement('span');
  span.className = 'banner-text';
  span.textContent = text || ('🗜️ ' + t('Context summarized up to here'));
  el.appendChild(spin);
  el.appendChild(span);
  noticesEl.appendChild(el);
  summarizingEl = el;
}
export function hideSummarizing() { if (summarizingEl) { summarizingEl.remove(); summarizingEl = null; } }

// Clears the notices bar and the summarizing indicator. (Per-turn tool activity is reset
// separately by the conversation module.)
export function clearNotices() { noticesEl.innerHTML = ''; summarizingEl = null; }
