# Mermaid State Diagram Iteration Loop

This loop is fixture-driven and based on examples from:

- https://mermaid.js.org/syntax/stateDiagram.html

## Commands

Run currently supported fixtures only (green baseline):

```bash
yarn workspace tldraw mermaid:state:loop:baseline
```

Run full strict loop (includes TODO fixtures when present):

```bash
yarn workspace tldraw mermaid:state:loop
```

Run strict loop in watch mode while iterating:

```bash
yarn workspace tldraw mermaid:state:loop:watch
```

Run visual monitor loop (captures screenshot per fixture):

```bash
yarn workspace tldraw mermaid:state:loop:visual
```

Run visual monitor in strict mode (includes TODO fixtures when present):

```bash
yarn workspace tldraw mermaid:state:loop:visual:strict
```

Visual report output:

`apps/examples/e2e/test-results/mermaid-state-visual-loop/report.json`

## Fixture Source

Fixtures are defined in:

`packages/tldraw/src/test/fixtures/mermaidStateLoopFixtures.ts`

- `status: "supported"`: must remain green.
- `status: "todo"`: docs-derived gaps to implement next.
