---
name: diagram
description: Generate visual diagrams rendered as interactive tldraw shapes via @tldraw/mermaid. Use when planning architecture, explaining code flow, visualizing state machines, illustrating request sequences, or any time a visual diagram would aid understanding.
allowed-tools: Bash(bash *ensure-viewer*), Bash(bash *stop-viewer*), Write
---

# Diagram skill

Generates Mermaid diagrams and renders them as interactive, editable tldraw shapes
using `@tldraw/mermaid`. The viewer is a self-contained Vite app inside `viewer/`.

## Setup

Requires Node.js 18+. Dependencies install automatically on first run.

## Workflow

1. Generate mermaid syntax for the requested diagram
2. Start the viewer (also creates `tmp/diagrams/`):
   ```sh
   bash .claude/skills/diagram/scripts/ensure-viewer.sh --open
   ```
3. Write the mermaid file. The path MUST be relative to the repo root working
   directory, not relative to this skill. Example absolute-style path:
   `./tmp/diagrams/<name>.mmd`
   Use descriptive kebab-case names: `auth-flow.mmd`, `system-architecture.mmd`.
4. Tell the user the diagram is ready at http://localhost:5799

Each `.mmd` file renders as a separate tldraw page. The viewer polls every second
and only re-renders changed files.

To stop the viewer:
```sh
bash .claude/skills/diagram/scripts/stop-viewer.sh
```

## Supported diagram types

`@tldraw/mermaid` converts these to native editable tldraw shapes:

- **Flowchart** (`flowchart TD/LR`) — architecture, data flow, decisions
- **Sequence diagram** (`sequenceDiagram`) — request flows, service interactions
- **State diagram** (`stateDiagram-v2`) — lifecycle, state machines

Other mermaid types throw `MermaidDiagramError` with `type: 'unsupported'`.

## Troubleshooting

- **Parse errors**: Check the browser console at http://localhost:5799.
- **Port 5799 in use**: Kill the process on that port or edit the port in
  `scripts/ensure-viewer.sh`.
- **npm install fails**: Run `cd .claude/skills/diagram/viewer && npm install`
  manually for full error output.
