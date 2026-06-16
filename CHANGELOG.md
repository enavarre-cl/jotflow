# Changelog

Todos los cambios notables de Lang Chat. Formato basado en
[Keep a Changelog](https://keepachangelog.com/); versionado [SemVer](https://semver.org/).

## [Sin publicar]

### Añadido
- **Modelos locales (Ollama embebido + explorador tipo LM Studio)**:
  - Servidor **Ollama gestionado**: descarga su propio binario (SHA256 pineado, fail-closed) y lo
    ejecuta en `127.0.0.1` (independiente de cualquier Ollama del sistema).
  - **Vista lateral** con el estado del servidor y los modelos locales (usar en el chat, ver info, eliminar).
  - **Explorador** (panel) que busca modelos GGUF en **Hugging Face**, muestra badges de capacidades
    (estimados por tags; verdad de `/api/show` tras bajar) y **descarga con progreso** mostrando
    tamaño y espacio libre **antes**.
  - El chat usa automáticamente el servidor gestionado cuando está listo.
- **Zoom propio del chat** (Alt/Option + rueda, Alt+0 reset) con controles en la barra.
- System prompt en archivo usa **`.md`** por defecto.
- **TTS neural con Piper** (motor local, sin censura) además del motor del sistema (Web Speech):
  selector de voces femeninas ES/EN, velocidad, botón de prueba y lectura por mensaje.
- **Python autocontenido**: si no hay (o está roto) un Python del sistema, la extensión descarga
  su propio CPython (con checksum pineado) para ejecutar Piper. Cero requisitos.
- Internacionalización **ES/EN** (UI del webview + ajustes del marketplace) con selector y auto-detección.
- Botón **Regenerar** en el mensaje de usuario y borrado **⌥/Alt** (este y los de abajo).
- `SECURITY.md` con modelo de amenazas.

### Seguridad
- **Workspace Trust**: MCP y `fs_write` solo en workspaces de confianza.
- **Anti-SSRF** en `web_fetch` (bloquea loopback/privadas/metadatos; valida redirects).
- Confinamiento de rutas (traversal/symlink) en las tools y `systemPromptFile`.
- Integridad pineada (SHA256) de modelos/binarios Piper y del Python autocontenido; `piper-tts` con versión fijada.
- Binario de **Ollama** verificado por SHA256 **fail-closed** antes de extraer/ejecutar; servidor solo en `127.0.0.1`.
- Búsqueda/descarga de modelos (HF/Ollama) por `httpFetch` (proxy + anti-SSRF heredados).

### Rendimiento
- Caché de parseo del `.chat`; render de streaming coalescido (rAF); memoización de markdown.

### Corregido
- Múltiples arreglos de robustez del TTS, del tool-loop (Stop, `busy`), fugas de recursos y compatibilidad Windows.
