---
title: VS Code extension
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - vscode
  - extension
  - editor
  - tldr files
---

## Overview

The tldraw VS Code extension lets users open and edit `.tldr` files directly in the editor. It pairs a TypeScript extension host with a React-based webview that renders the tldraw editor.

## Key components

### Extension host

The extension registers a custom editor provider and manages file I/O, lifecycle, and webview wiring.

### Webview editor

The webview bundles a React app that hosts `Tldraw` and handles rendering, inputs, and asset integration.

### Messaging

The extension and webview communicate via `postMessage` to load documents and persist updates:

```typescript
// Extension -> webview
webview.postMessage({ type: 'load', data: documentContent })

// Webview -> extension
vscode.postMessage({ type: 'save', data: editorState })
```

## Data flow

1. VS Code opens a `.tldr` file.
2. The extension reads the file into a `TldrawDocument`.
3. The webview loads the document state.
4. User edits update the webview state.
5. The webview sends changes back for persistence.

## Development workflow

```bash
# From apps/vscode/extension
yarn dev

yarn build

# From apps/vscode/editor
yarn dev
```

## Key files

- apps/vscode/extension/src/extension.ts - Extension entry point
- apps/vscode/extension/src/TldrawEditorProvider.ts - Custom editor provider
- apps/vscode/extension/src/TldrawDocument.ts - Document model
- apps/vscode/editor/src/app.tsx - Webview editor
- apps/vscode/package.json - Extension manifest

## Related

- [`@tldraw/tldraw`](../packages/tldraw.md) - Editor SDK
- [Examples app](./examples.md) - SDK examples
