# Canvas persistence: what this branch fixes and how

A problem-by-problem summary of the changes on this branch. For the full design rationale, the verified host and spec constraints, and the alternatives considered, see [canvas-persistence-redesign.md](./canvas-persistence-redesign.md).

| Problem                                                                           | Fix                                                                                                               |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Edits forked canvases accidentally and the copies diverged                        | Every exec is a deliberate fork from server-resolved base state; originals are never modified                     |
| State was keyed by MCP session, which hosts don't keep stable                     | Everything is keyed by the canvasId carried in tool args and results                                              |
| The exec round trip was a race of timeouts and rendezvous hashes                  | A job queue in the canvas's own Durable Object, claimed atomically, with one bounded wait                         |
| Hosts deliver tool-input events in different orders, patched with debounce guards | The server-side job claim is the single source of execution truth; host events just trigger pulls                 |
| Per-session data was baked into widget HTML that hosts cache forever              | Bootstrap carries deploy-stable data only                                                                         |
| User edits could be lost or invisible to the model                                | Edits persist to the canvas's DO, flush on teardown, and are always included when the model builds on that canvas |
| A timed-out exec left the model guessing                                          | `get_canvas` reads authoritative state plus the job's status                                                      |
| Cached old widget builds would break against a new server                         | Legacy app-only tools stay live shims, with saves redirected to preserve fork semantics                           |

## 1. Accidental, divergent forks

**The problem.** Every exec call spawns a new widget (one view per tool call is baked into the MCP Apps spec). The old widget hydrated a copy of the canvas and then wrote its changes into session-scoped storage, so "make the circle red" produced two canvases in the chat — the original and a divergent copy — with no defined relationship between them. Forking was an accident of widget spawning, not an operation.

**The fix.** Forking is now the defined behavior, done correctly. `exec({ code, canvasId? })` — the same tool signature as before — resolves the base canvas's latest state _server-side_, seeds a brand-new canvas from it, runs the code there, and returns the new canvasId. Each widget is pinned to one canvas for its whole life, so the chat scrollback becomes a version history: every state ever shown has an id, any id remains a valid base to branch from, and no canvas ever changes after the fact. The seed happens before execution, so the fork exists with correct base state even if the code never runs (`src/tools/exec.ts`).

## 2. Session-keyed state

**The problem.** Canvas checkpoints lived in SQLite tables inside the per-session `TldrawMCP` Durable Object. But hosts do not keep MCP sessions stable: Claude routes widget-initiated tool calls over a _different_ session than model-initiated ones (ext-apps #481), and ChatGPT opens a new session per tool call. A widget's save could land on a DO that had never heard of the canvas, and the whole `exec:<sha256(code+canvasId)>` rendezvous machinery existed to paper over exactly this. The protocol is also moving to formalize this reality: SEP-2567 removes `Mcp-Session-Id` entirely in favor of server-minted handles passed as tool arguments.

**The fix.** All canvas state lives in per-canvas `CanvasStore` DOs addressed by `idFromName('canvas:<canvasId>')` (`src/canvas-store.ts`). The canvasId riding in tool arguments and results — the one identifier the _model_ carries between turns, which provably survives everything — is the only durable key. Any session DO that receives a widget call routes it by the handle in its arguments, so Claude's split-session routing has nothing left to break. The old session-keyed tables survive only as a read-only fallback for pre-redesign canvasIds. canvasIds grew from 8 to 26 characters because they now double as bearer capabilities.

## 3. The exec round-trip race

**The problem.** The exec result had to be coordinated through host-proxied tool calls: the widget reported via `_exec_callback`, which could land on the wrong session DO, get forwarded to a hash-addressed rendezvous DO, and race an in-memory pending request under host-specific 4s/8s windows — with staleness checks (`notBefore`), canvasId-mismatch validation, and a graceful-timeout path that depended on `updateModelContext`, a channel Claude has silently dropped (claude-ai-mcp #102).

**The fix.** The exec handler queues a job — with a server-minted UUID execId — in the base canvas's own DO, and waits on it there. The spawned widget already knows the base canvasId from its own tool arguments, so it pulls the job from that DO directly: no hash rendezvous, no cross-DO forwarding, no session dependence. `completeExecJob` writes the final state to the target canvas _before_ resolving the waiter, so a synchronous tool result never reports state that isn't readable yet. On timeout the tool answers honestly — the fork already exists server-side seeded from the base, the job status is inspectable, and nothing depends on model-context delivery. Deleted outright: `src/shared/pending-requests.ts`, the two-source race and validation machinery in `tools/exec.ts`, and the rendezvous addressing in `canvas-store.ts`.

## 4. Host event divergence

**The problem.** Hosts deliver `ontoolinput`, `ontoolinputpartial`, and `ontoolresult` in different orders, counts, and timings. The widget compensated with 500ms/1000ms debounce timers and a `hasExecRunRef` guard, and correctness depended on getting that choreography right per host — Cursor behaved, Claude didn't.

**The fix.** Correctness moved server-side. A job is claimed atomically by a hash of the final code (`pullExecJob`), so the widget's event handlers just _trigger pulls_: a duplicate or reordered event costs one no-op pull, never a double execution. Claude's specific behavior — streaming partials during the call but withholding the final input until the call settles — is handled by speculative probes: the widget debounces partials and attempts a claim with the streamed code's hash. An incomplete partial hashes to nothing and misses harmlessly; the moment the streamed code equals the final text, the claim succeeds and execution starts inside the tool-call window. The debounce/dedup machinery in `mcp-app.tsx` is gone; what remains is capped, self-limiting probing whose safety comes from the DO, not from timers.

## 5. Bootstrap injection vs cached widget HTML

**The problem.** Hosts cache the widget HTML durably — across conversations and connector re-adds, with no invalidation mechanism — yet the server injected per-session data (`sessionId`, `mcpSessionId`) into it, plus dead `pendingBootstrap` machinery that nothing ever consumed.

**The fix.** Bootstrap now carries deploy-stable data only (`isDev`, `workerOrigin`, the method map). Everything per-invocation reaches the widget through tool events and canvasId-keyed tool calls. The stable resource URI and the compat resource template are unchanged, and the dead machinery (`pendingBootstrap`, `read_checkpoint`, `activeCheckpointId`, `loadCachedCanvasWidgetHtml.ts`) is deleted.

## 6. User edits: durability and visibility

**The problem.** User edits were checkpointed into session-keyed storage and localStorage under keying heuristics (`canvasId` falling back to `sessionId` falling back to bare checkpoint ids), the final edit burst of a conversation raced a 500ms debounce with no teardown flush, and the model's awareness of edits depended entirely on `updateModelContext`.

**The fix.** Edits push to the widget's own canvas DO via `_push_user_edit` (canvasId-keyed, so session routing is irrelevant), debounced at 1.5s and flushed on `onteardown` — the one moment the spec guarantees the host waits for — and on `pagehide`. Correctness no longer depends on the model _seeing_ the edit: the next exec resolves its base state server-side, so the user's changes are always included in what the code builds on. The `updateModelContext` note ("user edited canvas X") remains as best-effort awareness, stamped with the canvasId, and is advisory only. localStorage persistence is deleted.

## 7. Recovery when a result doesn't arrive

**The problem.** When the old exec timed out, the model was told the state "will be attached shortly" via a channel that might silently drop it, with no way to check what actually happened.

**The fix.** The new `get_canvas` tool reads the authoritative state of any canvas (including user edits) plus the status of recent exec jobs — still executing, applied, or expired unapplied with instructions to re-run. It doubles as the read path for hosts that render no widgets at all. Queued jobs expire after ~2 minutes so create-time code can never apply surprisingly late.

## 8. Old cached widget builds

**The problem.** Because hosts cache widget HTML indefinitely, widgets built against the old protocol will keep spawning against the new server for months.

**The fix.** The legacy app-only tools stay registered as _live shims_, not stubs: `_get_canvas_state` serves canvas-DO state (with the old checkpoint tables as fallback), `_exec_callback` completes jobs via the legacy hash key, and `save_checkpoint` detects when an old widget is saving the output of a fork job and redirects the write onto the fork target — so even old builds get fork semantics. Every widget call is stamped with `widgetVersion` so shim retirement can be gated on real telemetry.

## 9. Operational hygiene

Also included, because a canvas store keyed by unguessable ids on a public worker needs them: per-column size caps under the DO SQLite value limit and a 5,000-shape ceiling, a 30-day idle TTL per canvas (refreshed on access) via DO alarms, job expiry, and production logging — the old logger was dev-gated, which is why the fragile paths this branch replaces were invisible in production.
