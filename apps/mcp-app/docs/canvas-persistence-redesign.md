# Canvas persistence redesign

A proposal for restructuring how the MCP app persists canvases, executes code, and manages widgets. The goal: code always applies to the correct canvas, the model can edit any previous canvas by ID, and forking is intentional rather than an accident of widget spawning.

## Summary

Today's architecture executes code inside the widget iframe, keys state by MCP session, and gives the `exec` tool a UI resource — so every edit spawns a new widget that forks the old canvas. All three of those choices fight the platform, and the platform is winning.

The proposal inverts each one:

1. **A canvas is a per-canvas Durable Object room**, addressed by `idFromName(canvasId)`. The crypto-random `canvasId` riding in tool arguments and results is the *only* durable key. Nothing is keyed by MCP session, ever.
2. **`exec` loses its UI resource and runs server-side** — a headless real `Editor` in the same sandboxed dynamic-worker isolate the `search` tool already uses. The result is computed inside the tool call: no rendezvous, no timeout races, and TUI hosts (Claude Code, Codex) get full functionality.
3. **The widget becomes a pure live viewer**, spawned only by an explicit `show_canvas` tool. Every widget for a canvas is a sync client of the same room, so old views in the chat update in place instead of going stale. Forks happen only via an explicit `forkFrom` argument.

This deletes the exec-key rendezvous, the `PendingRequests` race, the 4s/8s host-dependent windows, `_exec_callback`, the session-keyed checkpoint tables, the localStorage keying heuristics, and the widget's `ontoolinput` debounce/dedup machinery — and replaces them with less code that has verified in-repo precedent (the sync-cloudflare template DO, the search tool's `LOADER` sandbox, `TestEditor`'s headless editor).

## What we verified

These facts shaped the design. Each was confirmed against the installed `@modelcontextprotocol/ext-apps` 1.1.2 package, the spec repos, host issue trackers, or this codebase.

**The fork-per-call behavior is spec-baked, not a host bug.** The MCP Apps lifecycle is exactly one tool call per app instance: `sendToolInput` "is sent exactly once" per view, and there is no widget-state, instance-reuse, or instance-targeting affordance anywhere in the protocol (verified by enumerating all 16 `ui/*` methods in the 1.1.2 schema). Any tool with `_meta.ui.resourceUri` spawns a fresh iframe on every call, on every conformant host. The only compliant fix is to stop putting a resource on the editing tool. (Host-enforced supersession — `widgetSessionId`, ext-apps issue #430 / PR #295 — is coming and already ships proprietarily in ChatGPT; returning `canvasId` in `structuredContent` today is forward-compatible with it.)

**Session keying is formally dead.** SEP-2567 ("Sessionless MCP via explicit state handles", merged May 2026 into the 2026-07-28 release candidate) removes `Mcp-Session-Id` entirely, on the explicit rationale that clients never scoped sessions to conversations. The blessed replacement is server-minted handles passed as ordinary tool arguments — exactly the `canvasId` pattern. Claude's split routing (widget-initiated calls ride a different session than model-initiated ones, ext-apps #481) is spec-compliant and unfixable app-side. The excalidraw-mcp app (the strongest prior art) already works this way: a global store keyed only by checkpoint ID, state resolved server-side inside the model's own tool call, widget as pure renderer.

**The exec surface is the full Editor, not a curated API.** The focused proxy passes any unmapped method through to the raw editor (`focused-editor-proxy.ts:385-391`) and the `search` tool documents all ~288 public `Editor` members. Roughly 50% are pure record/store operations, ~15% geometry (pure math over records *except* text measurement), ~35% viewport/camera/UI (safe to no-op headless). The single hard DOM dependency is text measurement (`growY`, note `fontSizeAdjustment`, text shape sizing — `TLTextShape` has no `h` prop at all).

**Headless execution has in-repo precedent.** `TestEditor` (`packages/tldraw/src/test/TestEditor.ts`) instantiates the real `Editor` plus all default shape utils in jsdom with a ~30-line text-measurement stub. The `Editor` constructor needs no React — just store, utils, tools, and `getContainer()`. And the widget already self-heals stale measurements: `applySnapshot` runs `forceAutoSize` on every server-provided snapshot, so the system already treats incoming auto-size dimensions as approximate.

**Server-side model code execution is already accepted in production.** The `search` tool runs model-authored JavaScript in a dynamic-worker isolate via the `LOADER` binding with `globalOutbound: null` (`search.ts:49-86`) — a strictly stronger sandbox than the widget's window-global nulling.

**Sync rooms in Durable Objects are a solved problem here.** `templates/sync-cloudflare/worker/TldrawDurableObject.ts` is a complete ~160-line hibernation-aware room DO (`TLSocketRoom` over `SQLiteSyncStorage`). The server can mutate a room with zero clients connected (`updateStore` validates every record), and external writes auto-broadcast to connected clients with per-session down-migration. Idle rooms hibernate to storage-only cost.

**Two channels we currently rely on are unreliable.** `updateModelContext` has been silently dropped on Claude web (claude-ai-mcp #102) and goes stale on ChatGPT; it must be advisory-only, never a correctness channel. And per CSP3, a `https://` entry in `connectDomains` does **not** match `wss:` — WebSockets need an explicit `wss://` entry, and whether each host passes it through is an open empirical question. Note also: today's widget makes *zero* direct network calls to the worker — everything is host-proxied `callServerTool` — so direct widget↔worker transport is an assumption to verify per host, not a fact.

## Design principles

- **The model is the session bus.** The only identifier that survives host session churn is what the model itself carries between turns. Everything keys off `canvasId` (and handles need ≥128 bits of entropy — they are bearer capabilities on a public server).
- **Resolve state server-side, inside the tool call.** If the semantic result of `exec` is computed before the tool returns, every host behaves identically and the round-trip machinery disappears.
- **Views are cheap and disposable; the canvas is not.** Widgets render and forward user edits. They hold no authority. A canvas outlives any widget, any conversation, and (with a stated retention window) the chat itself.
- **Fork is a verb the model says, never a side effect.**
- **Treat host behavior as an empirical matrix, not a spec reading.** Ship the probe app first; pick between pre-designed fallbacks based on measurements.

## Recommended architecture

### Canvas rooms

New `CanvasRoom` DO class (ported from the sync-cloudflare template), one per canvas, `idFromName(canvasId)`:

- `TLSocketRoom` over `SQLiteSyncStorage` — authoritative record state, hibernation-aware WebSockets, ping/pong auto-response.
- A lightweight `versions` table: one row per exec and per coalesced user-edit session (`seq`, `note`, `author: 'model' | 'user'`, `code?`, `created_at`), plus lineage metadata (`parentCanvasId`, `forkedAtSeq`). This is deliberately *not* a full commit DAG — it gives `canvas_history`, `canvas_revert`, and fork-at-version without content-addressed snapshot plumbing.
- Persisted presentation hints (camera/zoom requests recorded by the headless editor), delivered to widgets on socket connect — not only as transient broadcasts, which a not-yet-spawned or frozen widget would miss.
- A row in a global index DO written at creation. Durable Objects cannot be enumerated, so retention, quotas, deletion, and any future `list_canvases` all require this index from day one.

The `TldrawMCP` McpAgent DO keeps only its transport role. Its session-keyed `checkpoints` / `canvas_checkpoints` tables are deleted.

### Execution: server-side headless exec (primary)

Rewritten `exec` handler flow:

1. Mint or resolve `canvasId`; take a **per-room async mutex** (DO input gates do *not* serialize across an awaited external call — two concurrent execs would otherwise snapshot the same base and clobber each other).
2. Pull `room.getCurrentSnapshot()`.
3. Run the model's code in a `LOADER` isolate (`globalOutbound: null`, ~10s wall clock), **dispatched from a throwaway stateless worker request, never from inside the DO** — the `Promise.race` timeout does not cancel a pegged isolate, and a runaway must burn a disposable request's CPU budget, not the room's.
4. The isolate contains: the real `Editor` + default shape/binding utils, a hand-rolled workerd DOM shim (jsdom does not run in workerd; `TestEditor` proves the required surface is small), a font-metrics text measurer (glyph advance tables generated at build time from tldraw's bundled fonts + a line breaker replicating TextManager's whole-pixel snapping; the `TestEditor` heuristic as the fallback tier), and the focused conversion layer moved to `src/shared/focused/` (it is data-pure). The method map becomes a real **allowlist** with a per-member `headless: 'full' | 'hint' | 'throws'` taxonomy surfaced through `search`: record + geometry methods run for real, camera/zoom/animate record presentation hints, DOM-flavored calls throw a named error.
5. Diff the resulting store against the input snapshot; **write back exclusively through the validating `updateStore` path** with per-exec record/byte budgets. Never `loadSnapshot` on a live room — it force-disconnects every client and clobbers concurrent user edits; reserve it for fork seeding.
6. Append a `versions` row; return synchronously: return value, state digest, `structuredContent: { canvasId, version }`, and prose telling the model how to continue or fork.

Shapes whose dimensions were computed headless get `meta: { headlessMeasured: true }`. Any connected widget re-measures them with the real DOM once, writes corrected w/h back through ordinary sync, and clears the flag — one-shot, first-widget-wins, no oscillation. This extends the existing `forceAutoSize` self-healing and covers text shapes, which `forceAutoSize` misses.

Model-visible consequences worth stating in the tool description: camera calls become display hints; a few px of text-bounds approximation until a view opens; DOM-touching calls fail fast with a clear error (strictly better than today's silent 10s widget timeout).

### Execution: widget dispatch (feature-flagged fallback tier)

Kept during headless bake-in, and as the pivot if the bundle-size spike fails (see de-risking). Code is dispatched **server → widget** over the room socket via `room.sendCustomMessage` with a **server-minted UUID execId** — never triggered from `ontoolinput`, and never keyed by JSON-RPC request ids or args hashes. (Both were shown to collide globally on a multi-tenant server: JSON-RPC ids are per-session counters — effectively always `1`–`2` on ChatGPT's session-per-call model — and the hash of empty create args is a worldwide constant. A global rendezvous on either would hand one user's canvas, a bearer write capability, to another user's widget.)

Executor liveness comes from `getWebSocketAutoResponseTimestamp()`: stale pings prove the iframe was frozen and the code never ran (frozen JS can't execute either) → safe to re-dispatch to the next-liveliest socket; fresh pings with a missing result → answer from room state, explicitly marked *unconfirmed*, never implied success. Results return over the socket or a canvasId-keyed app-only tool (below). This tier is deleted once headless-parity telemetry is green.

### The widget becomes a viewer

- Swap the storeless `<Tldraw>` for a `useSync` store (stub asset store — images are already blocked by `ImageDropGuard`) connected to `wss://<worker>/api/connect/:canvasId`.
- `workerOrigin` is baked at build time via a Vite env var (like the license key). Bootstrap injection dies; the widget HTML becomes fully, safely host-cacheable — embracing the caching instead of fighting it.
- The widget's only per-invocation input is `canvasId`, taken idempotently from whichever of `ontoolinput` / `ontoolresult.structuredContent` arrives first, with a parse of the tool-result *text* as the final fallback (structuredContent is dropped on some host paths). Connecting to the same room twice is a no-op, so the debounce/dedup machinery is deleted outright.
- User edits flow up the sync socket natively. `onteardown` (today a no-op) and `pagehide` flush pending pushes and clear the instance's `updateModelContext` slot. Context updates are advisory one-liners ("user edited canvas X: moved 2 shapes") referencing the handle; authoritative state always comes from tool results served from the room.
- Duplicate views of one canvas (the user asked twice, or a pre-#430 host) collapse via BroadcastChannel supersession — all widgets of a connector share a per-conversation origin on Claude (the officially documented pattern) — and they are *consistent* duplicates regardless, because they follow the same room.

**Transport ladder**, chosen per host by the probe: `wss://` (add to `connectDomains` — one-line change) → SSE + POST via `useSync`'s custom `TLPersistentClientSocket` option → polling. Additionally, keep thin **canvasId-keyed app-only tools** (`_get_canvas_state`, `_push_user_edit`) as a host-proxied fallback transport. They are session-safe by construction (routed by handle, not session) and cover any host whose sandbox proxy blocks direct network entirely — which, note, is today's status quo for all widget traffic.

### Tool surface

Model-visible — five tools, one handle type, plumbing invisible:

| Tool | UI resource | Purpose |
| --- | --- | --- |
| `exec({ code, canvasId?, forkFrom? })` | no | Run code. Omit `canvasId` → new canvas. `canvasId` → edit that canvas in place (all open views update live). `forkFrom` → copy that canvas (optionally `id@version`) into a new one and apply the code there. |
| `show_canvas({ canvasId })` | yes — the *only* one | Display a canvas. Called once per canvas; later execs update it live. Registered with a rich text fallback (share URL) so TUI degradation is automatic and does not depend on initialize-time capability gating surviving SEP-2567. |
| `get_canvas({ canvasId })` | no | Read latest state + pending/exec status. The timeout-recovery and TUI read path. |
| `canvas_history({ canvasId })` / `canvas_revert({ canvasId, to })` | no | Version list with notes ("v4 — user edit: moved 2 shapes"); revert appends, never rewrites. "Undo that" and "go back to the version with the blue circle" fall out for free. |
| `search` | no | Unchanged, plus the headless taxonomy annotations. |

Every result carries `structuredContent: { canvasId, version }` and prose instructions for continuing or forking. All four current app-only tools (`_exec_callback`, `_get_canvas_state`, `save_checkpoint`, `read_checkpoint`) are deleted from the primary path (the first two survive only as live legacy shims and fallback transport, below).

Note the new-canvas chicken-and-egg problem **dissolves** rather than being solved: since `exec` spawns no widget, there is no widget that needs to learn its identity mid-call. `canvasId` is minted in the handler, returned in the result, and arrives at any future widget as an ordinary `show_canvas` input argument — available at the earliest lifecycle event.

### TUI hosts and the share page

- `exec`, `get_canvas`, `canvas_history`, `canvas_revert`, and `forkFrom` work identically with zero widgets — they never needed one.
- `GET /c/:canvasId` serves the same widget bundle as a standalone live-syncing page. `show_canvas`'s text fallback returns this URL, so a Claude Code user clicks through and *watches the agent edit live in a browser tab* — arguably a better experience than an inline widget, and it makes the canvas a real, durable, shareable tldraw document that outlives the chat.
- Optional flourishes, off the hot path: a PNG of the canvas as an image content block in tool results (Browser Rendering, cached by `documentClock`); a transient "agent" presence cursor in the room while server-side exec applies changes; phase-3 MCP OAuth for `list_canvases` and cross-conversation continuity ("edit yesterday's diagram"). Until then, the share URL embedding the handle is the cheap cross-conversation bridge.

### Operations layer (v1, not later)

The adversarial reviews were unanimous that these cannot be deferred on a free public worker:

- **Retention**: idle-canvas TTL via DO alarms (e.g. 30 days, refreshed on access — excalidraw's model), stated in every tool result so the model and user know the contract. `delete_canvas` for user-initiated removal. Both need the global index DO.
- **Quotas**: per-canvas storage/record caps enforced at diff-apply; per-exec record/byte budgets; a global canvas-minting rate per IP.
- **Rate limiting**: a separate namespace for widget routes keyed by `canvasId` (host sandbox proxies NAT many users behind few IPs; the current 30 req/60s IP bucket would let one widget's reconnect storm throttle strangers, and a 429 on the result path is a correctness failure, not throttling).
- **Observability**: un-gate the logger from `isDev` (the paths being replaced were invisible in production) and define the funnel metrics that gate each rollout flag: exec success rate per host, widget boot-to-connect rate, timeout frequency, transport-rung distribution, legacy-widget population (`widgetVersion` stamped on every widget call).

### Legacy compatibility

Hosts cache widget HTML durably (this is why the `ui://show-canvas/{version}` compat template exists), so months-old widgets will keep calling the current server:

- Keep `_get_canvas_state` and `save_checkpoint` as **live shims** proxying the room (`getCurrentSnapshot` / validated `updateStore`), not no-op stubs — no-op stubs would render cached widgets as silently-empty canvases and drop user edits.
- Version the HTTP surface (`/api/v1/...`); minimum-version handshake on `/connect` that returns a human-readable "reload this canvas" state instead of a raw sync-protocol rejection; bump the resource-URI version segment on schema-affecting deploys.
- Retire shims only when `widgetVersion` telemetry says the cached population has rolled over.
- Legacy canvas data: lazy, best-effort — on first touch of an old-format `canvasId`, attempt the old `canvas_checkpoints` lookup and seed the room; otherwise return "canvas not found, starting blank" explicitly. (The old data was session-keyed and already unreliable; do not build enumeration machinery for it.)

## The host probe app

Ships first, behind a `PROBE_ENABLED` flag on the *same worker* (so it observes real caching, real session routing, real sandbox proxies). One `probe_start` tool with a UI resource, a tiny instrumented widget, an app-only `_probe_report`, and a `ProbeLog` DO producing a re-runnable host × behavior matrix (`probe_matrix` tool + `GET /probe/matrix`).

What it measures per host — each row resolves a factual dispute the designs actually disagreed on:

1. Lifecycle event order, count, and timing (`ontoolinputpartial` / `ontoolinput` / `ontoolresult` / `onteardown` / `ontoolcancelled`) — including whether `ontoolinput` reliably precedes the result (the current code defends against one host where it does not).
2. Session split: `mcp-session-id` of widget-initiated vs model-initiated calls (quantifies P3 per host).
3. `hostContext.toolInfo.id` presence and whether it equals server-side `extra.requestId` — and what the values look like (counter vs unique).
4. `structuredContent` delivery in `ontoolresult`, per connector type (remote vs stdio).
5. Sandbox origin sharing: localStorage nonce + BroadcastChannel ping between two instances.
6. Direct network from the iframe: fetch GET/POST, SSE, and WebSocket — including a `wss://` `connectDomains` entry, inspecting the effective CSP.
7. HTML cache staleness: build timestamp baked into the probe HTML vs current server version.
8. Offscreen lifecycle: heartbeat + ping continuity from a scrolled-away widget (are frozen iframes real, and after how long?).
9. `updateModelContext` round-trip; measured tool-call timeout ceilings; whether `sendSizeChanged` actually resizes.
10. Capability vs reality: hosts that advertise MCP Apps but render empty boxes (Claude Code Desktop does) — feeds a runtime "no widget connected within N seconds → degrade to share URL" fallback.

No architectural decision *gates* on a probe result — probes pick between pre-designed fallbacks (transport rung, boot channel, wait windows). The matrix stays as a permanent regression harness re-run after every host update.

## What gets deleted

Verified dead today (shippable immediately, no behavior change): the entire `pendingBootstrap` machinery (implemented, never called), the `read_checkpoint` tool (never called by the widget), `activeCheckpointId` (write-only), `src/tools/loadCachedCanvasWidgetHtml.ts` (zero importers), stale R2 comments, plus flipping the logger on in production.

Deleted by the redesign: `src/shared/exec-key.ts`, `src/shared/pending-requests.ts`, the two-source race + `validate()` + `notBefore` machinery in `tools/exec.ts`, the `CanvasStore` exec-waiter DO usage, `_exec_callback` and the app-only checkpoint tools (after the shim window), the session-keyed checkpoint tables, the widget's debounce/dedup/`hasExecRunRef` block, the `applySnapshot` hydration flow, the localStorage checkpoint keying, and per-invocation bootstrap injection. Net LOC goes down; every replacement component is mostly a port of existing proven code.

## De-risking order

1. **Headless engine boot spike** (~1 week; gates the primary/fallback fork). esbuild the real `Editor` + default utils + DOM shim; boot it under vitest-pool-workers *and* in a deployed `LOADER` isolate. The bundle ships React (ShapeUtil class methods don't tree-shake) and lands multi-MB — does it fit Worker Loader module limits, and what is per-call parse cost? Is ID-keyed isolate reuse or code-as-data (`eval` in the isolate) available to amortize it? **If this fails: pivot to widget-dispatch-primary** (the fallback tier becomes the main tier; the room architecture is unchanged). A middle option also exists: run the headless editor in trusted code with only the model's script isolated — but that puts an RPC boundary inside the synchronous `editor.*` API the models are trained on, so it is a last resort.
2. **Probe matrix** across Claude web/desktop, ChatGPT, Cursor, VS Code, Claude Code Desktop (~1 week, parallel with 1).
3. **useSync viewer inside a real host iframe** — does live in-place updating of an already-rendered inline widget actually work; does reconnect survive scroll-away/freeze (~3 days, after 2 picks the transport).
4. **Font-metrics measurer accuracy harness** — golden tests against real-browser measurements for the exec examples (geo `growY`, note autosize, text w/h, arrow labels) (~1 week, only after 1 passes).
5. **Room write-back semantics test** — `updateStore` validation + broadcast, a user push landing mid-exec under the mutex, and an empirical check that DO input gates do not serialize across awaits (~2 days).
6. **Cached-widget field study** — re-add the connector across hosts over weeks; log which HTML build actually spawns. Start early; it needs calendar time.

## Alternatives considered

- **Minimal surgical fix** (keep widget-side exec; re-key everything by `canvasId`; single execId-keyed waiter in a per-canvas DO; convergence via BroadcastChannel + polling; probe app). ~5–7 person-weeks. Genuinely better than today and much of it (handle keying, probe, ops, deletions) is *contained in* this proposal — but it keeps the iframe-per-exec spawn, keeps the in-call round-trip window, and leaves TUI hosts dead. Worth doing only if both the headless spike and the sync-viewer spike fail.
- **Full event-sourced commit DAG** (content-addressed snapshots, amend semantics, branch refs). The history *features* are valuable and are adopted here in lightweight form (`versions` table); the full DAG adds compaction, amend-reference, and 2MB-per-value hazards without adding model-facing capability.
- **Widget-exec sync rooms as the end state** (no headless engine). Viable — it is this proposal's fallback tier — but it leaves exec hostage to iframe liveness (frozen tabs, mobile remounts) and leaves TUI hosts read-only, so it is a pivot, not a preference.
- **State-through-model-context only** (no server persistence). Rejected: canvas state is too large for context round-trips, `updateModelContext` is demonstrably lossy, and forking semantics become undefined.

## Effort

Roughly 10–13 person-weeks to full parity for one person familiar with the codebase, parallelizable to ~7 calendar weeks with two:

- Spikes + probe app: 2–2.5 pw
- Headless engine (shim, measurer, allowlist taxonomy, diff serializer, golden tests): 3–4 pw — the long pole
- CanvasRoom DO + routes + versions/lineage + index DO + ops layer: 2 pw
- Tool rewrite + instructions + TUI fallbacks: 1 pw
- Widget rewrite (useSync viewer, reconcile pass, supersession, teardown flush, deletions): 1.5–2 pw
- Migrations, shims, host-matrix validation, telemetry-gated rollout: 1.5 pw

The dead-code cleanup and the probe app are independently shippable this week.

## Open questions

- Worker Loader beta → GA: module-size ceiling, isolate reuse, pricing (spike 1/5).
- Which hosts pass `wss://` `connectDomains` through, and which allow any direct iframe network at all (probe 6).
- The blessed non-deprecated replacement for `TLSocketRoom.updateStore` for server-initiated writes — same monorepo, agree on it with the sync team before building on it.
- Multi-page canvases: rooms store full documents so pages work naturally, but the focused digest and checkpoint format are single-page today. Recommendation: keep the exec allowlist single-page at launch (page APIs → clear error), decide page support deliberately later.
- Presence: suppress entirely, or ship the "agent cursor" during server-side exec?
- Share-page permissions: bearer canvasId read/write at launch (unlisted-doc posture), signed read-only links before promoting sharing as a feature.
- When ext-apps `widgetSessionId` (#430) lands: map it to `canvasId` so hosts collapse duplicate views natively, then retire BroadcastChannel supersession per host.
- Exec cancellation: honor `ontoolcancelled` / client disconnect by abandoning the isolate result and not writing back; adopt the Tasks extension if long-running drawing jobs ever matter.
