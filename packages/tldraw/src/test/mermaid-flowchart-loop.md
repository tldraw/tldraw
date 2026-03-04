# Mermaid Flowchart Iteration Loop

This loop is fixture-driven and based on examples from:

- https://mermaid.js.org/syntax/flowchart.html

## Commands

Run currently supported fixtures only (green baseline):

```bash
yarn workspace tldraw mermaid:loop:baseline
```

Run full strict loop (includes TODO fixtures when present):

```bash
yarn workspace tldraw mermaid:loop
```

Run strict loop in watch mode while iterating:

```bash
yarn workspace tldraw mermaid:loop:watch
```

Run visual monitor loop (captures screenshot per fixture):

```bash
yarn workspace tldraw mermaid:loop:visual
```

Run visual monitor in strict mode (includes TODO fixtures when present):

```bash
yarn workspace tldraw mermaid:loop:visual:strict
```

Visual report output:

`apps/examples/e2e/test-results/mermaid-flowchart-visual-loop/report.json`

## Fixture Source

Fixtures are defined in:

`packages/tldraw/src/test/fixtures/mermaidFlowchartLoopFixtures.ts`

- `status: "supported"`: must remain green.
- `status: "todo"`: docs-derived gaps to implement next.

## Manual UI Check

Use your local app at:

`http://localhost:5420/develop`

For each changed fixture:

1. Copy the fixture Mermaid source.
2. Paste into the canvas.
3. Confirm a diagram is created (not plain text).
4. Confirm node/edge structure and labels match the fixture expectation.
