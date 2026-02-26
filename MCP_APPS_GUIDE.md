# MCP Apps: Complete Reference Guide

> Interactive HTML UIs rendered inline inside AI chat clients (Claude, ChatGPT, VS Code Copilot, etc.) via the Model Context Protocol.

## Table of Contents

- [What Are MCP Apps?](#what-are-mcp-apps)
- [Core Architecture](#core-architecture)
- [SDK Packages](#sdk-packages)
- [Client Support Matrix](#client-support-matrix)
- [Project Structure](#project-structure)
- [Build Checklist](#build-checklist)
- [Key Patterns (from tldraw's Implementation)](#key-patterns-from-tldraws-implementation)
- [Deployment](#deployment)
- [Debugging](#debugging)
- [Gotchas](#gotchas)
- [Production Checklist](#production-checklist)
- [Hosting Assets (Images, Fonts, CDN)](#hosting-assets-images-fonts-cdn)
- [Reference: tldraw Implementation](#reference-tldraw-implementation)
- [Resources](#resources)

---

## What Are MCP Apps?

MCP Apps let MCP servers return **interactive HTML interfaces** (dashboards, forms, canvases, visualizations) that render directly inside the chat conversation in a sandboxed iframe. Instead of just returning text, an LLM can invoke a tool that displays a full interactive widget.

**Why not just build a web app?**

| Advantage | Description |
|-----------|-------------|
| Context preservation | The UI lives inside the conversation — no tab switching |
| Bidirectional data flow | App can call MCP tools, host can push results to the app |
| Host integration | App can delegate actions to the host's connected capabilities |
| Security | Sandboxed iframe — can't access the parent page, steal cookies, or escape |

**Good fit for:** data exploration, forms with many options, rich media viewers, real-time dashboards, multi-step workflows.

---

## Core Architecture

```
User -> LLM -> calls tool with _meta.ui.resourceUri -> Host fetches ui:// resource ->
Renders HTML in sandboxed iframe -> Bidirectional JSON-RPC via postMessage
```

Two MCP primitives combined:

1. **Tool** — declares `_meta.ui.resourceUri` pointing to a `ui://` resource
2. **Resource** — serves bundled HTML that the host renders in an iframe

```
sequenceDiagram
    User -> Agent: "show me analytics"
    Agent -> MCP Server: tools/call
    MCP Server -> Agent: tool result + structuredContent
    Agent -> App (iframe): render UI + push result
    User -> App: interacts with UI
    App -> Agent: tools/call request (via postMessage)
    Agent -> MCP Server: tools/call (forwarded)
    MCP Server -> Agent: fresh data
    Agent -> App: updated data
    App -> Agent: context update (updateModelContext)
```

### Registration Pattern

```typescript
// 1. Define the resource URI
const RESOURCE_URI = 'ui://my-app/mcp-app.html'

// 2. Register a tool that links to the UI
registerAppTool(server, 'my-tool', {
  title: 'My Tool',
  description: 'Does something and shows interactive UI.',
  inputSchema: mySchema,
  _meta: { ui: { resourceUri: RESOURCE_URI } },  // <-- THIS links tool to UI
}, handler)

// 3. Register the resource that serves the HTML
registerAppResource(server, RESOURCE_URI, RESOURCE_URI,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: htmlString }]
  })
)
```

---

## SDK Packages

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/ext-apps` | Core `App` class + `PostMessageTransport` |
| `@modelcontextprotocol/ext-apps/react` | React hooks: `useApp`, `useHostStyles` |
| `@modelcontextprotocol/ext-apps/server` | `registerAppTool`, `registerAppResource`, `RESOURCE_MIME_TYPE` |
| `@modelcontextprotocol/ext-apps/app-bridge` | For hosts embedding MCP Apps |
| `@modelcontextprotocol/sdk` | Core MCP SDK: transports, `McpServer` |

---

## Client Support Matrix

| Client | MCP Apps Support |
|--------|:---:|
| Claude (web) | Yes |
| Claude Desktop | Yes |
| VS Code GitHub Copilot | Yes |
| ChatGPT | Yes |
| Goose | Yes |
| Postman | Yes |
| MCPJam | Yes |
| Claude Code (CLI) | No (terminal, not a browser) |

---

## Project Structure

```
my-mcp-app/
├── package.json          # type: "module"
├── server.ts             # MCP server + tool/resource registration
├── main.ts               # Transport entry point (stdio or HTTP)
├── vite.config.ts        # Bundle widget to single HTML file
├── tsconfig.json
├── src/
│   └── widget/
│       ├── index.html    # Widget HTML entry
│       └── mcp-app.tsx   # Widget logic (App class / useApp hook)
└── dist/
    └── mcp-app.html      # Built single-file output
```

---

## Build Checklist

### Dependencies

```json
{
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/ext-apps": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.24.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.0.0",
    "typescript": "^5.5.0",
    "tsx": "^4.7.0"
  }
}
```

### Vite Config (Single-File Bundling)

```typescript
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/widget',
  build: { outDir: '../../dist', emptyOutDir: false },
})
```

**Why single-file?** The iframe has a deny-by-default CSP. Bundling everything into one HTML file avoids having to declare every external origin. If you don't bundle, you must configure `_meta.ui.csp` for every external domain.

### Build Script

```json
"scripts": {
  "build": "vite build && mv dist/index.html dist/mcp-app.html",
  "start": "npx tsx main.ts"
}
```

### Widget Code (Minimal)

```typescript
import { App } from '@modelcontextprotocol/ext-apps'

const app = new App({ name: 'My App', version: '1.0.0' })
app.connect()

// Receive tool results from the host
app.ontoolresult = (result) => {
  const text = result.content?.find((c) => c.type === 'text')?.text
  document.getElementById('output')!.textContent = text ?? '[ERROR]'
}

// Proactively call tools from the UI
button.addEventListener('click', async () => {
  const result = await app.callServerTool({ name: 'my-tool', arguments: {} })
  // handle result
})
```

### Widget Code (React)

```tsx
import { useApp } from '@modelcontextprotocol/ext-apps/react'

function MyApp() {
  const { app, isConnected, error } = useApp({
    appInfo: { name: 'My App', version: '1.0.0' },
    capabilities: {},
  })

  useEffect(() => {
    if (!app || !isConnected) return
    app.ontoolresult = (result) => { /* handle result */ }
    app.ontoolinputpartial = (input) => { /* streaming preview */ }
    app.ontoolcancelled = (params) => { /* revert preview */ }
  }, [app, isConnected])

  return <div>...</div>
}
```

---

## Key Patterns (from tldraw's Implementation)

### Structured Content (Server to Widget)

Tools return `structuredContent` for the widget alongside regular `content` for the LLM:

```typescript
return {
  content: [{ type: 'text', text: 'Created 5 shapes.' }],  // LLM sees this
  structuredContent: {                                        // Widget receives this
    checkpointId,
    action: 'create',
    tldrawRecords: resultShapes,
  },
}
```

### App-Only Tools (Hidden from LLM)

Tools that only the widget can call — invisible to the model:

```typescript
server.registerTool('save_checkpoint', {
  _meta: { ui: { visibility: ['app'] } },  // hidden from the model
}, handler)
```

Use for: saving state, polling, UI-driven actions that shouldn't clutter the model's tool list.

### Streaming Preview (`ontoolinputpartial`)

The widget can preview data **while the LLM is still generating**:

```typescript
app.ontoolinputpartial = (input) => {
  // Parse incomplete JSON, show preview in real-time
  const partialShapes = parsePartialJsonArray(input.arguments.shapesJson)
  renderPreview(partialShapes)
}
```

The last item in a partial array should be dropped as potentially incomplete.

### Context Updates (Widget to Model)

Push current widget state back to the model so subsequent tool calls know what's on screen:

```typescript
app.updateModelContext({
  content: [{ type: 'text', text: `Current canvas shapes:\n${JSON.stringify(shapes)}` }]
})
```

### State Persistence

tldraw uses a dual persistence strategy:

- **Server-side**: In-memory `Map<string, TLShape[]>` (max 200 checkpoints, LRU eviction)
- **Client-side**: `localStorage` keyed by `tldraw:${checkpointId}`
- **Fallback**: If server restarts and loses memory, widget recovers from localStorage and merges

### CSP Configuration

For external resources (fonts, CDN assets), declare allowed origins on the resource:

```typescript
_meta: {
  ui: {
    csp: {
      resourceDomains: ['https://cdn.example.com', 'https://fonts.googleapis.com'],
      connectDomains: ['https://api.example.com'],
    },
  },
}
```

### Display Mode

Request inline rendering from the host:

```typescript
await app.requestDisplayMode({ mode: 'inline' })
```

### Offscreen Optimization

Pause expensive rendering when the widget scrolls out of view:

```typescript
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) startPolling()
  else stopPolling()
})
```

---

## Deployment

Two routes. You probably want both — stdio for local dev/Claude Desktop/VS Code, HTTP for Claude web and team use.

| Route | Transport | Users connect via | State persistence |
|-------|-----------|-------------------|-------------------|
| **Route A: npm package** | stdio | `npx your-package --stdio` | File-based (local disk) |
| **Route B: Vercel HTTP** | Streamable HTTP | Custom Connector URL | Upstash Redis |
| **Route C: Cloudflare Workers** | Streamable HTTP | Custom Connector URL or `mcp-remote` | Durable Objects (SQLite) |

---

### Route A: npm Package (stdio)

The server runs as a **local subprocess** — the client spawns it, communicates over stdin/stdout. No network, no hosting, no auth needed. The "deployment" is publishing to npm.

#### Step 1: Entry point with `--stdio` flag

```typescript
// main.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FileCheckpointStore } from './checkpoint-store.js'
import { createServer } from './server.js'

const store = new FileCheckpointStore()
const server = createServer(store)
await server.connect(new StdioServerTransport())
```

#### Step 2: package.json for npm distribution

```json
{
  "name": "@my-org/server-my-app",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mcp-server-my-app": "dist/main.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build && mv dist/index.html dist/mcp-app.html && tsc",
    "prepublishOnly": "npm run build"
  }
}
```

Key fields:
- **`bin`** — makes `npx @my-org/server-my-app` work
- **`files`** — only ships `dist/`, not source
- **`prepublishOnly`** — builds before every publish

#### Step 3: Add shebang to entry point

The `bin` field needs the compiled JS to be executable:

```typescript
#!/usr/bin/env node
// dist/main.js (add this as first line in your build output)
```

Or configure TypeScript/build to prepend it.

#### Step 4: Users add to their client config

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["-y", "@my-org/server-my-app", "--stdio"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "my-app": {
      "command": "npx",
      "args": ["-y", "@my-org/server-my-app", "--stdio"]
    }
  }
}
```

#### Step 5: Publish

```bash
npm login
npm publish --access public
```

Or automate with GitHub Actions (OIDC trusted publishing):

```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  release:
    types: [published]
permissions:
  id-token: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci && npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Step 6 (optional): `.mcpb` packaging for one-click install

```bash
npm install -D mcpb
```

Add `manifest.json`:
```json
{
  "manifest_version": "0.3",
  "name": "my-app",
  "display_name": "My App",
  "version": "1.0.0",
  "description": "...",
  "server": {
    "type": "node",
    "entry_point": "dist/main.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/main.js", "--stdio"]
    }
  },
  "tools": [
    { "name": "my_tool", "description": "..." }
  ]
}
```

```bash
npx mcpb pack .  # produces .mcpb file, users double-click to install
```

#### Route A checklist

- [ ] `main.ts` checks `--stdio` and connects `StdioServerTransport`
- [ ] `FileCheckpointStore` for local state (writes to `os.tmpdir()`)
- [ ] `package.json` has `bin`, `files`, `prepublishOnly`
- [ ] Shebang line in compiled entry point
- [ ] All logging uses `console.error()` (NOT `console.log()`)
- [ ] `npm publish` works, `npx @my-org/server-my-app --stdio` starts cleanly
- [ ] README has copy-paste config JSON for Claude Desktop and VS Code
- [ ] Optional: `manifest.json` + `mcpb pack` for `.mcpb` distribution

---

### Route B: Vercel HTTP (remote)

The server runs as a **Vercel serverless function**. Stateless — new server per request, no session map. State lives in Upstash Redis. This is the Excalidraw pattern.

#### Step 1: Install `mcp-handler`

```bash
npm install mcp-handler @modelcontextprotocol/sdk@1.25.2 zod
```

> **Security:** SDK versions prior to 1.25.1 have a known vulnerability. Use 1.25.2+.

#### Step 2: Create the API route

```typescript
// api/mcp.ts
import { createMcpHandler } from 'mcp-handler'
import path from 'node:path'
import { createVercelStore } from '../src/checkpoint-store.js'
import { registerTools } from '../src/server.js'

const store = createVercelStore()

const mcpHandler = createMcpHandler(
  (server) => {
    const distDir = path.join(process.cwd(), 'dist')
    registerTools(server, distDir, store)
  },
  { serverInfo: { name: 'My App', version: '1.0.0' } },
  { basePath: '', maxDuration: 60, sessionIdGenerator: undefined },
)

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE }
```

What `createMcpHandler` does for you:
- Creates `StreamableHTTPServerTransport` per request (stateless)
- Handles `POST /mcp` (requests), `GET /mcp` (SSE streaming), `DELETE /mcp` (cleanup)
- Manages transport lifecycle and error responses
- `sessionIdGenerator: undefined` = no sessions = works on serverless

#### Step 3: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/mcp", "destination": "/api/mcp" },
    { "source": "/sse", "destination": "/api/mcp" },
    { "source": "/message", "destination": "/api/mcp" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Accept, Authorization, Mcp-Session-Id" }
      ]
    }
  ]
}
```

What this does:
- **Rewrites** — routes `/mcp`, `/sse`, `/message` to the serverless function
- **CORS headers** — allows any origin (lock down for production, see Security below)
- **`Mcp-Session-Id`** in allowed headers — required by MCP clients

#### Step 4: Checkpoint store with Upstash Redis

```typescript
// src/checkpoint-store.ts
import { Redis } from '@upstash/redis'

interface CheckpointStore {
  save(id: string, data: string): Promise<void>
  load(id: string): Promise<string | null>
}

class RedisCheckpointStore implements CheckpointStore {
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  async save(id: string, data: string) {
    if (data.length > 5 * 1024 * 1024) throw new Error('Checkpoint too large')
    await this.redis.set(`checkpoint:${id}`, data, { ex: 30 * 24 * 60 * 60 }) // 30-day TTL
  }

  async load(id: string) {
    return this.redis.get<string>(`checkpoint:${id}`)
  }
}

class FileCheckpointStore implements CheckpointStore {
  // For local dev — writes to os.tmpdir()/your-app-checkpoints/
  // Copy from Excalidraw's implementation
}

export function createVercelStore(): CheckpointStore {
  if (process.env.UPSTASH_REDIS_REST_URL) return new RedisCheckpointStore()
  return new FileCheckpointStore()
}
```

#### Step 5: Deploy

```bash
# Link to Vercel
npx vercel link

# Add Upstash Redis env vars
npx vercel env add UPSTASH_REDIS_REST_URL
npx vercel env add UPSTASH_REDIS_REST_TOKEN

# Deploy
npx vercel --prod
```

Or just push to GitHub with the Vercel GitHub integration — auto-deploys on every push.

#### Step 6: Connect from Claude web

1. Go to Claude > Settings > Connectors > Add Custom Connector
2. Paste `https://your-app.vercel.app/mcp`
3. Requires Pro, Max, or Team plan

#### Step 7: Secure it

`mcp-handler` has built-in OAuth via `withMcpAuth`:

```typescript
// api/mcp.ts
import { withMcpAuth, protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

// 1. Your token verification logic
const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined
  // Verify against your auth provider (Auth0, Clerk, Descope, etc.)
  const isValid = await validateWithYourProvider(bearerToken)
  if (!isValid) return undefined
  return {
    token: bearerToken,
    scopes: ['read', 'write'],
    clientId: 'user-id',
  }
}

// 2. Wrap the handler
const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  requiredScopes: ['read'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
```

```typescript
// app/.well-known/oauth-protected-resource/route.ts
import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler'

// 3. OAuth discovery endpoint (required by MCP spec)
const handler = protectedResourceHandler({
  authServerUrls: ['https://your-auth-provider.com'],
})
const corsHandler = metadataCorsOptionsRequestHandler()

export { handler as GET, corsHandler as OPTIONS }
```

What this gives you:
- Only clients with valid OAuth tokens can call your tools
- MCP clients auto-discover how to authenticate via `/.well-known/oauth-protected-resource`
- Follows the MCP authorization specification

**Additional Vercel security layers:**
- **Deployment Protection** — password-protect preview deploys
- **Vercel Firewall** — rate limiting, IP blocking, bot protection
- **HTTPS everywhere** — automatic TLS, no cert management
- **Lock down CORS** — replace `"*"` with specific origins in `vercel.json` for production

#### Route B checklist

- [ ] `npm install mcp-handler @modelcontextprotocol/sdk@1.25.2 zod`
- [ ] `api/mcp.ts` exports GET, POST, DELETE using `createMcpHandler`
- [ ] `vercel.json` with rewrites for `/mcp`, `/sse`, `/message` and CORS headers
- [ ] Upstash Redis account created, env vars added to Vercel
- [ ] Checkpoint store auto-selects Redis (prod) vs File (local)
- [ ] `vercel --prod` deploys successfully
- [ ] Test with Claude web Custom Connector
- [ ] `withMcpAuth` wrapping handler with real token verification
- [ ] `/.well-known/oauth-protected-resource` endpoint exposed
- [ ] CORS origin locked down from `*` to specific domains
- [ ] Vercel Deployment Protection enabled on preview branches
- [ ] `maxDuration: 60` set to prevent runaway requests
- [ ] Input validation (Zod) on all tool inputs
- [ ] Checkpoint store has size limits (5MB) and ID validation

---

### Dual Transport: Support Both Routes from One Codebase

Your `server.ts` (tool/resource registration) is shared. Only the entry point differs:

```typescript
// main.ts — local CLI entry point
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FileCheckpointStore } from './checkpoint-store.js'
import { createServer } from './server.js'

if (process.argv.includes('--stdio')) {
  const store = new FileCheckpointStore()
  await createServer(store).connect(new StdioServerTransport())
} else {
  // Fall back to Express HTTP for local dev testing
  const { startHttpServer } = await import('./http.js')
  await startHttpServer()
}
```

```typescript
// api/mcp.ts — Vercel entry point (separate file, same server.ts)
import { createMcpHandler } from 'mcp-handler'
import { createVercelStore } from '../src/checkpoint-store.js'
import { registerTools } from '../src/server.js'

const store = createVercelStore()
const mcpHandler = createMcpHandler(
  (server) => registerTools(server, store),
  { serverInfo: { name: 'My App', version: '1.0.0' } },
  { basePath: '', maxDuration: 60, sessionIdGenerator: undefined },
)
export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE }
```

```
my-mcp-app/
├── src/
│   ├── server.ts              # Shared: tool + resource registration
│   ├── checkpoint-store.ts    # File, Memory, Redis backends
│   └── widget/
│       ├── index.html
│       └── mcp-app.tsx
├── main.ts                    # Route A: stdio entry point (npm bin)
├── api/
│   └── mcp.ts                 # Route B: Vercel serverless entry point
├── vercel.json                # Route B: Vercel config
├── vite.config.ts             # Widget bundler
├── package.json               # Both routes
└── manifest.json              # Optional: .mcpb packaging
```

---

## Debugging

### In the Widget

Add a debug panel (tldraw's approach):

```typescript
const debugLines: string[] = []
function log(msg: string) {
  debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
  const el = document.getElementById('debug')
  if (el) el.textContent = debugLines.join('\n')
}

// Catch all errors
window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))
```

Hook into App lifecycle events:

```typescript
app.onerror = (err) => log(`App.onerror: ${err}`)
app.onhostcontextchanged = (ctx) => log(`hostcontext: ${JSON.stringify(ctx)}`)
```

### On the Server

**Use `console.error()`, NOT `console.log()`** — stdout is the MCP stdio transport channel. Any `console.log()` will corrupt the protocol.

```typescript
console.error(`[my-app] tool called: param=${value}`)
```

### Testing Locally

Four options, fastest first:

**Option 1: MCP Inspector (30 seconds, server only — no widget rendering)**

```bash
# Stdio server
npx @modelcontextprotocol/inspector node dist/main.js --stdio

# HTTP server
npx @modelcontextprotocol/inspector --url http://localhost:3001/mcp

# Verbose (shows all JSON-RPC messages)
DEBUG=true npx @modelcontextprotocol/inspector node dist/main.js --stdio
```

Opens at `http://localhost:6274`. Lists tools, lets you call them with custom input, shows responses. Good for verifying tool schemas, `structuredContent` shape, transport issues. **Does NOT render widget UI.**

**Option 2: MCPJam Inspector (30 seconds, server + widget UI rendering)**

```bash
npx @mcpjam/inspector@latest
```

This one **renders the widget iframe** — an actual MCP Apps emulator. Features:
- Renders your widget in a sandboxed iframe, exactly like Claude would
- Manually invoke tools and instantly see the widget update
- View all JSON-RPC messages in logs (`tools/call`, `ui/initialize`, `ui/message`)
- Test across device types: Desktop, Tablet, Mobile viewports
- Test dark mode, permissions, localization, touch interactions
- Shows `structuredContent` alongside the rendered widget

**This is the fastest way to test the full end-to-end flow:** tool call -> `structuredContent` -> widget renders -> `updateModelContext` -> widget calls tool back.

**Option 3: basic-host (ext-apps reference implementation — most realistic)**

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps
npm install
npm start
# Opens http://localhost:8080
```

Point it at your server:

```bash
# Cloudflare Workers dev server
SERVERS='["http://localhost:8788/mcp"]' npm start

# Vercel dev server
SERVERS='["http://localhost:3000/mcp"]' npm start

# Any HTTP MCP server
SERVERS='["http://localhost:3001/mcp"]' npm start
```

This uses the same **AppBridge** module that real MCP clients use to sandbox and communicate with your widget. It handles:
- iframe creation with proper sandboxing
- postMessage protocol for JSON-RPC communication
- CSP enforcement based on your resource `_meta.ui.csp`
- Tool call proxying between widget and server
- Security policy enforcement

Use this when the MCPJam Inspector behaves differently from real clients, or when debugging AppBridge-level issues (CSP blocks, postMessage failures, iframe lifecycle).

**Option 4: Cloudflare AI Playground (deployed servers only)**

1. Go to https://playground.ai.cloudflare.com/
2. Paste your deployed Worker URL: `https://my-mcp-app.<account>.workers.dev/mcp`
3. It connects, lists your tools, and you can call them from the UI

Good for quick smoke tests of a deployed server. Note: may not render MCP Apps widget UI — primarily tests tool invocation and plain responses.

### Recommended Dev Loops

**Cloudflare Workers (fastest iteration):**
```bash
# Terminal 1: runs Wrangler dev server with hot reload
npm start

# Terminal 2: renders your widget
npx @mcpjam/inspector@latest
# Enter http://localhost:8788/mcp, call your tool, see widget
```

**Vercel:**
```bash
# Terminal 1
npx vercel dev

# Terminal 2
npx @mcpjam/inspector@latest
# Enter http://localhost:3000/mcp
```

**Stdio (local npm package):**
```bash
# Build first
npm run build

# MCP Inspector spawns the process for you
npx @modelcontextprotocol/inspector node dist/main.js --stdio
```

**Deployed server (any platform):**
```bash
# Just point the inspector at the live URL
npx @mcpjam/inspector@latest
# Enter https://my-mcp-app.<account>.workers.dev/mcp
```

### Testing Checklist

- [ ] MCP Inspector: tools list, call each tool, verify `content` and `structuredContent` shape
- [ ] MCPJam Inspector: widget renders, displays data from `structuredContent`
- [ ] MCPJam Inspector: `ontoolinputpartial` shows streaming preview (if implemented)
- [ ] MCPJam Inspector: `ontoolcancelled` reverts widget to previous state
- [ ] MCPJam Inspector: widget calls `app.callServerTool()` and receives response
- [ ] MCPJam Inspector: widget calls `app.updateModelContext()` successfully
- [ ] basic-host: widget renders with correct CSP (no blocked resources in console)
- [ ] basic-host: iframe sandboxing works (widget can't access parent page)
- [ ] Real client (Claude web or Desktop): end-to-end with actual LLM invoking the tool

---

## Gotchas

### 1. `console.log` Corrupts stdio Transport

On stdio transport, `stdout` IS the MCP protocol channel. `console.log()` writes to stdout and breaks the JSON-RPC stream. **Always use `console.error()` for all debug/log output.**

### 2. Single-File HTML or Configure CSP

The iframe has deny-by-default CSP. You must either:
- Bundle everything with `vite-plugin-singlefile` (recommended), OR
- Explicitly declare every external origin in `_meta.ui.csp`

If your widget loads fonts from Google Fonts, scripts from a CDN, or fetches from an API, **you must declare those origins or the requests will be silently blocked**.

### 3. Server State Is Lost on Restart

In-memory state (like checkpoint Maps) dies with the process. For production:
- Implement localStorage fallback in the widget (as tldraw does)
- Use a `hadBaseShapes` flag to detect when the server lost state
- Consider Redis/database-backed storage for HTTP deployments

### 4. Widget Remounting

Widgets can be unmounted and remounted (e.g., scrolling out of view). Handle this:
- Queue snapshots if the editor/component isn't ready yet (`pendingSnapshotRef`)
- Use `app.onteardown` for cleanup
- Use `app.ontoolcancelled` to revert preview state when the user cancels

### 5. Partial JSON Is Incomplete

Streaming previews (`ontoolinputpartial`) receive incomplete JSON. The last item in a streamed array is likely truncated — **always drop the last element** and only render confirmed-complete items.

### 6. `RESOURCE_MIME_TYPE` Constant

Always use the SDK constant `RESOURCE_MIME_TYPE` rather than hardcoding `'text/html'`. The value may change in future spec versions.

### 7. Custom Connectors Require Paid Claude Plans

Testing with Claude web/desktop via Custom Connector requires Pro, Max, or Team plan.

### 8. CORS for HTTP Transport

If using HTTP transport (not stdio), you need CORS headers. Add `cors()` middleware:

```typescript
import cors from 'cors'
app.use(cors())
```

### 9. `structuredContent` vs `content`

- `content`: what the **LLM sees** (text, images) — always required
- `structuredContent`: what the **widget receives** (rich typed data) — optional but essential for apps

Both should be returned from tool handlers. If you only return `content`, the widget has nothing to render.

### 10. Transport Choice Affects Architecture

| | stdio | HTTP |
|-|-------|------|
| Clients | 1 (the spawning process) | Many concurrent |
| State | Process lifecycle | Session-based, needs persistence |
| Auth | Process isolation | Must implement authentication |
| Scaling | N/A | Horizontal, needs shared state |

---

## Production Checklist

### Server

- [ ] Tool declarations include `_meta.ui.resourceUri`
- [ ] Resource handler serves bundled HTML with correct `RESOURCE_MIME_TYPE`
- [ ] All debug output uses `console.error()`, not `console.log()`
- [ ] Input validation with Zod schemas on all tool inputs
- [ ] Error responses return `{ isError: true, content: [...] }`
- [ ] App-only tools use `_meta.ui.visibility: ['app']`
- [ ] Both `content` (for LLM) and `structuredContent` (for widget) returned from tools
- [ ] State persistence beyond in-memory (Redis/DB for HTTP deployments)

### Widget

- [ ] `app.connect()` called on initialization
- [ ] `app.ontoolresult` handles incoming tool results
- [ ] `app.ontoolinputpartial` handles streaming previews (if needed)
- [ ] `app.ontoolcancelled` reverts preview state
- [ ] `app.onteardown` cleans up resources
- [ ] `app.updateModelContext()` pushes state back to the model
- [ ] localStorage fallback for state recovery on remount/server restart
- [ ] `IntersectionObserver` pauses expensive work when offscreen
- [ ] Error boundaries catch and display errors gracefully
- [ ] Debug panel for development (remove or hide in production)

### Build

- [ ] `vite-plugin-singlefile` bundles widget into one HTML file
- [ ] Build script produces `dist/mcp-app.html`
- [ ] CSP configured for any external domains (`resourceDomains`, `connectDomains`)
- [ ] `package.json` has `"type": "module"`
- [ ] TypeScript compiles cleanly

### Deployment (stdio / npm)

- [ ] `package.json` has correct `name`, `version`, `bin` or start script
- [ ] `--stdio` flag supported in entry point
- [ ] README documents Claude Desktop / VS Code config JSON
- [ ] npm publish workflow configured (GitHub Actions + OIDC)

### Deployment (HTTP / remote)

- [ ] Express server with `POST /mcp`, `GET /mcp`, `DELETE /mcp` endpoints
- [ ] Session management via `mcp-session-id` headers
- [ ] CORS middleware enabled
- [ ] `PORT` environment variable supported
- [ ] HTTPS/TLS termination (reverse proxy or platform-native)
- [ ] Authentication on HTTP endpoint
- [ ] Health check endpoint (`/health`)
- [ ] Dockerfile or platform deploy config
- [ ] CI/CD pipeline for build + deploy
- [ ] Monitoring and structured logging

---

## Hosting Assets (Images, Fonts, CDN)

The sandboxed iframe has a **deny-by-default Content Security Policy**. This fundamentally constrains how assets work in MCP Apps.

### The Problem

Your widget HTML runs inside an iframe the host controls. By default it **cannot load anything external** — no images from your CDN, no fonts from Google, no API calls. Every external origin must be explicitly declared in your resource's `_meta.ui.csp` or bundled inline.

### Strategy 1: Bundle Everything (Recommended for Small Assets)

Use `vite-plugin-singlefile` to inline all CSS, JS, fonts, and small images directly into one HTML file. This is what tldraw does — zero external requests needed.

```typescript
// vite.config.ts
import { viteSingleFile } from 'vite-plugin-singlefile'
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
```

**Pros:** No CSP issues, works offline, no CORS headaches.
**Cons:** Large assets (images, video) bloat the HTML. The entire widget HTML is served via MCP resource — so it travels through the JSON-RPC protocol. Keep it under a few MB.

### Strategy 2: Declare CSP Origins (For CDN/External Assets)

If you need to load assets from external origins at runtime, declare them in the resource metadata:

```typescript
registerAppResource(server, RESOURCE_URI, RESOURCE_URI,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [{
      uri: RESOURCE_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: html,
      _meta: {
        ui: {
          csp: {
            // Allows <img src="https://cdn.example.com/...">, <link href="...">, <script src="...">
            resourceDomains: [
              'https://cdn.example.com',
              'https://fonts.googleapis.com',
              'https://fonts.gstatic.com',
            ],
            // Allows fetch() / XHR to these origins
            connectDomains: [
              'https://api.example.com',
              'https://cdn.example.com',
            ],
          },
        },
      },
    }]
  })
)
```

tldraw's actual CSP (from `server.ts:410-420`):
```typescript
resourceDomains: [
  'https://cdn.tldraw.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
],
connectDomains: ['https://cdn.tldraw.com'],
```

### Strategy 3: Data URIs / Base64 Inline

For dynamic images (user uploads, generated content), convert to data URIs. This bypasses CSP entirely since the data is inline:

```typescript
// On the server — tool returns base64 image
return {
  content: [{ type: 'text', text: 'Generated chart.' }],
  structuredContent: {
    imageDataUri: `data:image/png;base64,${base64String}`,
  },
}

// In the widget — render inline
<img src={structuredContent.imageDataUri} />
```

**Warning:** Data URIs are not enabled in CSP by default in all hosts. The host controls the iframe sandbox. This works in Claude but verify for other clients.

### Strategy 4: Proxy Through MCP Tools (For Dynamic Assets)

The widget can call MCP tools to fetch assets. The server fetches the image, converts to base64, and returns it:

```typescript
// App-only tool (hidden from LLM)
server.registerTool('fetch_image', {
  inputSchema: z.object({ url: z.string().url() }),
  _meta: { ui: { visibility: ['app'] } },
}, async ({ url }) => {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mime = response.headers.get('content-type') ?? 'image/png'
  return {
    content: [{ type: 'text', text: 'OK' }],
    structuredContent: { dataUri: `data:${mime};base64,${base64}` },
  }
})
```

### Why tldraw and Excalidraw Skip Images

Both skip image shapes entirely. MCP tools communicate via JSON — binary data is impractical over the protocol. Large images would bloat `structuredContent` and the widget HTML travels through JSON-RPC.

If you need images, you need a hosting pipeline. Here's how, per route.

### Hosting Images: Route A (npm / stdio)

The server runs locally, so you can read files from disk and pass them as data URIs:

```typescript
// App-only tool — widget calls this to load an image
server.registerTool('load_image', {
  inputSchema: z.object({ path: z.string() }),
  _meta: { ui: { visibility: ['app'] } },
}, async ({ path }) => {
  const buffer = await fs.readFile(path)
  const base64 = buffer.toString('base64')
  const mime = path.endsWith('.png') ? 'image/png' : 'image/jpeg'
  return {
    content: [{ type: 'text', text: 'OK' }],
    structuredContent: { dataUri: `data:${mime};base64,${base64}` },
  }
})
```

Widget renders it:
```tsx
<img src={dataUri} />
```

**Limit:** Data URIs work for images up to ~5MB. Beyond that, the JSON payload gets too large.

### Hosting Images: Route B (Vercel)

Use **Vercel Blob** — S3-compatible object storage with a simple SDK:

```bash
npm install @vercel/blob
```

```typescript
// App-only tool — widget uploads an image
import { put } from '@vercel/blob'

server.registerTool('upload_image', {
  inputSchema: z.object({ filename: z.string(), base64: z.string() }),
  _meta: { ui: { visibility: ['app'] } },
}, async ({ filename, base64 }) => {
  const buffer = Buffer.from(base64, 'base64')
  const { url } = await put(filename, buffer, {
    access: 'public',
    contentType: 'image/png',
  })
  return {
    content: [{ type: 'text', text: 'Uploaded' }],
    structuredContent: { imageUrl: url },
  }
})
```

Add the blob domain to your widget's CSP:

```typescript
_meta: {
  ui: {
    csp: {
      resourceDomains: ['https://*.public.blob.vercel-storage.com'],
    },
  },
}
```

Set the env var in Vercel:
```bash
npx vercel env add BLOB_READ_WRITE_TOKEN
```

### Hosting Images: Route C (Cloudflare Workers)

Use **R2** — Cloudflare's object storage. No egress fees.

**Step 1: Create the bucket**

```bash
npx wrangler r2 bucket create my-app-images
```

**Step 2: Add R2 binding to `wrangler.jsonc`**

```jsonc
{
  // ...existing config
  "r2_buckets": [
    { "binding": "IMAGES", "bucket_name": "my-app-images" }
  ]
}
```

**Step 3: Upload/serve images from your McpAgent**

```typescript
export class MyMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'My App', version: '1.0.0' })

  async init() {
    // App-only tool — widget uploads an image
    this.server.tool(
      'upload_image',
      {
        filename: z.string(),
        base64: z.string(),
      },
      async ({ filename, base64 }) => {
        const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        const key = `images/${crypto.randomUUID()}-${filename}`

        await this.env.IMAGES.put(key, buffer, {
          httpMetadata: { contentType: 'image/png' },
        })

        const url = `https://images.my-app.com/${key}`
        return {
          content: [{ type: 'text', text: 'Uploaded' }],
          structuredContent: { imageUrl: url },
        }
      }
    )

    // Serve images (add a route in the fetch handler)
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // Serve images from R2
    if (url.pathname.startsWith('/images/')) {
      const key = url.pathname.slice(1) // "images/uuid-filename.png"
      const object = await env.IMAGES.get(key)
      if (!object) return new Response('Not found', { status: 404 })
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      return MyMCP.serve('/mcp').fetch(request, env, ctx)
    }

    return new Response('Not found', { status: 404 })
  },
}
```

**Step 4: Declare the image domain in widget CSP**

```typescript
_meta: {
  ui: {
    csp: {
      resourceDomains: ['https://my-mcp-server.<account>.workers.dev'],
      // or your custom domain:
      // resourceDomains: ['https://images.my-app.com'],
    },
  },
}
```

**Optional: Custom domain for images**

Add a custom domain in Cloudflare DNS pointing to your Worker, or use a separate Worker for images with its own domain. tldraw uses `assets.tldraw.xyz` as a dedicated image host.

**Optional: Image optimization**

Cloudflare has built-in image resizing on Pro+ plans:

```typescript
// On-the-fly resize and format conversion
return fetch(r2Url, {
  cf: {
    image: {
      width: parseInt(url.searchParams.get('w') ?? '800'),
      quality: 80,
      format: 'auto', // auto-negotiates avif/webp
    },
  },
})
```

### Asset Hosting Summary

| Asset Type | Route A (npm) | Route B (Vercel) | Route C (Cloudflare) |
|-----------|---------------|------------------|---------------------|
| CSS/JS/icons | Bundle (single-file) | Bundle (single-file) | Bundle (single-file) |
| Fonts | Declare CSP | Declare CSP | Declare CSP |
| Small images (<5MB) | Data URI in `structuredContent` | Data URI or Vercel Blob | Data URI or R2 |
| Large images | Data URI (limited) | Vercel Blob | R2 |
| User uploads | Read from disk | Vercel Blob | R2 |
| Video/large media | N/A | Vercel Blob + CSP | R2 + CSP |
| Image optimization | N/A | N/A | Cloudflare Image Resizing |

**The CSP rule:** if the widget's `<img>` tag loads from `https://foo.com`, then `https://foo.com` must be in `resourceDomains`. If the widget's `fetch()` calls `https://foo.com`, it must be in `connectDomains`. Bundled data URIs and `structuredContent` bypass CSP entirely.

---

## Route C: Cloudflare Workers (alternative to Vercel)

Cloudflare has first-class MCP support via the `agents` SDK. Unlike the Vercel approach (where you wire up transports yourself), Cloudflare provides `McpAgent` — a Durable Object class that handles the MCP protocol, sessions, and state out of the box.

> Full guide: [developers.cloudflare.com/agents/guides/remote-mcp-server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

### Three approaches

| Approach | State | When to use |
|----------|-------|-------------|
| `McpAgent` (Durable Object) | **Stateful** per session | Most MCP Apps — you get persistent state for free |
| `createMcpHandler()` | Stateless | Simple tools with no state |
| Raw `StreamableHTTPServerTransport` | Stateless | Full control, no helpers |

**`McpAgent` is the recommended path** — it gives you a Durable Object per session with SQLite-backed persistence, which solves the "state lost on restart" problem that plagues both tldraw and Excalidraw.

### Step 1: Scaffold

```bash
npm create cloudflare@latest -- my-mcp-server \
  --template=cloudflare/ai/demos/remote-mcp-authless
```

This creates a ready-to-deploy project.

### Step 2: Understand the generated code

**`src/index.ts`** — this is the entire server:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: 'My App',
    version: '1.0.0',
  })

  async init() {
    // Register tools here
    this.server.tool(
      'my_tool',
      { input: z.string() },
      async ({ input }) => ({
        content: [{ type: 'text', text: `Result: ${input}` }],
      })
    )
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    if (url.pathname === '/mcp') {
      return MyMCP.serve('/mcp').fetch(request, env, ctx)
    }
    return new Response('Not found', { status: 404 })
  },
}
```

That's it. `McpAgent` handles:
- Streamable HTTP transport (POST/GET/DELETE on `/mcp`)
- Session creation and management via Durable Objects
- State persistence (SQLite inside the DO)
- SSE streaming for responses

**`wrangler.jsonc`:**

```jsonc
{
  "name": "my-mcp-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",
  "compatibility_flags": ["nodejs_compat"],
  "migrations": [
    { "new_sqlite_classes": ["MyMCP"], "tag": "v1" }
  ],
  "durable_objects": {
    "bindings": [
      { "class_name": "MyMCP", "name": "MCP_OBJECT" }
    ]
  }
}
```

Key points:
- **`nodejs_compat`** — required, the MCP SDK uses Node APIs
- **`new_sqlite_classes`** — gives each `McpAgent` instance a SQLite database for state
- **`durable_objects`** — binds the `MyMCP` class as a Durable Object

**`package.json`:**

```json
{
  "dependencies": {
    "agents": "^0.5.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "wrangler": "^4.67.0",
    "typescript": "5.9.3"
  }
}
```

Note: no `@modelcontextprotocol/sdk` in dependencies — the `agents` package bundles it.

### Step 3: Run locally

```bash
npm start
# Server at http://localhost:8788/mcp
```

Test with the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector --url http://localhost:8788/mcp
```

### Step 4: Deploy

```bash
npm run deploy
# Live at https://my-mcp-server.<account>.workers.dev/mcp
```

That's a production MCP server. Deployed.

### Step 5: Connect clients

**Claude web** — Settings > Connectors > Add Custom Connector > `https://my-mcp-server.<account>.workers.dev/mcp`

**Claude Desktop / VS Code** (local clients that only speak stdio) — use `mcp-remote` as a bridge:

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://my-mcp-server.<account>.workers.dev/mcp"
      ]
    }
  }
}
```

`mcp-remote` translates between local stdio and remote HTTP.

### Step 6: Add authentication (OAuth)

Scaffold with the GitHub OAuth template:

```bash
npm create cloudflare@latest -- my-mcp-server-auth \
  --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

**Register two GitHub OAuth apps** (one for local dev, one for prod):

| | Local | Production |
|-|-------|------------|
| Homepage URL | `http://localhost:8788` | `my-mcp-server.<account>.workers.dev` |
| Callback URL | `http://localhost:8788/callback` | `my-mcp-server.<account>.workers.dev/callback` |

**Set secrets:**

```bash
# Local dev (.env file)
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"

# Production (Wrangler secrets)
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

**Create KV namespace for token storage:**

```bash
npx wrangler kv namespace create "OAUTH_KV"
```

Add to `wrangler.jsonc`:
```jsonc
{
  "kvNamespaces": [
    { "binding": "OAUTH_KV", "id": "<YOUR_KV_NAMESPACE_ID>" }
  ]
}
```

**`src/index.ts` with OAuth:**

```typescript
import { OAuthProvider } from 'agents/oauth'
import GitHubHandler from './github-handler'

export default new OAuthProvider({
  apiRoute: '/mcp',
  apiHandler: MyMCP.serve('/mcp'),
  defaultHandler: GitHubHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
```

Users are redirected to GitHub to authenticate before accessing tools. Supports any OAuth 2.0 provider (GitHub, Google, Auth0, Clerk, etc).

### Adding MCP Apps UI to Cloudflare Workers

The Cloudflare template uses `this.server.tool()` for plain tools. To add MCP Apps (interactive UI), you need to add the ext-apps SDK:

```bash
npm install @modelcontextprotocol/ext-apps
```

Then use `registerAppTool` and `registerAppResource` inside `init()`:

```typescript
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { readFileSync } from 'node:fs'

export class MyMCP extends McpAgent {
  server = new McpServer({ name: 'My App', version: '1.0.0' })

  async init() {
    const RESOURCE_URI = 'ui://my-app/widget.html'

    registerAppResource(this.server, RESOURCE_URI, RESOURCE_URI,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => ({
        contents: [{
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,  // your bundled single-file HTML
        }]
      })
    )

    registerAppTool(this.server, 'my_tool', {
      title: 'My Tool',
      description: '...',
      inputSchema: mySchema,
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    }, handler)
  }
}
```

### Cloudflare vs Vercel trade-offs

| | Cloudflare Workers | Vercel |
|-|-------------------|--------|
| **State** | Built-in via Durable Objects (SQLite) | Bring your own (Upstash Redis) |
| **Sessions** | Automatic (DO handles it) | Stateless (no sessions) |
| **OAuth** | Built-in via `agents/oauth` | Built-in via `mcp-handler` `withMcpAuth` |
| **SDK** | `agents` package (wraps MCP SDK) | Raw `@modelcontextprotocol/sdk` |
| **Scaffolding** | `npm create cloudflare` templates | Manual setup |
| **Local dev** | `wrangler dev` | `vercel dev` |
| **Cold starts** | ~0ms (V8 isolates) | ~250ms (Node.js) |
| **Persistence** | Durable Objects (SQLite), R2, KV | External (Upstash, Postgres, etc.) |
| **SSE push** | Yes (DO keeps connection alive) | Limited (serverless timeout) |
| **Complexity** | More concepts (DO, KV, bindings) | Simpler (just a function) |
| **Node compat** | `nodejs_compat` flag required | Native Node.js |

**Pick Cloudflare if:** you need per-session state, SSE push, or you're already on Cloudflare.
**Pick Vercel if:** you want the simplest possible deployment, or you need full Node.js compatibility.

### Route C checklist

- [ ] `npm create cloudflare` from template
- [ ] `McpAgent` subclass with tools registered in `init()`
- [ ] `wrangler.jsonc` has `nodejs_compat`, Durable Object binding, SQLite migration
- [ ] `npm start` runs locally, MCP Inspector connects to `http://localhost:8788/mcp`
- [ ] `npm run deploy` deploys to `workers.dev`
- [ ] Claude web Custom Connector points to deployed URL
- [ ] Claude Desktop uses `mcp-remote` bridge for stdio-to-HTTP
- [ ] For auth: GitHub OAuth app registered, secrets set, KV namespace created
- [ ] For MCP Apps UI: `@modelcontextprotocol/ext-apps` installed, `registerAppTool`/`registerAppResource` used
- [ ] Widget HTML bundled as single file and served via `ui://` resource

---

## Reference: Excalidraw MCP (Alternative Architecture)

The [excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp) repo takes a notably different approach from tldraw. Comparing the two reveals trade-offs worth understanding.

### Key Differences from tldraw

| Aspect | tldraw | Excalidraw |
|--------|--------|------------|
| **Deployment** | Local stdio only (no production hosting) | **Vercel serverless** at `mcp.excalidraw.com` |
| **Widget bundling** | Full single-file (all deps inlined) | **Externalized** — React, Excalidraw loaded from `esm.sh` CDN |
| **State persistence** | In-memory Map + localStorage | **3-tier**: File, Memory, or **Upstash Redis** (auto-selected) |
| **HTTP transport** | Stateful sessions (session ID map) | **Stateless** (new server per request, no session map) |
| **Checkpoint store** | Custom, no size limits | Path traversal protection, 5MB limit, 100-checkpoint cap |
| **Package distribution** | `"private": true`, not published | Published to npm as `@mcp-demos/excalidraw-server` |
| **Manifest** | None | `manifest.json` for MCP package format (`.mcpb`) |

### Excalidraw's Vercel Deployment

Excalidraw solves the "how do I actually host this" problem with a clean Vercel setup:

**`vercel.json`:**
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/mcp", "destination": "/api/mcp" },
    { "source": "/sse", "destination": "/api/mcp" },
    { "source": "/message", "destination": "/api/mcp" }
  ],
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Access-Control-Allow-Origin", "value": "*" },
      { "key": "Access-Control-Allow-Methods", "value": "GET, POST, DELETE, OPTIONS" },
      { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Accept, Authorization, Mcp-Session-Id" }
    ]
  }]
}
```

**`api/mcp.ts` (Vercel serverless function):**
```typescript
import { createMcpHandler } from "mcp-handler"
import { createVercelStore } from "../src/checkpoint-store.js"
import { registerTools } from "../src/server.js"

const store = createVercelStore()

const mcpHandler = createMcpHandler(
  (server) => registerTools(server, distDir, store),
  { serverInfo: { name: "Excalidraw", version: "1.0.0" } },
  { basePath: "", maxDuration: 60, sessionIdGenerator: undefined },
)

export { handler as GET, handler as POST, handler as DELETE }
```

This is **stateless** — every request creates a fresh `McpServer`. No session map, no in-memory transport cache. State lives in the checkpoint store.

### Excalidraw's Stateless HTTP Pattern

Unlike tldraw (which maintains a `Map<string, transport>` for session reuse), Excalidraw sets `sessionIdGenerator: undefined` — disabling sessions entirely:

```typescript
// Excalidraw: stateless, new server per request
app.all("/mcp", async (req, res) => {
  const server = createServer()  // fresh server every time
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // no sessions
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

// vs tldraw: stateful, session reuse
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"]
  if (sessionId && transports.has(sessionId)) {
    return transports.get(sessionId)!.handleRequest(req, res, req.body)
  }
  // ...create new transport only if no existing session
})
```

**Stateless pros:** Works on serverless (Vercel, Lambda), no memory leaks, scales horizontally for free.
**Stateless cons:** Can't do SSE push notifications, no persistent connection for real-time updates.

### Excalidraw's CDN-Based Widget (Not Single-File)

Instead of bundling React and Excalidraw into the HTML, Excalidraw **externalizes** them to `esm.sh`:

```typescript
// vite.config.ts
rollupOptions: {
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime",
             "@excalidraw/excalidraw", "morphdom"],
  output: {
    paths: {
      "react": "https://esm.sh/react@19.0.0",
      "react-dom": "https://esm.sh/react-dom@19.0.0?deps=react@19.0.0",
      "@excalidraw/excalidraw": "https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@19.0.0,react-dom@19.0.0",
      "morphdom": "https://esm.sh/morphdom@2.7.8",
    },
  },
},
```

This means:
- The widget HTML is **much smaller** (only custom code, not the full React + Excalidraw bundle)
- But it **requires CSP to allow `esm.sh`** as a `resourceDomain`
- If `esm.sh` goes down, the widget breaks
- Trade-off: faster resource fetch vs external dependency

### Excalidraw's 3-Tier Checkpoint Store

```typescript
// Auto-selects based on environment
function createVercelStore(): CheckpointStore {
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) {
    return new RedisCheckpointStore()   // Production: Upstash Redis, 30-day TTL
  }
  return new MemoryCheckpointStore()    // Fallback: in-memory Map
}

// For local CLI use
new FileCheckpointStore()  // Writes to os.tmpdir()/excalidraw-mcp-checkpoints/
```

Security features:
- Path traversal protection (resolved path verification)
- 5MB per checkpoint limit
- 100 checkpoint cap with FIFO eviction
- Alphanumeric + hyphen/underscore IDs only (max 64 chars)

### Excalidraw's Export-to-Web Tool

A unique feature — server-side CORS proxy that uploads diagrams to excalidraw.com:

- Implements Excalidraw v2 binary format
- Zlib deflate compression
- AES-GCM 128-bit encryption
- Uploads to excalidraw.com API
- Returns shareable link

### `.mcpb` Package Format

Excalidraw supports the MCP package format:
```bash
mcpb pack .  # produces a .mcpb file users can double-click to install
```

This is defined in `manifest.json`:
```json
{
  "manifest_version": "0.3",
  "name": "excalidraw-mcp-app",
  "server": {
    "type": "node",
    "entry_point": "dist/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/index.js", "--stdio"]
    }
  },
  "tools": [
    { "name": "read_me", "description": "..." },
    { "name": "create_view", "description": "..." }
  ]
}
```

### What to Learn from Excalidraw

1. **Vercel is the easiest production deployment** — `vercel.json` + `api/mcp.ts` and you're done
2. **Stateless HTTP scales better on serverless** — no session map to manage
3. **External persistence (Redis) is essential** for stateless deployments
4. **CDN externals reduce widget size** but add CSP complexity and external dependency
5. **`mcp-handler` package** simplifies Vercel integration (handles routing, CORS, session lifecycle)
6. **`.mcpb` packaging** gives users a one-click install experience
7. **File-based checkpoints for local** + Redis for production is a clean separation
8. **Security hardening** on checkpoint store (path traversal, size limits, ID validation) is production-ready practice

---

## Reference: tldraw Implementation

Branch: `tldraw-mcp-server` in the tldraw repo.

| File | Purpose |
|------|---------|
| `apps/tldraw-mcp-app/main.ts` | stdio transport entry point (14 lines) |
| `apps/tldraw-mcp-app/server.ts` | All tool/resource registration (425 lines) |
| `apps/tldraw-mcp-app/src/widget/mcp-app.tsx` | Full widget: streaming, persistence, preview (884 lines) |
| `apps/tldraw-mcp-app/src/focused-shape.ts` | Simplified shape format + Zod schemas |
| `apps/tldraw-mcp-app/src/parse-json.ts` | Streaming/partial JSON parsing helpers |
| `apps/tldraw-mcp-app/vite.config.ts` | Single-file build config |
| `apps/tldraw-mcp/src/main.ts` | HTTP + stdio dual-transport entry point (85 lines) |

Key architectural decisions in tldraw:
- Checkpoint system with LRU eviction (max 200)
- Dual persistence: server memory + widget localStorage
- Streaming preview via partial JSON healing
- `structuredContent` carries tldraw records to the widget
- App-only tools (`read_checkpoint`, `save_checkpoint`) for widget-server state sync
- `FocusedShape` abstraction: simplified shape format for LLM consumption, converted to/from raw tldraw records

---

## Resources

- [MCP Apps Overview](https://modelcontextprotocol.io/extensions/apps/overview)
- [Build Guide](https://modelcontextprotocol.io/extensions/apps/build)
- [API Documentation](https://apps.extensions.modelcontextprotocol.io/api/)
- [Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [ext-apps GitHub Repo](https://github.com/modelcontextprotocol/ext-apps) (SDK + examples)
- [Client Support Matrix](https://modelcontextprotocol.io/extensions/client-matrix)
- [Patterns & Best Practices](https://apps.extensions.modelcontextprotocol.io/api/documents/Patterns.html)
- [Quickstart](https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html)
- [MCP-UI Client Framework](https://github.com/MCP-UI-Org/mcp-ui) (for building hosts)
- [Example Apps](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples) (React, Vue, Svelte, Preact, Solid, vanilla JS)

### Agent Skills (for AI coding agents)

```bash
# Claude Code
/plugin marketplace add modelcontextprotocol/ext-apps
/plugin install mcp-apps@modelcontextprotocol-ext-apps

# Or via Vercel Skills CLI
npx skills add modelcontextprotocol/ext-apps
```

Available skills: `create-mcp-app`, `migrate-oai-app`, `add-app-to-server`, `convert-web-app`.
