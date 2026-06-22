import { httpFetch } from '../http';
import { formatHttpError } from './httpError';

/**
 * POSTs a streaming chat request and returns the response body reader, throwing a formatted error on
 * a non-OK or body-less response. Shared by every provider so the request/error shell lives in one
 * place. `name` labels the backend in errors; `hint` appends extra context (e.g. Ollama crash hints).
 */
export async function postStream(
  url: string,
  init: RequestInit,
  name: string,
  hint?: (detail: string) => string,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await httpFetch(url, init);
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(formatHttpError(name, res.status, res.statusText, detail) + (hint ? hint(detail) : ''));
  }
  return res.body.getReader();
}
