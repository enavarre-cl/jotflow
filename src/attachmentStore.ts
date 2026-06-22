import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatDoc } from './chatDocument';

/**
 * Persists attachment blobs in a `<chat>.attach` sidecar; the `.chat` keeps only `{kind,name,mime,ref}`.
 * Single dependency: the `.chat` document URI. Cohesive (all blob lifecycle), low coupling.
 */
export class AttachmentStore {
  private cache: Record<string, any> | null = null;
  private loadFailed = false;             // sidecar exists but couldn't be parsed → never clobber it
  private writeChain: Promise<void> = Promise.resolve(); // serialize sidecar writes

  constructor(private readonly docUri: vscode.Uri) {}

  private uri(): vscode.Uri {
    const stem = path.basename(this.docUri.fsPath).replace(/\.chat$/i, '');
    return vscode.Uri.joinPath(this.docUri, '..', stem + '.attach');
  }

  load(): Record<string, any> {
    if (this.cache) return this.cache;
    let raw: string;
    try {
      raw = fs.readFileSync(this.uri().fsPath, 'utf8');
    } catch (e: any) {
      this.cache = {};
      this.loadFailed = e?.code !== 'ENOENT'; // ENOENT = no sidecar yet (safe to create fresh)
      return this.cache;
    }
    try {
      this.cache = JSON.parse(raw);
    } catch {
      this.cache = {};
      this.loadFailed = true; // existing-but-corrupt (e.g. a half-written read): don't overwrite it
    }
    return this.cache!;
  }

  // Atomic write (temp file + rename) so a concurrent reader never sees a half-written sidecar and
  // resets it to {} (which a later save/prune would then persist, losing every blob). Serialized.
  private writeSidecar(store: Record<string, any>): Promise<void> {
    const run = this.writeChain.then(async () => {
      const main = this.uri();
      const tmp = main.with({ path: main.path + '.tmp' });
      await vscode.workspace.fs.writeFile(tmp, Buffer.from(JSON.stringify(store) + '\n', 'utf8'));
      await vscode.workspace.fs.rename(tmp, main, { overwrite: true });
    });
    this.writeChain = run.catch(() => {}); // keep the chain alive even if one write fails
    return run;
  }

  private async save(store: Record<string, any>): Promise<void> {
    this.cache = store;
    this.loadFailed = false; // we now hold an authoritative store
    await this.writeSidecar(store);
  }

  /** Saves new blobs and returns attachments with only {kind,name,mime,ref,bytes}. */
  async store(atts: any[]): Promise<any[]> {
    if (!atts.length) return [];
    const store = this.load();
    const refs: any[] = [];
    for (const a of atts) {
      const id = `att_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
      const bytes = typeof a.data === 'string' ? a.data.length : 0;
      store[id] = { kind: a.kind, name: a.name, mime: a.mime, data: a.data, bytes };
      refs.push({ kind: a.kind, name: a.name, mime: a.mime, ref: id, bytes }); // bytes → token budgeting
    }
    await this.save(store);
    return refs;
  }

  /** Stores images returned by an image-output model as image attachments. */
  async storeGenImages(images: { mime: string; data: string }[]): Promise<any[]> {
    const ext = (mime: string) => (/jpeg|jpg/i.test(mime) ? 'jpg' : /webp/i.test(mime) ? 'webp' : /gif/i.test(mime) ? 'gif' : 'png');
    return this.store(images.map((im, i) => ({
      kind: 'image', name: `image-${i + 1}.${ext(im.mime)}`, mime: im.mime || 'image/png', data: im.data,
    })));
  }

  /** Returns an attachment with `data` resolved (from the sidecar if a ref, or legacy inline).
   *  Arrow property so it can be passed as `.map(store.resolve)` without losing `this`. */
  resolve = (a: any): any => {
    if (typeof a?.data === 'string') return a; // legacy inline
    if (a?.ref) {
      const e = this.load()[a.ref];
      if (e) return { kind: a.kind, name: a.name || e.name, mime: a.mime || e.mime, data: e.data };
    }
    return a;
  };

  /** Removes entries no longer referenced by any message (on delete/merge/fork). */
  async prune(doc: ChatDoc): Promise<void> {
    if (!this.cache) return;        // only if attachments have been/were loaded
    if (this.loadFailed) return;    // store unreadable: never delete from a set we couldn't read
    const used = new Set<string>();
    for (const m of doc.messages) {
      for (const a of (m.attachments ?? [])) if (a.ref) used.add(a.ref);
      for (const v of (m.variants ?? [])) for (const a of (v.attachments ?? [])) if (a.ref) used.add(a.ref);
    }
    let changed = false;
    for (const id of Object.keys(this.cache)) {
      if (!used.has(id)) { delete this.cache[id]; changed = true; }
    }
    if (!changed) return;
    if (Object.keys(this.cache).length === 0) {
      await this.writeChain.catch(() => {}); // let pending writes settle before deleting
      try { await vscode.workspace.fs.delete(this.uri()); } catch { /* no longer exists */ }
    } else {
      await this.writeSidecar(this.cache);
    }
  }
}
