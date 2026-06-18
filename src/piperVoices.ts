/** Gestión de las voces Piper descargadas (modelos .onnx en globalStorage/piper-voices). */
import * as fs from 'fs';
import * as path from 'path';

export interface PiperVoice { id: string; sizeBytes: number; }

/** Lista las voces descargadas (cada `*.onnx`), con su tamaño. */
export function listPiperVoices(dir: string): PiperVoice[] {
  let files: string[];
  try { files = fs.readdirSync(dir); } catch { return []; }
  return files
    .filter((f) => f.endsWith('.onnx'))
    .map((f) => {
      const id = f.slice(0, -'.onnx'.length);
      let sizeBytes = 0;
      try { sizeBytes = fs.statSync(path.join(dir, f)).size; } catch { /* nada */ }
      return { id, sizeBytes };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Borra una voz: su `.onnx` y el `.onnx.json` que la acompaña. */
export function removePiperVoice(dir: string, id: string): void {
  for (const ext of ['.onnx', '.onnx.json']) {
    try { fs.unlinkSync(path.join(dir, id + ext)); } catch { /* no existe */ }
  }
}
