---
name: create-mcp-app
description: This skill should be used when the user asks to "create an MCP App", "add a UI to an MCP tool", "build an interactive MCP View", "scaffold an MCP App", or needs guidance on MCP Apps SDK patterns, UI-resource registration, MCP App lifecycle, or host integration. Provides comprehensive guidance for building MCP Apps with interactive UIs.
---

# Create MCP App

Build interactive UIs that run inside MCP-enabled hosts like Claude Desktop. An MCP App combines an MCP tool with an HTML resource to display rich, interactive content.

## Core Concept: Tool + Resource

Every MCP App requires two parts linked together:

1. **Tool** - Called by the LLM/host, returns data
2. **Resource** - Serves the bundled HTML UI that displays the data
3. **Link** - The tool's `_meta.ui.resourceUri` references the resource

```
Host calls tool → Server returns result → Host renders resource UI → UI receives result
```

## Quick Start Decision Tree

### Framework Selection

| Framework | SDK Support | Best For |
|-----------|-------------|----------|
| React | `useApp` hook provided | Teams familiar with React |
| Vanilla JS | Manual lifecycle | Simple apps, no build complexity |
| Vue/Svelte/Preact/Solid | Manual lifecycle | Framework preference |

### Project Context

**Adding to existing MCP server:**
- Import `registerAppTool`, `registerAppResource` from SDK
- Add tool registration with `_meta.ui.resourceUri`
- Add resource registration serving bundled HTML

**Creating new MCP server:**
- Set up server with transport (stdio or HTTP)
- Register tools and resources
- Configure build system with `vite-plugin-singlefile`

## Getting Reference Code

Clone the SDK repository for working examples and API documentation:

```bash
git clone --branch "v$(npm view @modelcontextprotocol/ext-apps version)" --depth 1 https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```

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

Each template includes:
- Complete `server.ts` with `registerAppTool` and `registerAppResource`
- Client-side app with all lifecycle handlers
- `vite.config.ts` with `vite-plugin-singlefile`
- `package.json` with all required dependencies
- `.gitignore` excluding `node_modules/` and `dist/`

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

### Advanced Examples

| Example | Pattern Demonstrated |
|---------|---------------------|
| `examples/shadertoy-server/` | **Streaming partial input** + visibility-based pause/play (best practice for large inputs) |
| `examples/wiki-explorer-server/` | `callServerTool` for interactive data fetching |
| `examples/system-monitor-server/` | Polling pattern with interval management |
| `examples/video-resource-server/` | Binary/blob resources |
| `examples/sheet-music-server/` | `ontoolinput` - processing tool args before execution completes |
| `examples/threejs-server/` | `ontoolinputpartial` - streaming/progressive rendering |
| `examples/map-server/` | `updateModelContext` - keeping model informed of UI state |
| `examples/transcript-server/` | `updateModelContext` + `sendMessage` - background context updates + user-initiated messages |
| `examples/basic-host/` | Reference host implementation using `AppBridge` |

## Critical Implementation Notes

### Adding Dependencies

Use `npm install` to add dependencies rather than manually writing version numbers:

```bash
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod
```

This lets npm resolve the latest compatible versions. Never specify version numbers from memory.

### TypeScript Server Execution

Use `tsx` as a devDependency for running TypeScript server files:

```bash
npm install -D tsx
```

```json
"scripts": {
  "serve": "tsx server.ts"
}
```

Note: The SDK examples use `bun` but generated projects should use `tsx` for broader compatibility.

### Handler Registration Order

Register ALL handlers BEFORE calling `app.connect()`:

```typescript
const app = new App({ name: "My App", version: "1.0.0" });

// Register handlers first
app.ontoolinput = (params) => { /* handle input */ };
app.ontoolresult = (result) => { /* handle result */ };
app.onhostcontextchanged = (ctx) => { /* handle context */ };
app.onteardown = async () => { return {}; };

// Then connect
await app.connect();
```

### Tool Visibility

Control who can access tools via `_meta.ui.visibility`:

```typescript
// Default: visible to both model and app
_meta: { ui: { resourceUri, visibility: ["model", "app"] } }

// UI-only (hidden from model) - for refresh buttons, form submissions
_meta: { ui: { resourceUri, visibility: ["app"] } }

// Model-only (app cannot call)
_meta: { ui: { resourceUri, visibility: ["model"] } }
```

### Host Styling Integration

**Vanilla JS** - Use helper functions:
```typescript
import { applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "@modelcontextprotocol/ext-apps";

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};
```

**React** - Use hooks:
```typescript
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

const { app } = useApp({ appInfo, capabilities, onAppCreated });
useHostStyles(app); // Injects CSS variables to document, making var(--*) available
```

**Using variables in CSS** - After applying, use `var()`:
```css
.container {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  border-radius: var(--border-radius-md);
}
.code {
  font-family: var(--font-mono);
  font-size: var(--font-text-sm-size);
  line-height: var(--font-text-sm-line-height);
  color: var(--color-text-secondary);
}
.heading {
  font-size: var(--font-heading-lg-size);
  font-weight: var(--font-weight-semibold);
}
```

Key variable groups: `--color-background-*`, `--color-text-*`, `--color-border-*`, `--font-sans`, `--font-mono`, `--font-text-*-size`, `--font-heading-*-size`, `--border-radius-*`. See `src/spec.types.ts` for full list.

### Safe Area Handling

Always respect `safeAreaInsets`:

```typescript
app.onhostcontextchanged = (ctx) => {
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
};
```

### Streaming Partial Input

For large tool inputs, use `ontoolinputpartial` to show progress during LLM generation. The partial JSON is healed (always valid), enabling progressive UI updates.

**Spec:** [ui/notifications/tool-input-partial](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx#streaming-tool-input)

```typescript
app.ontoolinputpartial = (params) => {
  const args = params.arguments; // Healed partial JSON - always valid, fields appear as generated
  // Use args directly for progressive rendering
};

app.ontoolinput = (params) => {
  // Final complete input - switch from preview to full render
};
```

**Use cases:**
| Pattern | Example |
|---------|---------|
| Code preview | Show streaming code in `<pre>`, render on complete (`examples/shadertoy-server/`) |
| Progressive form | Fill form fields as they stream in |
| Live chart | Add data points to chart as array grows |
| Partial render | Render incomplete structured data (tables, lists, trees) |

**Simple pattern (code preview):**
```typescript
app.ontoolinputpartial = (params) => {
  codePreview.textContent = params.arguments?.code ?? "";
  codePreview.style.display = "block";
  canvas.style.display = "none";
};
app.ontoolinput = (params) => {
  codePreview.style.display = "none";
  canvas.style.display = "block";
  render(params.arguments);
};
```

### Visibility-Based Resource Management

Pause expensive operations (animations, WebGL, polling) when view scrolls out of viewport:

```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animation.play(); // or: startPolling(), shaderToy.play()
    } else {
      animation.pause(); // or: stopPolling(), shaderToy.pause()
    }
  });
});
observer.observe(document.querySelector(".main"));
```

### Fullscreen Mode

Request fullscreen via `app.requestDisplayMode()`. Check availability in host context:

```typescript
let currentMode: "inline" | "fullscreen" = "inline";

app.onhostcontextchanged = (ctx) => {
  // Check if fullscreen available
  if (ctx.availableDisplayModes?.includes("fullscreen")) {
    fullscreenBtn.style.display = "block";
  }
  // Track current mode
  if (ctx.displayMode) {
    currentMode = ctx.displayMode;
    container.classList.toggle("fullscreen", currentMode === "fullscreen");
  }
};

async function toggleFullscreen() {
  const newMode = currentMode === "fullscreen" ? "inline" : "fullscreen";
  const result = await app.requestDisplayMode({ mode: newMode });
  currentMode = result.mode;
}
```

**CSS pattern** - Remove border radius in fullscreen:
```css
.main { border-radius: var(--border-radius-lg); overflow: hidden; }
.main.fullscreen { border-radius: 0; }
```

See `examples/shadertoy-server/` for complete implementation.

## Common Mistakes to Avoid

1. **Handlers after connect()** - Register ALL handlers BEFORE calling `app.connect()`
2. **Missing single-file bundling** - Must use `vite-plugin-singlefile`
3. **Forgetting resource registration** - Both tool AND resource must be registered
4. **Missing resourceUri link** - Tool must have `_meta.ui.resourceUri`
5. **Ignoring safe area insets** - Always handle `ctx.safeAreaInsets`
6. **No text fallback** - Always provide `content` array for non-UI hosts
7. **Hardcoded styles** - Use host CSS variables for theme integration
8. **No streaming for large inputs** - Use `ontoolinputpartial` to show progress during generation

## Testing

### Using basic-host

Test MCP Apps locally with the basic-host example:

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

### Debug with sendLog

Send debug logs to the host application (rather than just the iframe's dev console):

```typescript
await app.sendLog({ level: "info", data: "Debug message" });
await app.sendLog({ level: "error", data: { error: err.message } });
```
