# MCP canvas editing

## The problem

A user's own AI agent (Claude, Codex, anything that speaks MCP) is connected to tldraw.com's MCP server. Today it can find boards and read them: pages, clusters of shapes, shape data, screenshots. It can't change anything on the canvas. We want it to edit the board the user is working on, while they watch, the way a collaborator would.

Three things make this harder than "add a write tool":

- **Edits have to happen where an editor lives.** The agent could write records, and the sync worker could put them in the room, but without an editor they come out wrong. Text isn't measured, so auto-sized text and labels have no real size. Arrows bound to a moved shape don't follow it. None of the side effects run: they live in the editor, so a record written straight into the store skips them. For example, deleting the page a user is on doesn't move them to another page. Placing a label beside a shape or sizing a box to its text also needs geometry and the board's fonts. The worker has none of that, only records.
- **The server-side editor we tried is too slow.** Browser Run can load the editor on the server in a headless browser. It already measures and screenshots boards for the read tools, and it could join the room as one more collaborator, the way agent-pattern's agent does. But every call starts a browser and loads the board, which takes seconds before any work begins. In #11326's measurements, a `get_page_info` miss took 4.8–6.6s through Browser Run, against 1.0–1.5s from an open tab. The user's open tab already has a running editor with the board loaded, so for now that's where edits apply. A headless editor running in the worker itself, as tldraw notes does with WASM, would remove the trade-off later.
- **The agent needs a way to do things in that editor**: make shapes, move them, restyle them, connect them, delete them. Ops describe those actions. The tab runs each op through the editor and reports what happened. Code mode, where the agent writes editor calls directly, is the other way to do it. We chose ops for the faster first edit and the per-op results.

## How it fits together

```
agent ──MCP──▶ sync worker ──▶ file durable object ──sync socket──▶ user's open tab
                (auth, write                (the room; knows           (applies ops with
                 check, limits)              who is connected)          a real editor)
                                                                          │
agent ◀── op results ◀───────────────────── reply ◀──────────────────────┘
                                             │
                                             └─ edits sync to everyone like any user's edits
```

- **The ops vocabulary** is ported from agent-pattern into `apps/dotcom/client/src/utils/canvas-ops` (#11338, draft). `createCanvasOpsReceiver(editor)` validates untrusted ops and applies them as one undo step stamped with who asked. Evals with a real model pass 14–15 of 15 cases adapted from the tldraw-offline suite.
- **The channel** is #11326 (Max, draft): the durable object sends a job to the user's open tabs over their sync socket, first answer wins, stale tabs are skipped. It's read-only today; apply_ops would be its first write job.
- **Presence** is already in the durable object: every connected session's selection, viewport, current page and cursor. Reading the user's state needs no round trip to the tab.

## Decisions

- **Tab only, for now.** Ops apply in the user's open tab. It's fast, measures with the real fonts, and makes "the selected shape" mean what the user has selected. A headless editor running in the worker (as tldraw notes does with WASM) is the eventual goal, not this tranche. The full read-and-write experience with a tab open is worth more now than a partial one without.
- **No tab means an error with the board's URL, for reads and writes alike.** The Browser Run fallback goes away. The error tells the agent the board must be open in a browser tab and gives the URL to print, in words an agent with computer use or its own browser can act on.
- **Ops, not code mode.** Faster to first edit, and the result of each op is reported back.
- **One undo step per apply_ops call.** Set one history mark at the start, then apply the ops with history recorded, so the next undo goes back to the mark and takes the whole batch with it. Not `history: 'ignore'`: ignored changes can't be undone at all, and the next undo would revert whatever the user did before the agent ran.
- **No streaming.** MCP servers don't support streaming tool input: a `tools/call` arrives with its arguments complete. A batch can hold up to 1,000 ops, which a tab applies in about a second; past that the placement solver gets slow and the tab freezes for seconds. But the apply_ops tool description should steer the model to split large work into several calls, one part of the drawing each. Each call lands on the board as soon as it arrives, so the user watches it fill in, and the model sees what landed before building on it. The cost is one undo step per call; see the undo follow-up.
- **No lint.** No lint pass, in the tool result or as a tool.
- **apply_ops rides #11326's channel**, not a second one.
- **Jobs go only to the caller's own tab**, for reads and writes: not to whoever else happens to have the board open.
- **Write access is checked on the server** before a job goes out. The read tools only check read access, and the tab can't be trusted to enforce it. A caller who can view the board but not edit it gets an error saying so, and no job is sent. Naming the board there gives nothing away, since they can already read it. A caller who can't even read it gets the same answer as for a board that doesn't exist, as the read tools do today.
- **apply_ops returns the op results only**: which ops worked, where things landed, what was adjusted, and why one failed. No refreshed geometry or screenshot. An agent that needs more asks with get_cluster_info or get_cluster_screenshot.
- **User state and board users come from presence.**

## Risks

- **Reads right after an edit can be stale.** #11326 takes which shapes exist from the persisted snapshot, which persists at most every 8s, and only their geometry from the live tab. An agent that edits and then reads can miss what it just made. Persist when an apply_ops job completes.
- **A tab is a client its owner controls.** It must take jobs only over its own authenticated sync socket, and nothing it answers can be cached for other viewers (#11326 already holds that line for renders).
- **Several tabs, several presences.** One user can have the board open twice; jobs and "the user's selection" should go to the most recently active one.
- **A tab that's there but not usable**: asleep, mid-drag, on another page. #11326 declines or times out on reads; an edit landing on a page the user isn't looking at is a product question, not just a technical one. Check how long browsers let a background tab run before they put it to sleep.
- **No tab, no content search.** "Find my wireframes for X" across boards stops working: search_boards matches names only, and nothing can look inside a board without its tab. A server-side text index of board content, built on persist, would bring it back.

## Already shipped or in flight

- search_boards (paginated), list_workspaces, create_board, rename_board, get_board_info
- get_page_info: clusters, bounds, keywords, largest first, paged (#11313)
- get_cluster_info: shape data, draw points replaced by a point count
- get_cluster_screenshot; page and region screenshots (#11227)
- Read and reply to comments (#11226)
- Answer renders from the open tab (#11326, draft)

## To do

1. **get_user_state** (board id, user id): selection, viewport, current page, from presence.
2. **get_board_users** (board id): who is on the board now, from presence.
3. **apply_ops** (board id, ops), stacked on #11326, behind a flag: server write check (a no-write-access error, before any job is sent), rate limit and batch-size cap; tab applies through `createCanvasOpsReceiver`; persist on completion; a clear "no open tab" answer.
4. **No-tab error** for every board tool: the board URL and a sentence for the agent to relay. Cut the Browser Run fallback.
5. **create_board + apply_ops.** A new board has no open tab, so the agent gets the user to open it first.

## Follow-ups

- **One undo step per agent reply.** When a reply makes several apply_ops calls and the user does nothing in between, merge them into one undo step: skip the history mark when the previous batch on the undo stack came from the same run. Needs the server to pass a run id per reply, and a way to tell from the history manager that nothing happened since.

- **Warnings in op results.** A few automatic checks returned with each result, not lint: a label that spills out of its box, a new shape overlapping a neighbour, text crossing a container's border. The one recurring eval failure is a model that resized a box to a guessed width and was never told the label still spilled. The eval harness's `boardProblems` has these checks already.
- **Agent presence.** While an agent works, the tab shows where and why: a claimed area with selection bounds, a cursor, and an intent ("drawing the cat"), the way a collaborator's selection shows. An optional `intent` and area on a batch would carry it.
- **Agent identity.** Stamp edits and comments with the agent's name from the OAuth client ("Claude, on behalf of Steve"), not just the user, so comments stop needing a "left by my agent" prefix.
- **What the user just did.** get_user_state could include the user's edits since the agent last looked, as the Codex plugin does. The persisted records carry no edit times, so this comes from the tab's history, not presence.
- **A board thumbnail.** A tiny annotated overview of the board (the tldraw notes mini map) to pick which cluster to read, rendered by the tab.
- **MCP unification.** Later, the Claude and Cursor MCP apps act as the .com MCP rather than keeping their own boards. Not this tranche; the Codex plugin is unaffected.

## Open questions

- Is #11326's liveness check (skip stale sockets, 1.5s acknowledgement) enough for a write, which is worse to half-apply than a read is to drop?
- Should an edit to a page the user isn't on switch their view, apply silently, or be refused?
- One `apply_ops` tool with the op union as its schema, or a tool per op? The evals use one tool and Opus got the shape right every time, but the schema's token cost per request hasn't been measured.
