# dotcom

## Development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

The dev stack is orchestrated by [process-compose](https://github.com/F1bonacc1/process-compose). You don't need to install it — `yarn dev-app` fetches the pinned binary on first use. Run the app from the repo root:

```bash
yarn dev-app
```

This brings up the whole stack — postgres and pgbouncer (in containers), zero-cache, the workers, and the client — as host processes. The ports are fixed, so only one dotcom dev stack can run at a time. The services and their startup order are defined in [`process-compose.yaml`](process-compose.yaml).

### Working with the stack

By default `yarn dev-app` opens the process-compose TUI, listing each service with its status, logs, and health.

- **Quit:** `F10` or `Ctrl-C`. This stops every process and runs postgres's `docker compose down` — the clean way to stop. Closing the terminal tab instead can leave the postgres container and stray workers running.
- **Inspect a service:** select it with the arrow keys to see its logs; press `F1` for the full key bindings (start / stop / restart a selected process).
- **Plain interleaved logs, no TUI:** `PC_DISABLE_TUI=1 yarn dev-app` streams every service's logs to stdout (this is also how it runs in CI).
- **Drive it from another terminal or a script** — the `process-compose` client connects to the running stack:

  ```bash
  yarn dev-app:doctor                                       # status of every service
  yarn exec process-compose process logs zero-cache --tail 200
  yarn exec process-compose process restart sync-worker
  ```

- **Reset server state:** `yarn dev-app:clean` tears down the postgres container + volume, the zero replica, and wrangler state.

Browser-side state is separate. After starting the stack, visit `http://localhost:3000/dev/reset-local-state` to clear local storage, IndexedDB, caches, service workers, accessible cookies, and Clerk session state for the current origin.

### Automatic tools and styles

Set `TYPESAFE_API_KEY` in `sync-worker/.dev.vars` and restart the sync worker to try Jev. For deployed environments, configure the same name as a worker secret. The key is never sent to the browser.

Click the top-center Jev pill and choose **Turn on**. This enables the experiment for the current canvas session, including anonymous scratch canvases. The pill shows inference progress and opens the last 100 decisions, including applied changes, no-change decisions, and discarded results with their reasons.

Jev predicts the user's next intended activity from their recent work. The prompt explains tldraw's automatic return to Select after drawing: `geo` creates through `select.resizing`, and `arrow` creates through `select.dragging_handle`. Returning to `select.idle` after either gesture is not treated as a deliberate choice of the Select tool. Examples in the prompt cover continuing a run of shapes, connecting nodes, adding labels, and resuming drawing after an edit.

#### What Jev can change

Choose a mode in the Jev pill's popover:

- **Single choice** (the default): one question chooses one tool switch, one next-shape style change, or no change.
- **Two-stage**: the first question chooses **change tool**, **change styles**, or **no change**. No change ends the decision immediately. Change tool asks a follow-up question choosing among the other supported tools. Change styles sends one follow-up request containing a separate question for every available style category. Each category includes **no change**; its highest-probability answer wins independently. All winning style changes are applied together, so one decision can change color, fill, size, and other defaults at once. A no-change winner preserves that category. No change is distinct from the `none` value for fill or outline, which explicitly removes the fill or outline.

Both stages use the same canvas snapshot. Switching modes cancels an in-flight decision from the previous mode. Two-stage mode makes at most two model requests per decision, not one request per style category.

- Tools: Select (`select`), Draw (`draw`), Geo (`geo`), Arrow (`arrow`), Line (`line`), Text (`text`), Note (`note`), Frame (`frame`), and Highlight (`highlight`).
- Styles: the eight properties below. Drawing tools expose the styles their shape supports. Select can prepare any of these defaults for future shapes, even with nothing selected.

| Property                             | Values                                                                                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color (`color`)                      | `black`, `grey`, `light-violet`, `violet`, `blue`, `light-blue`, `yellow`, `orange`, `green`, `light-green`, `light-red`, `red`, `white`                                                                                            |
| Outline (`dash`)                     | `draw`, `solid`, `dashed`, `dotted`, `none`                                                                                                                                                                                         |
| Fill (`fill`)                        | `none`, `semi`, `solid`, `pattern`, `fill`, `lined-fill`                                                                                                                                                                            |
| Size (`size`)                        | `s`, `m`, `l`, `xl`                                                                                                                                                                                                                 |
| Font (`font`)                        | `draw`, `sans`, `serif`, `mono`                                                                                                                                                                                                     |
| Horizontal alignment (`align`)       | `start`, `middle`, `end`                                                                                                                                                                                                            |
| Vertical alignment (`verticalAlign`) | `start`, `middle`, `end`                                                                                                                                                                                                            |
| Geometry (`geo`)                     | `cloud`, `rectangle`, `ellipse`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `star`, `rhombus`, `rhombus-2`, `oval`, `trapezoid`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `x-box`, `check-box`, `heart` |

The allowlist comes from `packages/dotcom-shared/src/jev.ts` and the SDK's style enums. Legacy alignment values are excluded from model choices. The server removes the active tool, unchanged style values, and unavailable styles from each request's candidates.

Styles are applied through `setStyleForNextShapes`, so existing shapes are never restyled. When shapes are selected, the style panel may still display the selection's styles; the changed defaults take effect when drawing the next shape. This experiment does not change opacity, arrowheads, arrow routing, label color, existing shape geometry/content, or the document itself. It cannot switch to Hand, Eraser, Laser, media tools, or custom tools. If the predicted activity needs both a new tool and new styles, the prompt asks for the tool first.

#### When Jev runs

These events queue a prediction; overlapping events coalesce into one request using the latest state:

| Trigger                                       | Delay and examples                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pointer released                              | 60 ms after the editor processes pointer-up, including completing a geo or arrow drag                                                                                                            |
| Entering a tool's idle state                  | 60 ms after a state transition ending in `.idle`, especially `select.idle` after creating, moving, resizing, rotating, or dragging a handle; also covers returning from editing and tool changes |
| Cursor stops moving                           | 180 ms after the last pointer move                                                                                                                                                               |
| Keyboard action finishes                      | After key-up and the manual-choice grace period; includes shortcuts, Escape, Enter, Delete, and undo/redo when routed through the editor                                                         |
| Interaction completes or cancels              | 120 ms after the editor's `complete` or `cancel` event                                                                                                                                           |
| Text editing ends                             | On returning to idle or clearing the editing shape; other triggers can also run while editing                                                                                                    |
| Selection changes                             | 180 ms after selection or deselection settles in idle                                                                                                                                            |
| Document edit settles                         | 180 ms after local shape creation, updates, or deletion while idle and with the pointer up; covers paste, duplicate, delete, and undo/redo that change shapes                                    |
| Style controls change                         | After next-shape styles change or a style adjustment finishes, subject to the grace period                                                                                                       |
| Menu closes                                   | After open menus close, provided the cursor is back over the canvas                                                                                                                              |
| Navigation settles                            | 300 ms after wheel input, pinch-end, or the last camera change                                                                                                                                   |
| Page changes                                  | After switching pages; previous-page gesture and shape history are cleared                                                                                                                       |
| Canvas regains focus or tool lock is disabled | Once the editor is eligible again                                                                                                                                                                |

These are event-driven triggers, not continuous polling. Explicit UI clicks and keyboard actions have a 1.2-second grace period. Pending requests wait for that period rather than being lost. Requests start no more than twice per second, with at most one in flight; input during inference queues the newest context after its debounce finishes. An assistant change does not trigger another prediction by itself, and subsequent user-triggered predictions wait through an 800 ms cooldown.

Sending and applying do not require an idle tool state. A pointer press, drag, pan, pinch, text edit, style adjustment, or held modifier does not by itself prevent a request or change. Idle transitions remain useful triggers, but they are not an application requirement. A fresh decision can switch tools during an interaction. The canvas must still be focused, visible, writable, and under the cursor, with no open menus or tool lock, and outside the cooldown/grace period. The current tool must be one of the supported tools listed above. An event that ends with those conditions unmet does not send a request; another eligible trigger is needed.

Jev always selects the plurality choice: the action with the highest returned probability, even below 50%. There is no minimum probability or confidence threshold. Exact ties prefer the model's reported choice when it is one of the tied winners. `none` remains a candidate and makes no change when it wins. Malformed probability distributions and unsupported actions are rejected.

Results are still discarded if new input or canvas changes supersede them, a remaining eligibility condition changes, or the result is at least 1.5 seconds old (3.5 seconds in two-stage mode, measured from the initial snapshot). Being in a non-idle state alone is not a reason to discard a result. Stale-result protection still means that new interaction events or state changes during either inference stage invalidate that earlier prediction. The server times out after 2 seconds and the client after 2.5 seconds; two-stage mode allows 4 seconds total on the server and 4.5 seconds on the client. A failed follow-up applies nothing. Service failures back off for 10, 20, then 30 seconds before another user-triggered request.

#### Context and diagnostics

Each request sends stringified state: the trigger; current tool path, selection, hover, editing state, styles, camera, and viewport; the last completed gesture with its original tool, start/end points and automatic-return-to-Select flag; and up to 40 recent events from the last 30 seconds. The context also tracks up to 12 recently changed shape IDs and includes up to 24 visible shape summaries, prioritizing hovered, selected, and recently changed shapes before spatial candidates within 320 screen pixels of the cursor. Summaries include bounds, styles, parent IDs, up to 200 characters of shape text, and arrow binding targets. Request bodies are capped at 32,000 bytes. Raw text-editing keystrokes are not recorded.

The pill's history shows the trigger, plurality choice, latency, probability, confidence, and whether the decision was applied, unchanged, discarded, or failed. Two-stage entries also show the first decision and every follow-up winner (including unchanged categories), each with its probability. The entry's overall probability and confidence describe the first decision. Probability and confidence are informational; neither gates application. **No change** means `none` won, every style category chose no change, or the requested values were already active. **Not applied** describes a remaining eligibility, validity, or freshness rejection. The pill flashes green for one second when a change is applied.

Local sync-worker logs include `[jev]` entries with the trigger, tool state, candidate count, latency, and plurality winner (`choice` and `suggestedChoice`). `choice` is the selected candidate, not confirmation that the browser applied it; the history UI records that final outcome. These logs exclude canvas text, full state, and credentials, and are only emitted with `IS_LOCAL=true`.

```bash
yarn exec process-compose process logs sync-worker --tail 100
```
