# Lang Chat

A VS Code extension for chatting with local (and remote) LLMs — **LM Studio style** — right inside the editor.

Supports five configurable backends:

- **OpenAI-compatible**: LM Studio, llama.cpp server, vLLM, LocalAI… (default `http://localhost:1234/v1`)
- **Ollama**: a local Ollama server (`http://localhost:11434`), or the extension's own managed server
- **OpenRouter**: hosted models via `https://openrouter.ai/api/v1`
- **Google Gemini**: the Generative Language API
- **Anthropic Claude**: the Messages API

## `.chat` files

Each conversation is a **`.chat`** file (human-readable JSON) that stores **the inference
configuration + the full history**. Opening it in VS Code shows the chat UI; everything you
type and configure is persisted in the file itself, so it is git-versionable.

```json
{
  "version": 2,
  "title": "My conversation",
  "provider": "openai",
  "model": "llama-3.1-8b-instruct",
  "systemPrompt": "You are a helpful assistant.",
  "params": {
    "temperature": 0.7,
    "maxTokens": { "enabled": false, "value": 2048 },
    "thinking": false,
    "tools": false
  },
  "messages": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

A `.chat` may reference its system prompt from an external **`.md`** file (`systemPromptFile`,
confined to the `.chat`'s directory) instead of inlining it.

## Tools (function calling)

With the **"Tools"** toggle on (in ⚙, available on every backend: OpenAI-compatible,
OpenRouter, Gemini, Anthropic and Ollama), the model can call tools in an agentic loop:

- **Workspace filesystem** (native, no setup): `fs_list`, `fs_read`, `fs_write`, scoped to the
  workspace folder.
- **MCP servers**: define servers in a **`.mcp/`** folder (one `*.json` per server) or a
  **`.mcp.json`** at the workspace root. Accepted formats:

  ```jsonc
  // .mcp.json (standard format)
  {
    "mcpServers": {
      "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"] },
      "git": { "command": "uvx", "args": ["mcp-server-git"] }
    }
  }
  ```
  ```jsonc
  // .mcp/myserver.json (one server per file)
  { "name": "myserver", "command": "node", "args": ["server.js"], "env": { "API_KEY": "..." } }
  ```

Each MCP server's tools are exposed as `server__tool`. Calls and results are shown in the chat
and stored in the `.chat`. MCP servers and `fs_write` only run in a **trusted workspace**.

## Local models (embedded Ollama)

Lang Chat can manage its **own Ollama server** without you installing anything:

- The **sidebar** (Lang Chat icon) has a **Models** view: server status and your local models
  (use in chat, show info, delete).
- The **Add** button opens an **LM Studio-style explorer**: it searches **GGUF** models on
  Hugging Face, shows capability badges and quantization options, and **downloads with progress**
  (it tells you the size and free disk space first).
- On first use it downloads the Ollama binary (SHA256-verified, fail-closed) into your global
  storage; the server runs only on `127.0.0.1`. Configurable under *Settings → Lang Chat → Ollama*
  (`managed`, `port`, `modelsPath`).

## Features

- 📄 Conversations as **`.chat` files** (inference config + history, editable and versionable).
- 🦙 **Embedded Ollama** + Hugging Face GGUF model explorer (download with progress, retry/cancel).
- 💬 **Streaming** responses, token by token.
- 🧠 **Reasoning / thinking** panel for models that expose it.
- 🔧 **Tools** (function calling): workspace filesystem + MCP servers.
- 🗣️ **Read aloud (TTS)**: system voices (Web Speech) or neural **Piper** (local, self-contained).
- 🔎 **Search in chat** (`Ctrl/Cmd+F`): highlight matches and jump between them.
- 🔍 **Chat zoom** (`Alt/Option` + wheel, `Alt/Option+0` to reset) with toolbar controls.
- 🌳 **Fork** a conversation: normal = clone up to a message; **⌥/Alt** = clone from there to the end.
- 🕓 **Compare versions**: render two versions of a `.chat` side by side (from the Timeline, the
  editor title bar, or the command palette).
- ♻️ **Regenerate** (as variants), **continue**, **merge**, **edit** and **delete** messages
  (with confirmation; **Shift** skips it, **⌥/Alt** deletes from a message to the end).
- 🖼️ **Attachments**: images and documents.
- 🧾 **Export** the conversation to a standalone HTML / PDF (print).
- 🌐 **Internationalization** (English / Spanish) with a selector and auto-detection.
- ⛔ **Stop** button for in-flight generation, and auto-save after each response.

## Trying it out

1. Install dependencies and compile:
   ```bash
   npm install
   npm run compile
   ```
2. Open the folder in VS Code and press **F5** (the "Run Extension" launch config). A
   *Extension Development Host* window opens.
3. Create a chat: command palette (`Cmd/Ctrl+Shift+P`) → **"Lang Chat: New chat"**, choose where
   to save the `.chat` file and start chatting. (You can also create a file with the `.chat`
   extension by hand and open it.)

> Make sure LM Studio (with its local server enabled) or Ollama is running before sending
> messages — or use a hosted backend (OpenRouter / Gemini / Anthropic) with an API key.

## Configuration

Settings under `Settings → Lang Chat`:

| Setting | Default | Description |
| --- | --- | --- |
| `langChat.provider` | `openai` | Default backend: `openai`, `ollama`, `openrouter`, `gemini` or `anthropic` |
| `langChat.openai.baseUrl` | `http://localhost:1234/v1` | OpenAI-compatible endpoint |
| `langChat.openai.apiKey` | _(empty)_ | Optional API key |
| `langChat.ollama.baseUrl` | `http://localhost:11434` | Ollama server URL (used when `managed` is off) |
| `langChat.ollama.managed` | `true` | Use the extension's own downloaded Ollama server |
| `langChat.ollama.port` | `0` | Managed server port (`0` = pick a free one) |
| `langChat.ollama.modelsPath` | _(empty)_ | Optional `OLLAMA_MODELS` path |
| `langChat.ollama.maxConcurrentDownloads` | `2` | Parallel model downloads |
| `langChat.openrouter.baseUrl` | `https://openrouter.ai/api/v1` | OpenRouter endpoint |
| `langChat.openrouter.apiKey` | _(empty)_ | OpenRouter API key |
| `langChat.gemini.apiKey` | _(empty)_ | Google Gemini API key (Google AI Studio) |
| `langChat.gemini.baseUrl` | `https://generativelanguage.googleapis.com/v1beta` | Generative Language API endpoint |
| `langChat.anthropic.apiKey` | _(empty)_ | Anthropic Claude API key (console.anthropic.com) |
| `langChat.anthropic.baseUrl` | `https://api.anthropic.com/v1` | Anthropic Messages API endpoint |
| `langChat.temperature` | `0.7` | Sampling temperature |
| `langChat.maxTokens` | `2048` | Max tokens (`-1` = unlimited) |

> API keys are best stored securely: run **"Lang Chat: Set API Key (secure)"** from the command
> palette to keep them in VS Code SecretStorage instead of plain settings.

## Packaging (optional)

```bash
npm install -g @vscode/vsce
vsce package
```

Produces an installable `.vsix` — **Extensions → Install from VSIX…**. CI (Azure DevOps,
`azure-pipelines.yml`) also builds and publishes the `.vsix` as an artifact.
