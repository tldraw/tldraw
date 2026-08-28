# @tldraw/headless examples

Runnable, self-contained demonstrations of the headless editor. Each is a plain Node script — no browser, no DOM, no build step. Run them from the repo root:

```bash
yarn tsx packages/headless/examples/agent-tool-belt.ts
yarn tsx packages/headless/examples/live-agent.ts
yarn tsx packages/headless/examples/generate-tldr.ts [output.tldr]
yarn tsx packages/headless/examples/document-lint.ts [--check]
```

All four also run in CI via `examples.test.ts`, and typecheck with `yarn workspace @tldraw/headless typecheck-examples` (they are outside the package's build graph, so the main `yarn typecheck` does not cover them).

## agent-tool-belt.ts — an LLM tool belt over the editor

The shape of a canvas-editing agent: the model calls a small set of JSON tools (`create_box`, `connect`, `arrange`, `read_canvas`, …) instead of the editor API. Shows the three things a tool layer should add — per-call atomicity via history marks and `bailToMark`, validation errors returned as data for the model to read, and a compact text observation of the canvas in place of a screenshot. Includes a hallucinated-id call that fails and rolls back cleanly.

## live-agent.ts — a headless agent in a live multiplayer room

The flagship use case. Boots an in-process sync server (`TLSocketRoom` behind a real WebSocket server), then connects two headless editors as collaborators: a simulated human posts sticky notes, and an agent — watching via `store.listen(..., { source: 'remote' })` so it never reacts to its own edits — responds to every "todo:" note with a bound checkbox shape. Verifies convergence from the human's side and that the agent appears in presence by name.

## generate-tldr.ts — data in, .tldr file out

Server-side diagram generation: a CI pipeline description becomes a laid-out, color-coded canvas with bound arrows, serialized with the same `.tldr` writer the tldraw app uses, then round-trip verified by parsing it back into a second headless editor. The output file opens directly in tldraw.com.

## document-lint.ts — canvas checks for CI

Treat boards like code: `lint()` returns issues (empty notes, shapes stranded far off the board, overlapping boxes), `fix()` repairs them under a history mark, iterating to a fixed point, and check-only mode exits non-zero for CI. The seeded messy board stands in for loading a real snapshot or `.tldr` file.

## Text measurement note

A headless editor defaults to approximate, character-count text measurement — deterministic, but not what a browser computes. Auto-sized text bounds get written into the document, so if the documents these scripts produce are shared with browser clients and text fidelity matters, inject an accurate implementation via the `textMeasurer` option.
