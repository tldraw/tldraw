---
name: migrate-oai-app
description: This skill should be used when the user asks to "migrate from OpenAI Apps SDK", "convert OpenAI App to MCP", "port from window.openai", "migrate from skybridge", "convert openai/outputTemplate", or needs guidance on converting OpenAI Apps SDK applications to MCP Apps SDK. Provides step-by-step migration guidance with API mapping tables.
---

# Migrate OpenAI App to MCP

Migrate existing OpenAI Apps SDK applications to the MCP Apps SDK (`@modelcontextprotocol/ext-apps`). The MCP Apps SDK provides a standardized, open protocol for interactive UIs in conversational clients.

## Best Practices

- Use your package manager to add dependencies (e.g., `npm install`, `pnpm add`, `yarn add`) instead of manually writing version numbers. This lets the package manager resolve the latest compatible versions. Never specify version numbers from memory.
- Preemptively add a final todo item with this exact wording: "Re-read the 'Before Finishing' checklist in this skill and address each checkbox individually, stating what you did for each one, before marking this todo complete."

## Getting Reference Code

Clone the SDK repository for complete migration documentation and working examples:

```bash
git clone --branch "v$(npm view @modelcontextprotocol/ext-apps version)" --depth 1 https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```

### Migration Reference Guide

Read the migration reference guide with "before/after" mapping tables: `/tmp/mcp-ext-apps/docs/migrate_from_openai_apps.md`

### API Reference (Source Files)

Read JSDoc documentation directly from `/tmp/mcp-ext-apps/src/*`:

| File | Contents |
|------|----------|
| `src/app.ts` | `App` class, handlers, lifecycle |
| `src/server/index.ts` | `registerAppTool`, `registerAppResource` |
| `src/spec.types.ts` | Type definitions |
| `src/react/useApp.tsx` | `useApp` hook for React apps |
| `src/react/use*.ts*` | Other `use*` hooks for React apps |

### Front-End Framework Examples

See `/tmp/mcp-ext-apps/examples/basic-server-{framework}/` for basic SDK usage examples organized by front-end framework:

| Template | Key Files |
|----------|-----------|
| `basic-server-vanillajs/` | `server.ts`, `src/mcp-app.ts`, `mcp-app.html` |
| `basic-server-react/` | `server.ts`, `src/mcp-app.tsx` (uses `useApp` hook) |
| `basic-server-vue/` | `server.ts`, `src/App.vue` |
| `basic-server-svelte/` | `server.ts`, `src/App.svelte` |
| `basic-server-preact/` | `server.ts`, `src/mcp-app.tsx` |
| `basic-server-solid/` | `server.ts`, `src/mcp-app.tsx` |

## CSP Investigation

MCP Apps HTML is served as an MCP resource, not as a web page, and runs in a sandboxed iframe with no same-origin server. **Every** origin must be declared in CSP—including the origin serving your JS/CSS bundles (`localhost` in dev, your CDN in production). Missing origins fail silently.

**Before writing any migration code**, build the app and investigate all origins it references:

1. Build the app using the existing build command
2. Search the resulting HTML, CSS, and JS for **every** origin (not just "external" origins—every network request will need CSP approval)
3. For each origin found, trace back to source:
   - If it comes from a constant → universal (same in dev and prod)
   - If it comes from an env var or conditional → note the mechanism and identify both dev and prod values
4. Check for third-party libraries that may make their own requests (analytics, error tracking, etc.)

**Document your findings** as three lists, and note for each origin whether it's universal, dev-only, or prod-only:

- **resourceDomains**: origins serving images, fonts, styles, scripts
- **connectDomains**: origins for API/fetch requests
- **frameDomains**: origins for nested iframes

If no origins are found, the app may not need custom CSP domains.

## CORS Configuration

MCP clients make cross-origin requests. If using Express, `app.use(cors())` handles this.

For raw HTTP servers, configure standard CORS and additionally:
- Allow headers: `mcp-session-id`, `mcp-protocol-version`, `last-event-id`
- Expose headers: `mcp-session-id`

## Key Conceptual Changes

### Server-Side

Use `registerAppTool()` and `registerAppResource()` helpers instead of raw `server.registerTool()` / `server.registerResource()`. These helpers handle the MCP Apps metadata format automatically.

See `/tmp/mcp-ext-apps/docs/migrate_from_openai_apps.md` for server-side mapping tables.

### Client-Side

The fundamental paradigm shift: OpenAI uses a synchronous global object (`window.openai.toolInput`, `window.openai.theme`) that's pre-populated before your code runs. MCP Apps uses an `App` instance with async event handlers.

Key differences:
- Create an `App` instance and register handlers (`ontoolinput`, `ontoolresult`, `onhostcontextchanged`) **before** calling `connect()`. (Events may fire immediately after connection, so handlers must be registered first.)
- Access tool data via handlers: `app.ontoolinput` for `window.openai.toolInput`, `app.ontoolresult` for `window.openai.toolOutput`.
- Access host environment (theme, locale, etc.) via `app.getHostContext()`.

For React apps, the `useApp` hook manages this lifecycle automatically—see `basic-server-react/` for the pattern.

See `/tmp/mcp-ext-apps/docs/migrate_from_openai_apps.md` for client-side mapping tables.

### Features Not Yet Available in MCP Apps

These OpenAI features don't have MCP equivalents yet:

**Server-side:**
| OpenAI Feature | Status/Workaround |
|----------------|-------------------|
| `_meta["openai/toolInvocation/invoking"]` / `_meta["openai/toolInvocation/invoked"]` | Progress indicators not yet available |
| `_meta["openai/widgetDescription"]` | Use `app.updateModelContext()` for dynamic context |

**Client-side:**
| OpenAI Feature | Status/Workaround |
|----------------|-------------------|
| `window.openai.widgetState` / `setWidgetState()` | Use `localStorage` or server-side state |
| `window.openai.uploadFile()` / `getFileDownloadUrl()` | File operations not yet available |
| `window.openai.requestModal()` / `requestClose()` | Modal management not yet available |
| `window.openai.view` | Not yet available |

## Before Finishing

Slow down and carefully follow each item in this checklist:

- [ ] Search for and migrate any remaining server-side OpenAI patterns:

    | Pattern | Indicates |
    |---------|-----------|
    | `"openai/` | Old metadata keys → `_meta.ui.*` |
    | `text/html+skybridge` | Old MIME type → `RESOURCE_MIME_TYPE` constant |
    | `text/html;profile=mcp-app` | New MIME type, but prefer `RESOURCE_MIME_TYPE` constant |
    | `_domains"` or `_domains:` | snake_case CSP → camelCase (`connect_domains` → `connectDomains`) |

- [ ] Search for and migrate any remaining client-side OpenAI patterns:

    | Pattern | Indicates |
    |---------|-----------|
    | `window.openai.toolInput` | Old global → `params.arguments` in `ontoolinput` handler |
    | `window.openai.toolOutput` | Old global → `params.structuredContent` in `ontoolresult` |
    | `window.openai` | Old global API → `App` instance methods |

- [ ] For each origin from your CSP investigation, show where it appears in the `registerAppResource()` CSP config. **Every** origin from the CSP investigation (universal, dev-only, prod-only) must be included in the CSP config—MCP Apps HTML runs in a sandboxed iframe **with no same-origin server**. If an origin was not included in the CSP config, add it now.

- [ ] For each conditional (dev-only, prod-only) origin from your CSP investigation, show the code where the same configuration setting (env var, config file, etc.) controls both the runtime URL and the CSP entry. If the CSP has a hardcoded origin that should be conditional, fix it now—the app must be production-ready.

## Testing

### Using basic-host

Test the migrated app with the basic-host example:

```bash
# Terminal 1: Build and run your server
npm run build && npm run serve

# Terminal 2: Run basic-host (from cloned repo)
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
# Open http://localhost:8080
```

### Verify Runtime Behavior

Once the app loads in basic-host, confirm:
1. App loads without console errors
2. `ontoolinput` handler fires with tool arguments
3. `ontoolresult` handler fires with tool result
