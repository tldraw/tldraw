---
name: convert-web-app
description: This skill should be used when the user asks to "add MCP App support to my web app", "turn my web app into a hybrid MCP App", "make my web page work as an MCP App too", "wrap my existing UI as an MCP App", "convert iframe embed to MCP App", "turn my SPA into an MCP App", or needs to add MCP App support to an existing web application while keeping it working standalone. Provides guidance for analyzing existing web apps and creating a hybrid web + MCP App with server-side tool and resource registration.
---

# Add MCP App Support to a Web App

Add MCP App support to an existing web application so it works both as a standalone web app **and** as an MCP App that renders inline in MCP-enabled hosts like Claude Desktop — from a single codebase.

## How It Works

The existing web app stays intact. A thin initialization layer detects whether the app is running inside an MCP host or as a regular web page, and fetches parameters from the appropriate source. A new MCP server wraps the app's bundled HTML as a resource and registers a tool to display it.

```
Standalone:  Browser loads page → App reads URL params / APIs → renders
MCP App:     Host calls tool → Server returns result → Host renders app in iframe → App reads MCP lifecycle → renders
```

The app's rendering logic is shared — only the data source changes.

## Getting Reference Code

Clone the SDK repository for working examples and API documentation:

```bash
git clone --branch "v$(npm view @modelcontextprotocol/ext-apps version)" --depth 1 https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```

### API Reference (Source Files)

Read JSDoc documentation directly from `/tmp/mcp-ext-apps/src/`:

| File | Contents |
|------|----------|
| `src/app.ts` | `App` class, handlers (`ontoolinput`, `ontoolresult`, `onhostcontextchanged`, `onteardown`), lifecycle |
| `src/server/index.ts` | `registerAppTool`, `registerAppResource`, tool visibility options |
| `src/spec.types.ts` | All type definitions: `McpUiHostContext`, CSS variable keys, display modes |
| `src/styles.ts` | `applyDocumentTheme`, `applyHostStyleVariables`, `applyHostFonts` |
| `src/react/useApp.tsx` | `useApp` hook for React apps |
| `src/react/useHostStyles.ts` | `useHostStyles`, `useHostStyleVariables`, `useHostFonts` hooks |

### Framework Templates

Learn and adapt from `/tmp/mcp-ext-apps/examples/basic-server-{framework}/`:

| Template | Key Files |
|----------|-----------|
| `basic-server-vanillajs/` | `server.ts`, `src/mcp-app.ts`, `mcp-app.html` |
| `basic-server-react/` | `server.ts`, `src/mcp-app.tsx` (uses `useApp` hook) |
| `basic-server-vue/` | `server.ts`, `src/App.vue` |
| `basic-server-svelte/` | `server.ts`, `src/App.svelte` |
| `basic-server-preact/` | `server.ts`, `src/mcp-app.tsx` |
| `basic-server-solid/` | `server.ts`, `src/mcp-app.tsx` |

### Reference Examples

| Example | Relevant Pattern |
|---------|-----------------|
| `examples/map-server/` | External API integration + CSP (`connectDomains`, `resourceDomains`) |
| `examples/sheet-music-server/` | Library that loads external assets (soundfonts) |
| `examples/pdf-server/` | Binary content handling + app-only helper tools |

## Step 1: Analyze the Existing Web App

Before writing any code, examine the existing web app to plan what needs to change.

### What to Investigate

1. **Data sources** — How does the app get its data? (URL params, API calls, props, hardcoded, localStorage)
2. **External dependencies** — CDN scripts, fonts, API endpoints, iframe embeds, WebSocket connections
3. **Build system** — Current bundler (Webpack, Vite, Rollup, none), framework (React, Vue, vanilla), entry points
4. **User interactions** — Does the app have inputs/forms that should map to tool parameters?
5. **Runtime detection** — How to tell if the app is running inside an MCP host (e.g., check the current origin, a query param, or whether `window.parent !== window`)

Present findings to the user and confirm the approach.

### Data Source Mapping

In hybrid mode, the app keeps its existing data sources for standalone use and adds MCP equivalents:

| Standalone data source | MCP App equivalent |
|---|---|
| URL query parameters | `ontoolinput` / `ontoolresult` `arguments` or `structuredContent` |
| REST API calls | `app.callServerTool()` to server-side tools, or keep direct API calls with CSP `connectDomains` |
| Props / component inputs | `ontoolinput` `arguments` |
| localStorage / sessionStorage | Not available in sandboxed iframe — pass via `structuredContent` or server-side state |
| WebSocket connections | Keep with CSP `connectDomains`, or convert to polling via app-only tools |
| Hardcoded data | Move to tool `structuredContent` to make it dynamic |

## Step 2: Investigate CSP Requirements

MCP Apps HTML runs in a sandboxed iframe with no same-origin server. **Every** external origin must be declared in CSP — missing origins fail silently.

**Before writing any code**, build the app and investigate all origins it references:

1. Build the app using the existing build command
2. Search the resulting HTML, CSS, and JS for **every** origin (not just "external" origins — every network request will need CSP approval)
3. For each origin found, trace back to source:
   - If it comes from a constant → universal (same in dev and prod)
   - If it comes from an env var or conditional → note the mechanism and identify both dev and prod values
4. Check for third-party libraries that may make their own requests (analytics, error tracking, etc.)

**Document your findings** as three lists, and note for each origin whether it's universal, dev-only, or prod-only:

- **resourceDomains**: origins serving images, fonts, styles, scripts
- **connectDomains**: origins for API/fetch requests
- **frameDomains**: origins for nested iframes

If no origins are found, the app may not need custom CSP domains.

## Step 3: Set Up the MCP Server

Create a new MCP server with tool and resource registration. This wraps the existing web app for MCP hosts.

### Dependencies

```bash
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod
npm install -D tsx vite vite-plugin-singlefile
```

Use `npm install` to add dependencies rather than manually writing version numbers. This lets npm resolve the latest compatible versions. Never specify version numbers from memory.

### Server Code

Create `server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0.0" });

const resourceUri = "ui://my-app/mcp-app.html";

// Register the tool — inputSchema maps to the app's data sources
registerAppTool(server, "show-app", {
  description: "Displays the app with the given parameters",
  inputSchema: { query: z.string().describe("The search query") },
  _meta: { ui: { resourceUri } },
}, async (args) => {
  // Process args server-side if needed
  return {
    content: [{ type: "text", text: `Showing app for: ${args.query}` }],
    structuredContent: { query: args.query },
  };
});

// Register the HTML resource
registerAppResource(server, {
  uri: resourceUri,
  name: "My App UI",
  mimeType: RESOURCE_MIME_TYPE,
  // Add CSP domains from Step 2 if needed:
  // _meta: { ui: { connectDomains: ["api.example.com"], resourceDomains: ["cdn.example.com"] } },
}, async () => {
  const html = await fs.readFile(
    path.resolve(import.meta.dirname, "dist", "mcp-app.html"),
    "utf-8",
  );
  return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }] };
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build:ui": "vite build",
    "build:server": "tsc",
    "build": "npm run build:ui && npm run build:server",
    "serve": "tsx server.ts"
  }
}
```

## Step 4: Adapt the Build Pipeline

The MCP App build must produce a single HTML file using `vite-plugin-singlefile`. The standalone web app build stays unchanged.

### Vite Configuration

Create or update `vite.config.ts`. If the app already uses Vite, add `vite-plugin-singlefile` and a separate entry point for the MCP App build. If it uses another bundler, add a Vite config alongside for the MCP App build only.

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "mcp-app.html",
    },
  },
});
```

Add framework-specific Vite plugins as needed (e.g., `@vitejs/plugin-react` for React, `@vitejs/plugin-vue` for Vue).

### HTML Entry Point

Create `mcp-app.html` as a separate entry point for the MCP App build. This can point to the same app code — the runtime detection handles the rest:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCP App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

### Two-Phase Build

1. Vite bundles the UI → `dist/mcp-app.html` (single file with all assets inlined)
2. Server is compiled separately (TypeScript → JavaScript)

The standalone web app continues to build and deploy as before.

## Step 5: Add MCP App Initialization Alongside Existing Logic

This is the core step. Instead of replacing the app's data sources, add an alternative initialization path for MCP mode. The app detects its environment at startup and reads parameters from the right source.

### The Hybrid Pattern

```typescript
import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";

// Detect whether we're running inside an MCP host.
// Choose a detection method that fits the app:
//   - Origin check: window.location.origin !== 'https://myhost.com'
//   - Null origin (sandboxed iframe): window.location.origin === 'null'
//   - Query param: new URL(location.href).searchParams.has('mcp')
const isMcpApp = window.location.origin === "null";

async function getParameters(): Promise<Record<string, string>> {
  if (isMcpApp) {
    // Running as MCP App — get params from tool lifecycle
    const app = new App({ name: "My App", version: "1.0.0" });

    // Register handlers BEFORE connect()
    const params = await new Promise<Record<string, string>>((resolve) => {
      app.ontoolresult = (result) => resolve(result.structuredContent ?? {});
    });

    await app.connect(new PostMessageTransport());
    return params;
  } else {
    // Running as standalone web app — get params from URL
    return Object.fromEntries(new URL(location.href).searchParams);
  }
}

async function main() {
  const params = await getParameters();
  renderApp(params); // Same rendering logic for both modes
}

main().catch(console.error);
```

### URL Parameters (Hybrid)

```typescript
// Before (standalone only):
const query = new URL(location.href).searchParams.get("q");
renderApp(query);

// After (hybrid):
async function getQuery(): Promise<string> {
  if (isMcpApp) {
    const app = new App({ name: "My App", version: "1.0.0" });
    return new Promise((resolve) => {
      app.ontoolinput = (params) => resolve(params.arguments?.q ?? "");
      app.connect(new PostMessageTransport());
    });
  }
  return new URL(location.href).searchParams.get("q") ?? "";
}

const query = await getQuery();
renderApp(query); // Unchanged rendering logic
```

### API Calls (Hybrid)

```typescript
// Before (standalone only):
const data = await fetch("/api/data").then(r => r.json());

// After (hybrid):
async function fetchData(): Promise<any> {
  if (isMcpApp) {
    const result = await app.callServerTool("fetch-data", {});
    return result.structuredContent;
  }
  return fetch("/api/data").then(r => r.json());
}
```

Or keep direct API calls in both modes with CSP `connectDomains`:

```typescript
// API calls can stay unchanged if the API is external and the CSP declares the domain
// Declare connectDomains: ["api.example.com"] in the resource registration
```

### localStorage / sessionStorage (Hybrid)

```typescript
// Before (standalone only):
const saved = localStorage.getItem("settings");

// After (hybrid) — localStorage isn't available in sandboxed iframes:
function getSettings(): any {
  if (isMcpApp) {
    // Will be provided via tool result
    return null; // or a default
  }
  return JSON.parse(localStorage.getItem("settings") ?? "null");
}
```

### Complete Hybrid Example

```typescript
import { App, PostMessageTransport, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "@modelcontextprotocol/ext-apps";

const isMcpApp = window.location.origin === "null";

async function initMcpApp(): Promise<Record<string, any>> {
  const app = new App({ name: "My App", version: "1.0.0" });

  // Register ALL handlers BEFORE connect()
  const params = await new Promise<Record<string, any>>((resolve) => {
    app.ontoolinput = (input) => resolve(input.arguments ?? {});
  });

  app.onhostcontextchanged = (ctx) => {
    if (ctx.theme) applyDocumentTheme(ctx.theme);
    if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
    if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
    if (ctx.safeAreaInsets) {
      const { top, right, bottom, left } = ctx.safeAreaInsets;
      document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  };

  app.onteardown = async () => {
    return {};
  };

  await app.connect(new PostMessageTransport());
  return params;
}

async function initStandaloneApp(): Promise<Record<string, any>> {
  return Object.fromEntries(new URL(location.href).searchParams);
}

async function main() {
  const params = isMcpApp ? await initMcpApp() : await initStandaloneApp();
  renderApp(params); // Same rendering logic — no fork needed
}

main().catch(console.error);
```

## Step 6: Add Host Styling Integration (MCP Mode Only)

When running as an MCP App, integrate with host styling for theme consistency. Use CSS variable fallbacks so the app looks correct in both modes.

**Vanilla JS** — use helper functions:
```typescript
import { applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "@modelcontextprotocol/ext-apps";

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};
```

**React** — use hooks:
```typescript
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

const { app } = useApp({ appInfo, capabilities, onAppCreated });
useHostStyles(app);
```

**Using variables in CSS** — use `var()` with fallbacks so standalone mode still looks right:

```css
.container {
  background: var(--color-background-secondary, #f5f5f5);
  color: var(--color-text-primary, #333);
  font-family: var(--font-sans, system-ui);
  border-radius: var(--border-radius-md, 8px);
}
```

Key variable groups: `--color-background-*`, `--color-text-*`, `--color-border-*`, `--font-sans`, `--font-mono`, `--font-text-*-size`, `--font-heading-*-size`, `--border-radius-*`. See `src/spec.types.ts` for the full list.

## Optional Enhancements

### App-Only Helper Tools

For data the UI needs to poll or fetch that the model doesn't need to call directly:

```typescript
registerAppTool(server, "refresh-data", {
  description: "Fetches latest data for the UI",
  _meta: { ui: { resourceUri, visibility: ["app"] } },
}, async () => {
  const data = await getLatestData();
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
```

The UI calls these via `app.callServerTool("refresh-data", {})`.

### Streaming Partial Input

For large tool inputs, use `ontoolinputpartial` to show progress during LLM generation:

```typescript
app.ontoolinputpartial = (params) => {
  const args = params.arguments; // Healed partial JSON - always valid
  renderPreview(args);
};

app.ontoolinput = (params) => {
  renderFull(params.arguments);
};
```

### Fullscreen Mode

```typescript
app.onhostcontextchanged = (ctx) => {
  if (ctx.availableDisplayModes?.includes("fullscreen")) {
    fullscreenBtn.style.display = "block";
  }
  if (ctx.displayMode) {
    container.classList.toggle("fullscreen", ctx.displayMode === "fullscreen");
  }
};

async function toggleFullscreen() {
  const newMode = currentMode === "fullscreen" ? "inline" : "fullscreen";
  const result = await app.requestDisplayMode({ mode: newMode });
  currentMode = result.mode;
}
```

### Text Fallback

Always provide a `content` array for non-UI hosts:

```typescript
return {
  content: [{ type: "text", text: "Fallback description of the result" }],
  structuredContent: { /* data for the UI */ },
};
```

## Common Mistakes to Avoid

1. **Forgetting CSP declarations for external origins** — fails silently in the sandboxed iframe
2. **Using `localStorage` / `sessionStorage` in MCP mode** — not available in sandboxed iframe; use fallbacks or pass via `structuredContent`
3. **Missing `vite-plugin-singlefile`** — external assets won't load in the iframe
4. **Registering handlers after `connect()`** — register ALL handlers BEFORE calling `app.connect()`
5. **Hardcoding styles without fallbacks** — use host CSS variables with `var(..., fallback)` so both modes look correct
6. **Not handling safe area insets** — always apply `ctx.safeAreaInsets` in `onhostcontextchanged`
7. **Forgetting text `content` fallback** — always provide `content` array for non-UI hosts
8. **Forgetting resource registration** — the tool references a `resourceUri` that must have a matching resource
9. **Replacing standalone logic instead of branching** — keep the original data sources intact; add the MCP path alongside them

## Testing

### Using basic-host

Test the MCP App mode with the basic-host example:

```bash
# Terminal 1: Build and run your server
npm run build && npm run serve

# Terminal 2: Run basic-host (from cloned repo)
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
# Open http://localhost:8080
```

Configure `SERVERS` with a JSON array of your server URLs (default: `http://localhost:3001/mcp`).

### Verify

1. **MCP mode**: App loads in basic-host without console errors
2. `ontoolinput` handler fires with tool arguments
3. `ontoolresult` handler fires with tool result
4. Host styling (theme, fonts, colors) applies correctly
5. External resources load (if CSP domains are configured)
6. **Standalone mode**: App still works when opened directly in a browser
