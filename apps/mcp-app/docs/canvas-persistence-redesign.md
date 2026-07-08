# Canvas persistence redesign

A proposal for restructuring how the MCP app persists canvases, executes code, and manages widgets. The goal: code always applies to the correct canvas state, the model can build on any previous canvas by ID, and forking works well because it is the designed behavior rather than an accident.

## Summary

Today's architecture keys state by MCP session, coordinates the exec round trip through host-mediated tool calls and a hash rendezvous, and produces forks accidentally — a new widget spawns per exec, hydrates a copy, and diverges. The proposal keeps what is actually right about that shape (a new view per edit, code executing in the widget against the real editor) and fixes the ownership and coordination underneath it:

1. **A canvas is a per-canvas Durable Object**, addressed by `idFromName(canvasId)`. The crypto-random `canvasId` riding in tool arguments and results is the *only* durable key. Nothing is keyed by MCP session, ever.
2. **Every model edit is a fork, by design.** `exec({ code, canvasId? })` — the exact tool signature we ship today — resolves the base canvas's latest state server-side (including the user's hand edits), mints a *new* canvasId seeded from it, and runs the code there. Each widget in the chat is pinned to its own canvas forever: the scrollback becomes a version history, and no view ever changes underneath the user. "Go back to the version with the blue circle" is just passing that older canvasId as the base — every state ever shown has an ID, and every ID is a valid base.
3. **Code still executes in the widget, against the real live editor** — but coordination rides our own channels. The widget spawned by an exec call knows its *base* canvasId from its own tool args, so it rendezvouses through the base canvas's DO (user-scoped — no global keys), receives the job (new canvasId + base snapshot + code), executes, and commits to the new canvas. `ontoolinput` parsing-to-execute, the debounce guards, the sha256 rendezvous, and `_exec_callback` session roulette are all deleted.

No headless editor. No new model-facing tools. No supersession or view-convergence machinery — old views aren't stale, they're history. Net code shrinks substantially, and the model-facing contract is unchanged from today (the tool description just starts telling the truth).

## What we verified

These facts shaped the design. Each was confirmed against the installed `@modelcontextprotocol/ext-apps` 1.1.2 package, the spec repos, host issue trackers, or this codebase.

**A new view per tool call is spec law — and this design aligns with it instead of fighting it.** The MCP Apps lifecycle is exactly one tool call per app instance: `sendToolInput` "is sent exactly once" per view, and there is no widget-state, instance-reuse, or instance-targeting affordance anywhere in the protocol (verified by enumerating all 16 `ui/*` methods in the 1.1.2 schema). Under fork-by-default, one-view-per-call is exactly what we want: one call, one new canvas, one view of it. If we ever prefer latest-only display instead of scrollback history, that is a *policy knob*, not a rearchitecture: hosts are adding `widgetSessionId` supersession (ext-apps #430 / PR #295, already shipped proprietarily by OpenAI) — stamping it with a lineage ID would collapse a chain to its newest version, stamping it with the canvasId keeps every version. We record lineage either way.

**Session keying is formally dead.** SEP-2567 ("Sessionless MCP via explicit state handles", merged May 2026 into the 2026-07-28 release candidate) removes `Mcp-Session-Id` entirely, on the explicit rationale that clients never scoped sessions to conversations. The blessed replacement is server-minted handles passed as ordinary tool arguments — exactly the `canvasId` pattern. Claude's split routing (widget-initiated calls ride a different session than model-initiated ones, ext-apps #481) is spec-compliant and unfixable app-side.

**The strongest prior art works exactly this way.** The official excalidraw-mcp app embraces forks: its tool resolves prior state plus changes *server-side inside the model's own tool call*, saves the result under a fresh server-minted checkpoint ID in a global store keyed only by that ID, and returns the new ID with instructions for continuing or branching from any older one. The widget is a renderer of a named version; user edits flow back through an ID-keyed app tool. No rendezvous, no timeouts, no session keying.

**Two channels we currently rely on are unreliable.** `updateModelContext` has been silently dropped on Claude web (claude-ai-mcp #102) and goes stale on ChatGPT; it must be advisory-only, never a correctness channel. And direct widget↔worker network is an *assumption*, not a fact — today's widget makes zero direct calls to the worker (everything is host-proxied `callServerTool`), and per CSP3 a `https://` entry in `connectDomains` does not match `wss:`. The design keeps a host-proxied fallback at every layer and treats per-host transport as an empirical question for the probe app.

**Global rendezvous keys are a cross-user leak.** JSON-RPC request ids are per-session counters (effectively always `1`–`2` on ChatGPT's session-per-call model) and the hash of identical code is a worldwide constant, so any *globally addressed* claim store keyed on either would hand one user's canvasId — a bearer capability — to another user's widget. All coordination must be scoped inside a canvas DO the widget can already name from its own tool args. This is why edits rendezvous through the *base* canvas's DO, and why brand-new canvases (no base, no shared secret) have no synchronous claim path at all.

## Design principles

- **The model is the session bus.** The only identifier that survives host session churn is what the model itself carries between turns. Everything keys off `canvasId` (handles need ≥128 bits of entropy — they are bearer capabilities on a public server).
- **Chat messages are immutable; canvases shown in them should be too.** A view is a snapshot of its moment. The model never mutates a canvas it already showed — it forks. Only the user (hand-editing in a view) mutates a canvas, and that only affects what the *next* fork starts from.
- **Every state has a name.** Each exec returns a fresh canvasId; any canvasId from the conversation is a valid base. History, revert, and branching all reduce to "pass the ID."
- **Coordinate on our own transport.** The host is used for exactly two things: rendering iframes and carrying canvasIds through tool args/results. Job dispatch, results, state, and user edits ride worker↔widget channels we control, so host divergence in event ordering stops having correctness blast radius.
- **Treat host behavior as an empirical matrix, not a spec reading.** Ship the probe app first; pick between pre-designed fallbacks based on measurements.
- **Keep the executor pluggable.** The exec contract (base in, new canvasId + result out, state authoritative server-side) doesn't name its executor. Today that's the widget the call spawned; a headless executor could slot in later behind the same tool without any contract change (appendix).

## Recommended architecture

### Canvas state DOs

New `Canvas` DO class, one per canvas, `idFromName(canvasId)` — this can start as a *plain snapshot store*, not a sync room:

- **State**: the canvas snapshot (shapes, assets, bindings — today's checkpoint format), validated with `tlschema` on write and migrated on read. `schema_version` stamped per write.
- **Jobs**: a small table (`execId` UUID, code, `newCanvasId`, status `queued | dispatched | done | failed | expired`, result, timestamps) plus in-memory waiters — today's `CanvasStore` waiter pattern (`canvas-store.ts:39-95`) ported intact, but living in the canvas the widget can already name, keyed by server-minted UUIDs. Jobs expire after ~2 minutes so code can't apply surprisingly late.
- **Lineage**: `parentCanvasId`, `lineageId` (root of the chain), `createdAt`. Costs nothing now; enables the latest-only display policy, lineage-following share pages, and cross-version diffs later.
- **Index**: a row in a global index DO written at creation. Durable Objects cannot be enumerated, so retention, quotas, deletion, and any future `list_canvases` all require this index from day one.

Because the model never edits a canvas in place, there is no live fan-out requirement: `TLSocketRoom`/sync is an *optional upgrade* (worthwhile if live-following share pages become a feature), not a dependency. That keeps this redesign from pulling in a realtime workstream. The `TldrawMCP` McpAgent DO keeps only its transport role; its session-keyed `checkpoints` / `canvas_checkpoints` tables are deleted.

### The exec flow

`exec({ code, canvasId? })` keeps its `_meta.ui.resourceUri` and its exact current signature. `canvasId` names the **base**; every call produces a **new** canvas.

**Building on an existing canvas** (the common case — the spawned widget has the base canvasId in its own `ontoolinput` args, so there is no identity dance):

1. The handler mints `newCanvasId` + a UUID `execId`, reads the base canvas's latest snapshot (user edits included), **seeds the new canvas DO from it immediately** (so the fork exists with base state even if execution never happens), enqueues the job `{execId, code, newCanvasId, baseSnapshot}` in the **base** canvas's DO, and awaits its waiter (one bounded ~10s window, well under Claude Desktop's ~60s ceiling).
2. The freshly spawned widget reads the base canvasId from its tool args, asks the base DO for its pending job (transport ladder below), and receives the job payload — including the new canvasId and the base snapshot, so no second fetch.
3. It hydrates via the existing `applySnapshot` + `forceAutoSize` path, executes through the existing focused-editor-proxy + exec-helpers against the real editor, and submits the result + final state, which the server validates and writes to the **new** canvas DO, resolving the waiter.
4. The tool returns the return value + state digest + `structuredContent: { canvasId: newCanvasId }` and prose: "Canvas `c_new` created from `c_base` — pass `c_new` to keep building, or any earlier canvasId to branch from that version instead."
5. On timeout, nothing is ambiguous: the new canvas exists (seeded from base), the job status is inspectable, and the tool says "created from `c_base`; code still executing — call `get_canvas('c_new')` to confirm." If the widget never materializes (host didn't render), the job expires and `get_canvas` reports exactly that. No re-dispatch machinery, no executor election, no liveness heuristics: each job's executor is the one widget its own call spawned.

**Creating a new canvas** (no base): there is no shared secret between the handler and the fresh widget, and no safe global rendezvous, so the first draw is explicitly async — the handler mints the canvasId, queues the job on the new canvas DO, and returns immediately; the widget learns its canvasId from `ontoolresult.structuredContent` (fallback: parse of the result text), pulls the job, executes, and commits. Same UX as today's graceful-timeout path, minus the ambiguity.

**User manual edits**: the user can draw in any view at any time. The widget debounce-pushes the edit to *its own* canvas DO (ID-keyed, session-agnostic) and flushes on `onteardown`/`pagehide` (today's handler is a no-op — the last edit burst of every conversation currently races a debounce timer). The next fork from that canvas includes the edits, and `get_canvas` always returns them. An advisory `updateModelContext` one-liner ("user edited canvas `c_X`: moved 2 shapes") tells the model *which version* the user touched, so it knows to branch from `c_X` rather than the newest tip — but correctness never depends on that channel.

**Serialization and hygiene**: jobs are single-flight per base DO; per-exec record/byte budgets enforced at write; during exec the widget nulls `window.WebSocket` alongside the existing `fetch`/timer nulling and keeps any worker-channel handles unreachable from the exec scope.

### The widget

Spawned per exec, pinned to one canvas for its whole life:

- Boot: read base canvasId from `ontoolinput` (or own canvasId from `ontoolresult` in the no-base case) → pull job → hydrate → execute → commit → thereafter it is a viewer of its canvas, capturing user edits. No debounce timers, no `hasExecRunRef`, no partial-JSON parsing — the DO's job state is the single source of execution truth, so duplicate or reordered host events cost nothing.
- `workerOrigin` baked at build time via a Vite env var; the method map bundled instead of injected. Bootstrap injection dies; the widget HTML becomes fully, safely host-cacheable.
- **No supersession, no convergence, no BroadcastChannel.** Old views are not stale — they show their own version, which is the point. The only cross-instance discipline left: each instance's `updateModelContext` slot describes only its own canvas, stamped with the canvasId, and server instructions state that tool results are authoritative over context notes.
- Kept: theme sync, fullscreen, `.tldr` export, `ImageDropGuard`, the Build-It button.

### Transport ladder

The widget needs three exchanges with the worker: pull job, submit result + state, push user edits. All are canvasId-keyed and therefore session-agnostic. Chosen per host by the probe:

1. **Direct HTTPS** to `workerOrigin` (`connectDomains` already declares it — but note today's widget has never actually exercised direct fetch; verify per host).
2. **Host-proxied app-only tools** (`_pull_job`, `_submit_result`, `_push_user_edit`) — today's proven transport, guaranteed to work everywhere `callServerTool` works, merely slower.

No WebSocket requirement in the core design (a genuine simplification versus the live-sync variant — wss CSP pass-through stops being load-bearing). WebSockets return only with the optional live share page.

### Tool surface

| Tool | UI resource | Purpose |
| --- | --- | --- |
| `exec({ code, canvasId? })` | yes (unchanged) | Run code. Omit `canvasId` → new blank canvas (async first draw). Pass any canvasId from the conversation → new canvas built on that state; the original is never modified. Returns the new canvasId. |
| `get_canvas({ canvasId })` | no | Latest state (including user edits) + job status. The timeout-recovery and TUI read path. |
| `search` | no | Unchanged. |

That is the whole surface — identical shape to today plus one read tool. No `show_canvas` (every exec displays), no `fork_canvas` (every exec forks), no `canvas_history`/`canvas_revert` (the chat scrollback *is* the history, and reverting is passing an older ID as the base). Every result carries `structuredContent: { canvasId }` — forward-compatible with `widgetSessionId` under either display policy.

### TUI hosts

- `exec` needs a browser to run code, so on hosts that render no widgets it fails fast with clear instructions instead of hanging; `get_canvas` works fully.
- `GET /c/:canvasId` serves the widget bundle as a standalone page — every version has a real URL that outlives the chat. A TUI user opening the latest link gets a viewer *and* an executor: with a live page open on the base canvas, exec jobs can dispatch to it. A lineage-following page (`/c/lineage/:lineageId` → always shows the newest version in the chain) would make one open tab track the whole conversation; optional, enabled by the lineage metadata.
- Optional, off the hot path: a PNG of the new canvas as an image content block in tool results (Browser Rendering, cached); phase-3 MCP OAuth for `list_canvases`. Until then, share URLs embedding the handle are the cross-conversation bridge.

### Operations layer (v1, not later)

Fork-by-default mints a canvas per edit, so retention and quotas move from important to central:

- **Retention**: idle-canvas TTL via DO alarms (e.g. 30 days, refreshed on access), stated in tool results; `delete_canvas` (or delete-lineage) for user-initiated removal. Both need the global index DO.
- **Storage**: full snapshot per canvas is the simple v1 (canvases are small JSON; TTL bounds growth). If lineage chains get heavy, store parent-pointer + diff behind the same read API — an internal change.
- **Quotas**: per-canvas size caps enforced at write; a canvas-minting rate per IP.
- **Rate limiting**: a separate namespace for widget traffic keyed by canvasId (host sandbox proxies NAT many users behind few IPs; a 429 on the result path is a correctness failure).
- **Observability**: un-gate the logger from `isDev` and define the funnel metrics that gate rollout: exec success rate per host, widget boot-to-commit latency, timeout/expiry frequency, transport-rung distribution, legacy-widget population (`widgetVersion` stamped on every widget call).

### Legacy compatibility

Hosts cache widget HTML durably, so months-old widgets will keep calling the current server:

- Keep `_get_canvas_state`, `save_checkpoint`, and `_exec_callback` as **live shims** proxying the canvas DOs (ID-keyed, so they map cleanly), not no-op stubs.
- Version the HTTP surface (`/api/v1/...`); bump the resource-URI version segment on schema-affecting deploys; retire shims only when `widgetVersion` telemetry says the cached population has rolled over.
- Legacy canvas data: lazy, best-effort — on first use of an old-format canvasId as a base, attempt the old `canvas_checkpoints` lookup and seed from it; otherwise return "canvas not found, starting blank" explicitly.

## The host probe app

Ships first, behind a `PROBE_ENABLED` flag on the *same worker* (so it observes real caching, real session routing, real sandbox proxies). One `probe_start` tool with a UI resource, a tiny instrumented widget, an app-only `_probe_report`, and a `ProbeLog` DO producing a re-runnable host × behavior matrix.

What it measures per host — each row feeds a specific design choice:

1. Direct network from the iframe (fetch GET/POST against declared `connectDomains`, SSE, WebSocket) — picks transport rung 1 vs 2, and gates the optional live share page.
2. Lifecycle event order, count, and timing (`ontoolinputpartial` / `ontoolinput` / `ontoolresult` / `onteardown` / `ontoolcancelled`), and whether `structuredContent` reaches `ontoolresult` per connector type — validates the two boot channels.
3. Widget spawn latency and cold-boot-to-first-tool-call time — tunes the exec wait window per host.
4. Session split (`mcp-session-id` of widget-initiated vs model-initiated calls); `hostContext.toolInfo.id` presence and shape.
5. HTML cache staleness (baked build timestamp vs server version); measured tool-call timeout ceilings; `updateModelContext` round-trip; `onteardown` delivery reliability (gates the user-edit flush).
6. Capability vs reality: hosts that advertise MCP Apps but render empty boxes (Claude Code Desktop does) — feeds the fail-fast-with-share-URL path.

No architectural decision *gates* on a probe result — probes pick between pre-designed fallbacks. The matrix stays as a permanent regression harness re-run after every host update.

## What gets deleted

Verified dead today (shippable immediately, no behavior change): the entire `pendingBootstrap` machinery (implemented, never called), the `read_checkpoint` tool (never called by the widget), `activeCheckpointId` (write-only), `src/tools/loadCachedCanvasWidgetHtml.ts` (zero importers), stale R2 comments, plus flipping the logger on in production.

Deleted by the redesign: `src/shared/exec-key.ts`, `src/shared/pending-requests.ts`, the two-source race + `validate()` + `notBefore` machinery in `tools/exec.ts`, the `CanvasStore` global exec-waiter addressing (the waiter pattern moves into the canvas DOs), `_exec_callback` as a coordination channel (survives only as a legacy shim), the session-keyed checkpoint tables, the widget's debounce/dedup/`hasExecRunRef` block, the localStorage checkpoint keying, and per-invocation bootstrap injection. Not built at all (versus earlier drafts of this proposal): supersession/BroadcastChannel, convergence polling, executor election and liveness heuristics, `show_canvas`, `fork_canvas`, `canvas_history`/`canvas_revert`, and any sync-room dependency. Kept and load-bearing: the focused proxy, `exec-helpers.ts`, `applySnapshot` + `forceAutoSize`, `CANVAS_RESOURCE_URI` stability + the compat resource template, and the `search` tool.

## De-risking order

1. **Probe matrix** across Claude web/desktop, ChatGPT, Cursor, VS Code, Claude Code Desktop (~1 week). The load-bearing unknowns are small now: direct-fetch availability (rung 1 vs 2) and widget boot latency vs the wait window.
2. **End-to-end fork spike** (~3 days): base canvas DO + job queue + a widget that boots from real host events, pulls, hydrates, executes, commits — measured against the 10s window on the slowest target host.
3. **Cached-widget field study** (calendar time; start early): re-add the connector across hosts over weeks; log which HTML build actually spawns and which app-only calls it makes. Sets the real shim window.

## Alternatives considered

- **Edit-in-place with live-converging views** (a previous draft of this proposal: every view of a canvas is a live sync client; exec mutates the canvas; all views update in place). Rejected as the default: chat messages are immutable and views mutating in the scrollback is surprising; it requires a realtime workstream (sync rooms, wss transport, supersession, executor liveness) that fork-by-default simply doesn't need; and the fork semantics the product actually wants would still have to be layered on top. The lineage metadata keeps latest-only *display* available later as a `widgetSessionId` policy without any of that machinery.
- **Split `exec` / `show_canvas`** (resource off exec, explicit display tool). Only meaningful under edit-in-place; under fork-by-default every exec should display its new version, so the resource stays on exec and the tool count stays minimal.
- **Server-side headless exec** (real `Editor` + DOM shim + font-metrics text measurement in the existing `LOADER` sandbox). Synchronous results always, TUI execution, no widget dependency — and it slots behind the same exec contract if ever wanted. Deliberately not pursued now: tldraw has never run the editor headless, and the fidelity work is a research project this redesign shouldn't depend on. See appendix.
- **Full event-sourced commit DAG** (content-addressed snapshots, refs, amend semantics). Fork-by-default gets the useful behavior — named versions, branch-from-anywhere — with plain per-canvas snapshots and a parent pointer; the DAG adds compaction and 2MB-per-value hazards without adding model-facing capability.
- **State-through-model-context only** (no server persistence). Rejected: canvas state is too large for context round-trips, `updateModelContext` is demonstrably lossy, and forking semantics become undefined.

## Effort

Roughly **5–7 person-weeks** for one person familiar with the codebase:

- Probe app + host matrix: 1–1.5 pw
- `Canvas` DO (snapshot store, validation/migration, jobs + waiters, lineage, index DO, ops layer) + routes + wrangler migration: 1.5 pw
- Exec tool rewrite (fork flow, async no-base path, `get_canvas`) + instructions: 1 pw
- Widget rework (job pull/execute/commit, user-edit capture + teardown flush, deletions): 1–1.5 pw
- Transport fallbacks, legacy shims, `/c/:canvasId` share page: 0.5–1 pw
- Migrations, telemetry-gated rollout, host-matrix validation: 0.5–1 pw

The dead-code cleanup and the probe app are independently shippable this week.

## Open questions

- **Same-turn exec chains**: a model building iteratively in 3 exec calls produces 3 versions and 3 views in one turn (as today). Acceptable as history? If not, `widgetSessionId = lineageId` collapses chains host-side when hosts ship it — policy, not architecture. Tool instructions should meanwhile encourage one well-formed script per user request.
- **Surfacing user edits on older versions**: the advisory context note names the edited canvasId, but if the host drops it, the model only discovers edits when it forks from that canvas. Is that acceptable, or should `get_canvas` responses include "versions with unseen user edits" hints from the lineage?
- Which hosts allow direct iframe fetch to `workerOrigin` (transport rung 1), and what real widget boot latency looks like per host (probe questions 1 and 3).
- Share pages: bearer canvasId read/write at launch (unlisted-doc posture)? Signed read-only links before promoting sharing? Is the lineage-following page worth shipping in v1 for the TUI story?
- Storage: at what lineage depth (if any) do full snapshot copies justify switching to parent-pointer + diff behind the same read API?
- Exec cancellation: honor `ontoolcancelled` by expiring the queued/dispatched job and refusing a late result commit.

## Appendix: headless execution as a future executor

The exec contract above (base in; new canvasId + result out; state authoritative server-side; executor chosen by the server) doesn't name its executor, so a server-side one can be added later without changing the model-facing surface: a real `Editor` instantiated headless in the existing `LOADER` dynamic-worker sandbox (`globalOutbound: null`, the `search` tool's pattern), with a workerd DOM shim and font-metrics-based text measurement.

Feasibility notes from the investigation, recorded for whenever this becomes interesting: `TestEditor` already runs the full Editor + default shape utils without a browser (jsdom + a ~30-line text-measure stub); ~50% of the public Editor surface is pure record/store work and ~15% is geometry that is pure math *except* where text metrics feed shape geometry; the widget already self-heals stale measurements via `forceAutoSize` (though not for text shapes — `TLTextShape` has no `h` prop); and the main engineering risks are the multi-MB React-carrying bundle vs Worker Loader module limits, the DOM-shim iteration tail, and text-measurement fidelity for model-facing bounds. If it ever ships, it upgrades every exec to synchronous (including first draws), gives TUI hosts full execution, and removes the widget-boot dependency — all behind the same `exec` tool.
