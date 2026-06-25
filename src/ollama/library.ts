/**
 * Ollama model-registry catalog (search + tags).
 *
 * Ollama exposes NO public JSON API to search or list its model library (open requests:
 * ollama/ollama#9142, #8670, #7751). The only search the SDK ships — `web_search` — is a generic
 * web-search tool for LLMs (returns `{title,url,content}`, needs an API key), not a registry index.
 * So we read the first-party HTML of ollama.com, which exposes stable `x-test-*` attributes (the
 * project's own e2e hooks). Downloading never depends on this: it uses the native Ollama
 * `/api/pull` with a `name:tag` ref (see registry.pull).
 *
 * The HTML-parsing functions are PURE (string → data) and unit-tested; the exported async
 * functions add the fetch layer (timeout + AbortSignal) and map to the shared CatalogModel/ModelFile.
 */
import { httpFetch } from '../http';
import type { CatalogModel, ModelFile } from './catalog';
import type { ModelCapabilities } from './registry';

const OLLAMA = 'https://ollama.com';
const FETCH_TIMEOUT_MS = 12_000;
const BULLET = '•';

/** Sort order accepted by ollama.com/search (`?o=`). */
export type OllamaSort = 'popular' | 'newest';

/** Raw fields scraped from a single search result. */
export interface OllamaSearchEntry {
  name: string;
  description: string;
  capabilities: string[];
  pulls: number;
}

/** A single downloadable tag of a library model. */
export interface OllamaTag {
  tag: string;
  digest: string;
  bytes: number;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'",
};

/** Decodes the handful of HTML entities that appear in scraped text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

/** Parses a human size ("4.7GB", "398MB") into bytes (decimal units, as Ollama shows them). */
export function parseSize(text: string): number {
  const m = /([\d.]+)\s*([KMGT]?)B/i.exec(text);
  if (!m) return 0;
  const mult: Record<string, number> = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
  return Math.round(Number(m[1]) * (mult[m[2].toUpperCase()] ?? 1));
}

/** Parses a pull count ("33.3M", "569.4K", "1234") into a number. */
export function parsePulls(text: string): number {
  const m = /([\d.]+)\s*([KMB]?)/i.exec(text.trim());
  if (!m) return 0;
  const mult: Record<string, number> = { '': 1, K: 1e3, M: 1e6, B: 1e9 };
  return Math.round(Number(m[1]) * (mult[m[2].toUpperCase()] ?? 1));
}

/** PURE. Extracts model entries from the ollama.com/search HTML (split on the `x-test-model` rows). */
export function parseSearchHtml(html: string): OllamaSearchEntry[] {
  const out: OllamaSearchEntry[] = [];
  for (const block of html.split('<li x-test-model').slice(1)) {
    const name = /x-test-search-response-title>([^<]+)</.exec(block)?.[1]?.trim() ?? '';
    if (!name) continue;
    const description = /<p class="max-w-lg[^"]*">([^<]*)<\/p>/.exec(block)?.[1] ?? '';
    const capabilities = [...block.matchAll(/x-test-capability[^>]*>([^<]+)</g)].map((m) => m[1].trim());
    const pulls = /x-test-pull-count>([^<]+)</.exec(block)?.[1] ?? '';
    out.push({ name, description: decodeEntities(description).trim(), capabilities, pulls: parsePulls(pulls) });
  }
  return out;
}

// Each tag row links to /library/{name}:{tag} and, shortly after, prints `<digest> • <size> • …`.
const TAG_RE = new RegExp(
  `/library/[^":]+:([^"]+)"[\\s\\S]{0,800}?font-mono">\\s*([0-9a-f]{12})</span>\\s*${BULLET}\\s*([\\d.]+\\s*[KMGT]?B)`,
  'g',
);

/** PURE. Extracts (tag, digest, bytes) tuples from a /library/{name}/tags HTML. */
export function parseTagsHtml(html: string): OllamaTag[] {
  const out: OllamaTag[] = [];
  for (const m of html.matchAll(TAG_RE)) {
    out.push({ tag: m[1].trim(), digest: m[2], bytes: parseSize(m[3]) });
  }
  return out;
}

/** A non-`latest`, shorter tag is more informative than its alias. */
function isBetterTag(candidate: string, current: string): boolean {
  if (candidate === 'latest') return false;
  if (current === 'latest') return true;
  return candidate.length < current.length;
}

/** PURE. Collapses tag aliases that share a digest, keeping the most informative name, sorted by size. */
export function dedupeTags(tags: readonly OllamaTag[]): OllamaTag[] {
  const byDigest = new Map<string, OllamaTag>();
  for (const t of tags) {
    const cur = byDigest.get(t.digest);
    if (!cur || isBetterTag(t.tag, cur.tag)) byDigest.set(t.digest, t);
  }
  return [...byDigest.values()].sort((a, b) => a.bytes - b.bytes);
}

function capabilitiesFrom(list: readonly string[]): ModelCapabilities {
  return {
    vision: list.includes('vision'),
    tools: list.includes('tools'),
    reasoning: list.includes('thinking') || list.includes('reasoning'),
  };
}

/** Maps a scraped entry to the shared CatalogModel so the browser renders it unchanged. */
function toCatalogModel(e: OllamaSearchEntry): CatalogModel {
  const capabilities = capabilitiesFrom(e.capabilities);
  return {
    id: e.name,
    author: '',          // the library has no per-author namespace → no provider filter
    downloads: e.pulls,
    likes: 0,
    updated: '',
    tags: e.capabilities,
    pipeline: '',
    params: '',
    domain: capabilities.vision ? 'VLM' : 'LLM',
    official: true,
    capabilities,
    description: e.description,
  };
}

/** fetch with a hard timeout that also honours an external AbortSignal (K6). */
async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => ac.abort();
  if (signal) {
    if (signal.aborted) ac.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    return await httpFetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const SORT_QUERY: Record<OllamaSort, string> = { popular: '', newest: 'newest' };

/** Searches the Ollama library by parsing ollama.com/search. */
export async function searchOllama(
  query: string, limit = 30, signal?: AbortSignal, sort: OllamaSort = 'popular',
): Promise<CatalogModel[]> {
  let url = `${OLLAMA}/search?q=${encodeURIComponent(query || '')}`;
  if (SORT_QUERY[sort]) url += `&o=${SORT_QUERY[sort]}`;
  const res = await fetchWithTimeout(url, signal);
  if (!res.ok) throw new Error(`Ollama search HTTP ${res.status}`);
  return parseSearchHtml(await res.text()).slice(0, limit).map(toCatalogModel);
}

/** Lists the distinct downloadable tags of a library model as ModelFile entries (quant = tag). */
export async function ollamaModelFiles(name: string, signal?: AbortSignal): Promise<ModelFile[]> {
  const res = await fetchWithTimeout(`${OLLAMA}/library/${encodeURIComponent(name)}/tags`, signal);
  if (!res.ok) throw new Error(`Ollama tags HTTP ${res.status}`);
  return dedupeTags(parseTagsHtml(await res.text()))
    .map((t): ModelFile => ({ path: '', size: t.bytes, quant: t.tag, pullable: true }));
}
