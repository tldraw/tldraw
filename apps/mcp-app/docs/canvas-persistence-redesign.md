# Canvas persistence redesign

A proposal for restructuring how the MCP app persists canvases, executes code, and manages widgets. The goal: code always applies to the correct canvas, the model can edit any previous canvas by ID, and forking is intentional rather than an accident of widget spawning.

## Summary

Today's architecture keys state by MCP session, coordinates the exec round trip through host-mediated tool calls and a hash rendezvous, and treats each spawned widget as the owner of its own copy of the canvas — so every edit forks. The proposal changes the ownership model and the transport, and deliberately does *not* change where code executes or what the tool surface looks like:

1. **A canvas is a per-canvas Durable Object room**, addressed by `idFromName(canvasId)`. The crypto-random `canvasId` riding in tool arguments and results is the *only* durable key. Nothing is keyed by MCP session, ever.
2. **Code still executes in the widget, against the real live editor** — but the room DO dispatches it server → widget over our own WebSocket channel with a server-minted execId, and the result comes back over our own channel too. The host is no longer in the coordination loop; `ontoolinput` parsing, debounce guards, the sha256 rendezvous, and `_exec_callback` session roulette are all deleted.
3. **`exec` keeps its UI resource and stays the only editing tool.** Every exec spawns a view (spec-mandated), but every view is a live sync client of the same room — so the scrollback shows N views of one truth instead of N diverging forks. Duplication becomes cosmetic, is softened by supersession now, and disappears entirely when hosts ship `widgetSessionId` (ext-apps #430), with zero tool-surface change on our side.

No headless editor. No new model-facing tools for the core design. Forks happen only via an explicit `forkFrom` argument. Net code shrinks: the replacement components are mostly ports of existing proven code (the sync-cloudflare template DO, today's `CanvasStore` waiter pattern).

## What we verified

These facts shaped the design. Each was confirmed against the installed `@modelcontextprotocol/ext-apps` 1.1.2 package, the spec repos, host issue trackers, or this codebase.

**The fork-per-call behavior is spec-baked, not a host bug.** The MCP Apps lifecycle is exactly one tool call per app instance: `sendToolInput` "is sent exactly once" per view, and there is no widget-state, instance-reuse, or instance-targeting affordance anywhere in the protocol (verified by enumerating all 16 `ui/*` methods in the 1.1.2 schema). Any tool with `_meta.ui.resourceUri` spawns a fresh iframe on every call, on every conformant host. Host-enforced supersession is coming: `widgetSessionId` in tool-result `_meta.ui` (ext-apps issue #430 / PR #295, endorsed by OpenAI, who already ship it proprietarily) makes the host tear down earlier widgets sharing the ID. Returning `canvasId` in `structuredContent` today is forward-compatible with it.

**Session keying is formally dead.** SEP-2567 ("Sessionless MCP via explicit state handles", merged May 2026 into the 2026-07-28 release candidate) removes `Mcp-Session-Id` entirely, on the explicit rationale that clients never scoped sessions to conversations. The blessed replacement is server-minted handles passed as ordinary tool arguments — exactly the `canvasId` pattern. Claude's split routing (widget-initiated calls ride a different session than model-initiated ones, ext-apps #481) is spec-compliant and unfixable app-side. The excalidraw-mcp app (the strongest prior art) already works this way: a global store keyed only by server-minted IDs, widget as pure renderer.

**Sync rooms in Durable Objects are a solved problem here.** `templates/sync-cloudflare/worker/TldrawDurableObject.ts` is a complete ~160-line hibernation-aware room DO (`TLSocketRoom` over `SQLiteSyncStorage`). The server can mutate a room with zero clients connected (`updateStore` validates every record), and external writes auto-broadcast to connected clients with per-session down-migration. Idle rooms hibernate to storage-only cost. The sync protocol has server → client custom messages (`sendCustomMessage`) but no client → server custom messages, so the widget's return path is a separate channel (below).

**Two channels we currently rely on are unreliable.** `updateModelContext` has been silently dropped on Claude web (claude-ai-mcp #102) and goes stale on ChatGPT; it must be advisory-only, never a correctness channel. And per CSP3, a `https://` entry in `connectDomains` does **not** match `wss:` — WebSockets need an explicit `wss://` entry, and whether each host passes it through is an open empirical question. Note also: today's widget makes *zero* direct network calls to the worker — everything is host-proxied `callServerTool` — so direct widget↔worker transport is an assumption to verify per host, not a fact. The design keeps a host-proxied fallback at every layer.

**Global rendezvous keys are a cross-user leak.** JSON-RPC request ids are per-session counters (effectively always `1`–`2` on ChatGPT's session-per-call model) and the hash of identical code is a worldwide constant, so any *globally addressed* claim store keyed on either would hand one user's canvasId — a bearer write capability — to another user's widget. All coordination must be scoped inside the canvas's own room DO, and brand-new canvases (where no shared secret exists yet) must not have a synchronous claim path at all.

## Design principles

- **The model is the session bus.** The only identifier that survives host session churn is what the model itself carries between turns. Everything keys off `canvasId` (handles need ≥128 bits of entropy — they are bearer capabilities on a public server).
- **The room is the truth; widgets are views that can also run code.** A widget holds no authority. A canvas outlives any widget, any conversation, and (with a stated retention window) the chat itself.
- **Coordinate on our own transport.** The host is used for exactly two things: rendering iframes and carrying `canvasId` through tool args/results. Everything else — code dispatch, results, state, liveness — rides worker↔widget channels we control, so host divergence in event ordering stops having correctness blast radius.
- **Fork is a verb the model says, never a side effect.**
- **Treat host behavior as an empirical matrix, not a spec reading.** Ship the probe app first; pick between pre-designed fallbacks based on measurements.
- **Keep the executor pluggable.** The exec contract (code in, result + canvasId out, state authoritative in the room) doesn't name its executor. Today that's the spawned widget; a headless executor could slot in later behind the same tool without any contract change (appendix).

## Recommended architecture

### Canvas rooms

New `CanvasRoom` DO class (ported from the sync-cloudflare template), one per canvas, `idFromName(canvasId)`:

- `TLSocketRoom` over `SQLiteSyncStorage` — authoritative record state, hibernation-aware WebSockets, ping/pong auto-response.
- **Exec coordination**: a jobs table (`execId` UUID, code, status `queued | dispatched | done | failed | expired`, result, timestamps) plus in-memory waiters — today's `CanvasStore` waiter pattern (`canvas-store.ts:39-95`) ported intact, but keyed by server-minted UUID execIds inside the canvas's own DO instead of a global hash address. Jobs are FIFO and single-flight per room; queued jobs expire after ~2 minutes so create-time code can't fire surprisingly late.
- Lineage metadata (`parentCanvasId`, `forkedAtSeq`) and, optionally later, a lightweight `versions` table (one row per exec / coalesced user-edit session) that enables `canvas_history` and `canvas_revert` as pure additions.
- A row in a global index DO written at creation. Durable Objects cannot be enumerated, so retention, quotas, deletion, and any future `list_canvases` all require this index from day one.

The `TldrawMCP` McpAgent DO keeps only its transport role. Its session-keyed `checkpoints` / `canvas_checkpoints` tables are deleted.

### The exec flow

`exec({ code, canvasId?, forkFrom? })` keeps its `_meta.ui.resourceUri` — every call spawns a view, and that view doubles as a guaranteed-fresh executor. The handler routes by canvasId to the room DO; all coordination happens there.

**Editing an existing canvas** (the model passed `canvasId`, so the spawned widget has it in its own `ontoolinput` args — no identity dance):

1. Handler mints a UUID execId, enqueues the job in the room, and awaits the room's waiter (one bounded ~10s window, well under Claude Desktop's ~60s ceiling).
2. The room picks an executor. If an already-connected widget is *live* — judged by `getWebSocketAutoResponseTimestamp()` ping recency, since hibernation auto-response means the DO never otherwise observes liveness — dispatch there immediately via `sendCustomMessage` (fast path: no cold boot). Otherwise the widget this very call spawned connects within a few seconds, announces its canvasId, and claims the queued job.
3. The widget executes through the existing focused-editor-proxy + exec-helpers against the live synced editor. Document changes stream to the room through ordinary sync push as the code runs, so every other open view of that canvas updates in place, mid-execution.
4. The result returns over the widget's own channel (below) and resolves the waiter; the tool returns the return value + state digest + `structuredContent: { canvasId }`.
5. Liveness rules on a missed result: executor socket *closed* mid-exec → re-dispatch to the next-liveliest socket (widget-side execId dedup makes this safe if the first never ran). Socket alive with *fresh* pings but no result → do **not** re-dispatch (the code may have run with the report lost — room state already reflects it); answer from `getCurrentSnapshot`, explicitly marked unconfirmed. *Stale* pings prove a frozen iframe that never executed → safe to re-dispatch.
6. Timeout is no longer a lie: state is server-authoritative, and the model recovers deterministically via `get_canvas` (which also reports job status: queued / dispatched / done / expired).

**Creating a new canvas** (no canvasId in args): the fresh widget cannot learn its server-minted canvasId until the tool result lands, and there is no safe global rendezvous (see verified facts). So first-draw is explicitly async: the handler mints the canvasId, queues the job, and returns immediately — "Canvas `c_…` created; the view is rendering and your code is executing. Call `get_canvas` if you need to confirm the result." The widget reads canvasId from `ontoolresult.structuredContent` (fallback: parse of the result text), connects, pulls the pending job, executes, and commits. Same UX as today's graceful-timeout path, minus the ambiguity.

**Fork**: `exec({ forkFrom: 'c_abc' })` (or `c_abc@version` once the versions table exists) — snapshot the parent room, `loadSnapshot` into a fresh room (its one legitimate use; never on a live room, where it force-disconnects clients), record lineage, then run the code there. The original canvas and its views are untouched.

**Serialization and hygiene**: one in-flight exec per room (FIFO); per-exec record/byte budgets enforced at apply; during exec the widget also nulls `window.WebSocket` and keeps the sync-client handle unreachable from the exec scope (model code already gets `fetch`/timers nulled today).

### The widget

Still spawned per exec; becomes a live sync client that can also execute.

- Swap the storeless `<Tldraw>` for a `useSync` store (stub asset store — images are already blocked by `ImageDropGuard`) connected to `/api/connect/:canvasId`.
- `workerOrigin` is baked at build time via a Vite env var; the method map is bundled instead of injected. Bootstrap injection dies; the widget HTML becomes fully, safely host-cacheable.
- The widget's per-invocation inputs shrink to `canvasId` (+ implicit "there may be a job for me"), taken idempotently from `ontoolinput` or `ontoolresult`. It never executes based on host events — the room tells it what to run. The debounce timers, `hasExecRunRef`, and partial-JSON parsing are deleted.
- User edits flow up the sync socket natively. `onteardown` (today a no-op) and `pagehide` flush pending pushes and clear the instance's `updateModelContext` slot. Context updates are advisory one-liners ("user edited canvas X: moved 2 shapes"); authoritative state always comes from tool results served from the room.
- **Supersession**: duplicate views of one canvas are consistent duplicates (they follow the same room). Older instances grey out via BroadcastChannel — all widgets of a connector share a per-conversation origin on Claude (the documented pattern) — and stop pushing model context. When hosts ship `widgetSessionId`, stamp it with `canvasId` and the host collapses old views natively; the BroadcastChannel path retires per host.

### Transport ladder

Chosen per host by the probe, with a working rung guaranteed at the bottom:

1. **WebSocket** — add `wss://<worker-host>` to `connectDomains` (one-line change; CSP3 requires the explicit scheme).
2. **SSE + POST** via `useSync`'s custom `TLPersistentClientSocket` option — same architecture, different pipe.
3. **Host-proxied app-only tools** (`_get_canvas_state`, `_push_user_edit`, `_exec_result` — all canvasId-keyed, therefore session-safe by construction). This is today's proven transport: no live updates, snapshot-on-boot plus polling, but correct on any host whose sandbox proxy blocks direct network entirely.

The exec *result* return path uses the same ladder (POST to the room, falling back to the app-only tool).

### Tool surface

| Tool | UI resource | Purpose |
| --- | --- | --- |
| `exec({ code, canvasId?, forkFrom? })` | yes (unchanged) | Run code. Omit `canvasId` → new canvas (async first draw). `canvasId` → edit that canvas in place; all open views update live. `forkFrom` → copy into a new canvas and apply the code there. Empty code + `canvasId` re-displays a canvas. |
| `get_canvas({ canvasId })` | no | Latest state + exec job status. The timeout-recovery and TUI read path. |
| `search` | no | Unchanged. |
| `canvas_history` / `canvas_revert` | no | Optional later phase, backed by the versions table. Not a dependency of anything above. |

Every result carries `structuredContent: { canvasId }` and prose instructions for continuing or forking. App-only tools shrink to the fallback-transport trio above plus live legacy shims (below).

### TUI hosts

Honest degradation, since code needs a browser somewhere:

- `get_canvas` and `forkFrom` work fully (pure server-side room operations).
- `exec` works **if any live client of that canvas is connected** — including the `/c/:canvasId` share page: the same widget bundle served as a standalone page. A Claude Code user opens the link once and thereafter has a working executor *and* watches the agent edit live in a real browser tab. With nothing connected, `exec` fails fast with the share URL and clear instructions instead of hanging.
- Optional flourishes, off the hot path: a PNG of the canvas as an image content block in tool results (Browser Rendering, cached by `documentClock`); phase-3 MCP OAuth for `list_canvases` and cross-conversation continuity. Until then, the share URL embedding the handle is the cheap cross-conversation bridge.

### Operations layer (v1, not later)

- **Retention**: idle-canvas TTL via DO alarms (e.g. 30 days, refreshed on access), stated in tool results; `delete_canvas` for user-initiated removal. Both need the global index DO.
- **Quotas**: per-canvas storage/record caps enforced at apply; a global canvas-minting rate per IP.
- **Rate limiting**: a separate namespace for widget routes keyed by `canvasId` (host sandbox proxies NAT many users behind few IPs; a 429 on the result path is a correctness failure, not throttling).
- **Observability**: un-gate the logger from `isDev` and define the funnel metrics that gate each rollout flag: exec success rate per host, widget boot-to-connect rate, dispatch-vs-fresh-spawn ratio, timeout frequency, transport-rung distribution, legacy-widget population (`widgetVersion` stamped on every widget call).

### Legacy compatibility

Hosts cache widget HTML durably, so months-old widgets will keep calling the current server:

- Keep `_get_canvas_state` and `save_checkpoint` as **live shims** proxying the room (`getCurrentSnapshot` / validated `updateStore`), not no-op stubs.
- Version the HTTP surface (`/api/v1/...`); minimum-version handshake on `/connect` that returns a human-readable "reload this canvas" state; bump the resource-URI version segment on schema-affecting deploys.
- Retire shims only when `widgetVersion` telemetry says the cached population has rolled over.
- Legacy canvas data: lazy, best-effort — on first touch of an old-format `canvasId`, attempt the old `canvas_checkpoints` lookup and seed the room; otherwise return "canvas not found, starting blank" explicitly.

## The host probe app

Ships first, behind a `PROBE_ENABLED` flag on the *same worker* (so it observes real caching, real session routing, real sandbox proxies). One `probe_start` tool with a UI resource, a tiny instrumented widget, an app-only `_probe_report`, and a `ProbeLog` DO producing a re-runnable host × behavior matrix.

What it measures per host — each row resolves a question this design actually depends on:

1. Direct network from the iframe: fetch GET/POST, SSE, WebSocket — including a `wss://` `connectDomains` entry, inspecting the effective CSP. **This picks the transport rung and is now load-bearing for live sync.**
2. Lifecycle event order, count, and timing (`ontoolinputpartial` / `ontoolinput` / `ontoolresult` / `onteardown` / `ontoolcancelled`), and whether `structuredContent` reaches `ontoolresult` per connector type (remote vs stdio).
3. Offscreen lifecycle: heartbeat + WebSocket ping continuity from a scrolled-away widget — how real are frozen iframes, and after how long? (Feeds the executor-liveness thresholds.)
4. Sandbox origin sharing: localStorage nonce + BroadcastChannel ping between two instances (feeds supersession).
5. Session split: `mcp-session-id` of widget-initiated vs model-initiated calls; `hostContext.toolInfo.id` presence and shape.
6. HTML cache staleness (baked build timestamp vs server version); measured tool-call timeout ceilings; whether `sendSizeChanged` actually resizes; `updateModelContext` round-trip.
7. Capability vs reality: hosts that advertise MCP Apps but render empty boxes (Claude Code Desktop does) — feeds a runtime "no widget connected within N seconds → degrade to share URL" fallback.

No architectural decision *gates* on a probe result — probes pick between pre-designed fallbacks. The matrix stays as a permanent regression harness re-run after every host update.

## What gets deleted

Verified dead today (shippable immediately, no behavior change): the entire `pendingBootstrap` machinery (implemented, never called), the `read_checkpoint` tool (never called by the widget), `activeCheckpointId` (write-only), `src/tools/loadCachedCanvasWidgetHtml.ts` (zero importers), stale R2 comments, plus flipping the logger on in production.

Deleted by the redesign: `src/shared/exec-key.ts`, `src/shared/pending-requests.ts`, the two-source race + `validate()` + `notBefore` machinery in `tools/exec.ts`, the `CanvasStore` global exec-waiter addressing (the waiter pattern itself moves into the room), `_exec_callback` as a coordination channel (survives only as a legacy shim), the session-keyed checkpoint tables, the widget's debounce/dedup/`hasExecRunRef` block, the `applySnapshot` hydration flow (replaced by sync), the localStorage checkpoint keying, and per-invocation bootstrap injection. Kept and load-bearing: the focused proxy, `exec-helpers.ts`, `forceAutoSize`, `CANVAS_RESOURCE_URI` stability + the compat resource template, and the `search` tool.

## De-risking order

1. **Probe matrix** across Claude web/desktop, ChatGPT, Cursor, VS Code, Claude Code Desktop (~1 week). Transport is the load-bearing unknown: live sync needs rung 1 or 2 somewhere.
2. **useSync viewer inside a real host iframe** (~3 days, after the probe picks the transport): does live in-place updating of an already-rendered inline widget actually work; does reconnect survive scroll-away/freeze/resume.
3. **Dispatch semantics test** (~2 days): sendCustomMessage → execute → result → waiter resolution end-to-end in a deployed room DO, including the liveness rules (kill the executor mid-run; freeze it; drop the result) and FIFO serialization under concurrent execs.
4. **Cached-widget field study** (calendar time; start early): re-add the connector across hosts over weeks; log which HTML build actually spawns and which app-only calls it makes. Sets the real shim window.

## Alternatives considered

- **Split `exec` / `show_canvas`** (resource off exec, explicit display tool). Kills duplicate iframes today, but adds a tool, a model-behavior dependency (forget `show_canvas` → invisible canvas), and — without a server-side executor — a real gap: resource-less exec has no executor when no widget is live, forcing a queue-then-show dance. Duplication under exec-with-resource is cosmetic (live sync) and is the exact problem `widgetSessionId` solves host-side. Revisit only if host supersession stalls *and* view clutter proves to be a real user complaint.
- **Server-side headless exec** (real `Editor` + DOM shim + font-metrics text measurement in the existing `LOADER` sandbox). The strongest end state on paper — synchronous results always, TUI exec, no iframe-liveness machinery — and it slots behind the same `exec` contract if ever wanted. Deliberately not pursued now: tldraw has never run the editor headless, and the fidelity work (text measurement) is a research project this redesign shouldn't depend on. See appendix.
- **Minimal surgical fix** (keep everything, re-key by canvasId, single waiter, convergence by polling). ~5–7 person-weeks and genuinely better than today — but it keeps host-mediated coordination (the `ontoolinput` trigger, the in-call race) and most of its content is already contained in this proposal. Worth falling back to only if the sync-viewer spike fails on every transport rung.
- **Full event-sourced commit DAG** (content-addressed snapshots, amend semantics, branch refs). The history *features* are adopted in lightweight form (versions table, later); the full DAG adds compaction and 2MB-per-value hazards without adding model-facing capability.
- **State-through-model-context only** (no server persistence). Rejected: canvas state is too large for context round-trips, `updateModelContext` is demonstrably lossy, and forking semantics become undefined.

## Effort

Roughly **7–9 person-weeks** for one person familiar with the codebase:

- Probe app + host matrix: 1–1.5 pw
- `CanvasRoom` DO (room + jobs/waiters + lineage + index DO + ops layer) + routes + wrangler migration: 2 pw
- Exec tool rewrite (routing, job lifecycle, liveness rules, async new-canvas path) + `get_canvas`: 1 pw
- Widget rework (useSync store, dispatch listener, result channel, supersession, teardown flush, deletions): 1.5–2 pw
- Transport fallbacks (SSE socket, app-only rungs), legacy shims, `/c/:canvasId` share page: 1 pw
- Migrations, telemetry-gated rollout, host-matrix validation: 1 pw

The dead-code cleanup and the probe app are independently shippable this week. `canvas_history`/`canvas_revert` add ~1 pw whenever wanted.

## Open questions

- Which hosts pass `wss://` `connectDomains` through, and which allow any direct iframe network at all (probe question 1 — determines the transport rung per host).
- The blessed non-deprecated replacement for `TLSocketRoom.updateStore` for server-initiated writes (fork seeding, shims) — same monorepo, agree with the sync team.
- New-canvas first draw is async by design. If telemetry shows models mishandling it (not calling `get_canvas` when needed), options: richer result prose, or a bounded post-return wait on the *next* tool call touching that canvas.
- Multi-page canvases: rooms store full documents so pages work naturally, but the focused digest is single-page today. Recommendation: keep exec's documented surface single-page at launch; decide page support deliberately later.
- Presence: suppress entirely, or show a cursor for the executing widget in other open views?
- Share-page permissions: bearer canvasId read/write at launch (unlisted-doc posture), signed read-only links before promoting sharing as a feature.
- When `widgetSessionId` (#430) lands per host: map it to `canvasId`, then retire the BroadcastChannel supersession path for that host.
- Exec cancellation: honor `ontoolcancelled` by expiring the queued/dispatched job and not applying a late result.

## Appendix: headless execution as a future executor

The exec contract above (code in; result + canvasId out; state authoritative in the room; executor chosen by the room) doesn't name its executor, so a server-side one can be added later without changing the model-facing surface: a real `Editor` instantiated headless in the existing `LOADER` dynamic-worker sandbox (`globalOutbound: null`, the `search` tool's pattern), with a workerd DOM shim and font-metrics-based text measurement.

Feasibility notes from the investigation, recorded for whenever this becomes interesting: `TestEditor` already runs the full Editor + default shape utils without a browser (jsdom + a ~30-line text-measure stub); ~50% of the public Editor surface is pure record/store work and ~15% is geometry that is pure math *except* where text metrics feed shape geometry; the widget already self-heals stale measurements via `forceAutoSize` (though not for text shapes — `TLTextShape` has no `h` prop); and the main engineering risks are the multi-MB React-carrying bundle vs Worker Loader module limits, the DOM-shim iteration tail, and text-measurement fidelity for model-facing bounds. If it ever ships, it upgrades new-canvas execs to synchronous, gives TUI hosts full execution, and removes the iframe-liveness machinery — all behind the same `exec` tool.
