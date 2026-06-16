# Seguridad — Lang Chat

Este documento describe el modelo de amenazas de la extensión, las mitigaciones
implementadas y los riesgos residuales aceptados.

## Alcance y confianza

Lang Chat es un editor de chat con LLMs dentro de VS Code. Ejecuta en el host de
extensiones (Node) y una webview (sandbox de navegador). Procesa:

- **Archivos `.chat`** (JSON) y `.sysprompt` del workspace.
- **Configuración del usuario** (API keys, URLs de backends).
- **Tools** (opt-in por chat): filesystem del workspace, `web_fetch`, y servidores
  **MCP** definidos en `.mcp.json` / `.mcp/*.json` del repo.
- **Modelos/binarios de TTS (Piper)** descargados de HuggingFace y GitHub.

Se confía en: VS Code, el proveedor LLM configurado por el usuario, y (con Workspace
Trust) el contenido del workspace. **No** se confía en: contenido remoto leído por
el modelo (webs vía `web_fetch`, archivos no confiables) ni en repos abiertos sin trust.

## Modelo de amenazas y mitigaciones

| Amenaza | Mitigación |
|---|---|
| **RCE al abrir un repo malicioso** (`.mcp.json` que hace `spawn` de un comando) | Los servidores MCP **solo arrancan en un Workspace de confianza** (`vscode.workspace.isTrusted`). `package.json` declara `capabilities.untrustedWorkspaces: limited`. |
| **SSRF** vía `web_fetch` (golpear `localhost`, IPs privadas, `169.254.169.254`) | Se resuelve el DNS y se **rechaza** loopback/privadas/CGNAT/link-local/ULA (IPv4 e IPv6). Los **redirects se siguen a mano validando el host de cada salto**. |
| **Escritura peligrosa** (modelo escribe en `.git/hooks`, `.vscode/` → ejecución) | `fs_write` deniega rutas sensibles (`.git/`, `.vscode/`) y **requiere Workspace Trust**. |
| **Path traversal** en `systemPromptFile` (leer un archivo arbitrario al system prompt) | La ruta se **confina al directorio del `.chat`**. |
| **Escape por symlink** en las fs tools | `resolveInWorkspace` resuelve `realpath` del ancestro existente y re-valida contra el root real. |
| **XSS en la webview** | CSP estricta: `default-src 'none'; script-src 'nonce-…'` (sin `unsafe-inline`) bloquea scripts inline y `javascript:`. El markdown escapa HTML y el href de los links tiene allowlist de esquema (`http`/`https`/`mailto`). |
| **Fuga de API keys** | Las keys van en **headers** (`Authorization`/`x-api-key`/`X-goog-api-key`), nunca en la URL, así que no aparecen en errores ni logs. La webview nunca las recibe. |
| **Cadena de suministro (modelos Piper)** | SHA256 **pineado** de cada `.onnx` curado; se verifica tras descargar (mismatch → borra + error). **Falla cerrado**: un asset sin hash pineado se rechaza, no se usa. |
| **Cadena de suministro (binario Piper standalone)** | SHA256 **pineado** de cada tarball de GitHub; se verifica antes de extraer/ejecutar. **Falla cerrado** (asset sin hash → error, no se extrae). |
| **Cadena de suministro (Python autocontenido)** | SHA256 **pineado** de cada build de `python-build-standalone`; verificado antes de extraer. **Falla cerrado**. |
| **Cadena de suministro (binario Ollama)** | SHA256 **pineado** de cada asset del release de GitHub (del campo `digest`); verificado **antes de extraer/ejecutar**. **Falla cerrado** (asset sin hash → error). |
| **Servidor Ollama gestionado** | Escucha **solo en `127.0.0.1`** (puerto efímero o configurado); proceso hijo gestionado y terminado al desactivar. No expone la API a la red. |
| **Descarga de modelos (HF/Ollama)** | Búsqueda y `pull` vía `httpFetch` (proxy + anti-SSRF heredados). Se muestra tamaño y espacio libre y se pide **confirmación** antes de descargar. |
| **Cadena de suministro (paquete pip)** | `piper-tts` se instala con **versión pineada** (`==1.4.2`); pip verifica el hash de esa versión contra el índice de PyPI (archivos inmutables). |

## Riesgos residuales aceptados

- **Inyección de prompt → abuso de tools.** Si el modelo procesa contenido no confiable
  (una web vía `web_fetch`, un archivo) puede ser dirigido a leer archivos del workspace
  y exfiltrarlos (p. ej. `web_fetch` con datos en la query) o a escribir archivos. Es
  **inherente a las herramientas agénticas**. Mitigaciones: las tools son **opt-in por
  chat**, `fs_write` tiene denylist + Trust, y `web_fetch` no alcanza la red interna. El
  usuario debe asumir que activar tools = el modelo puede leer/escribir el workspace y
  hacer peticiones de red salientes.
- **Pin total de dependencias pip (`--require-hashes`) NO implementado.** Cubriría el caso
  de PyPI sirviendo bytes distintos al hash de su índice, o un dep transitivo comprometido
  en una versión ya publicada — riesgo marginal. El coste (lockfile con SHA256 de todas las
  deps —onnxruntime, numpy…— por plataforma y versión de Python, regenerado a mano) no
  compensa para esta herramienta. La **versión pineada** ya cubre los vectores realistas.
- **Voces Piper no curadas.** Si el usuario apunta `langChat.tts.piperModel` a un `.onnx`
  propio, no se verifica checksum (es elección del usuario).

## Cómo reportar una vulnerabilidad

Abre un issue privado / contacta al mantenedor (ver `package.json` → `bugs`). No publiques
detalles explotables hasta que haya un fix.
