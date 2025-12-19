---
title: VS Code extension
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - vscode
  - extension
  - editor
  - tldr files
---

The tldraw VS Code extension enables users to create, view, and edit `.tldr` files directly within VS Code, bringing the full tldraw infinite canvas experience to the editor.

## Overview

Two main components:

1. **Extension** - VS Code extension in TypeScript
2. **Editor** - React-based webview for rendering tldraw

## Architecture

### Extension (`apps/vscode/extension/`)

```
extension/
├── src/
│   ├── extension.ts           # Main activation
│   ├── TldrawEditorProvider.ts # Custom editor provider
│   ├── TldrawWebviewManager.ts # Webview communication
│   ├── TldrawDocument.ts      # Document model
│   ├── file.ts                # File I/O utilities
│   └── utils.ts               # Supporting utilities
```

### Editor (`apps/vscode/editor/`)

```
editor/
├── src/
│   ├── index.tsx              # React initialization
│   ├── app.tsx                # Core tldraw editor
│   ├── FileOpen.tsx           # File import UI
│   ├── ChangeResponder.tsx    # State change handling
│   └── utils/                 # RPC, bookmarks, etc.
```

## Features

### File support

- Opens `.tldr` and `.tldr.json` files
- Creates new files via command palette
- Bidirectional compatibility with tldraw.com

### Editor integration

- Custom VS Code editor provider
- Keyboard shortcuts for zoom and dark mode
- Hot reload in development
- Webview-based rendering

### Communication

- RPC between extension and webview
- Real-time file synchronization
- External content handling

## Development

### Commands

```bash
# From extension/
yarn dev     # Start extension development
yarn build   # Build for production
yarn package # Create .vsix package

# From editor/
yarn dev     # Start editor development server
yarn build   # Build editor bundle
```

### Debugging

1. Open the workspace in VS Code
2. Press F5 to launch Extension Development Host
3. Open or create a `.tldr` file

## Extension contributions

### Commands

- `tldraw.newProject` - Create new tldraw file

### Keybindings

| Shortcut           | Action           |
| ------------------ | ---------------- |
| `Cmd/Ctrl+=`       | Zoom in          |
| `Cmd/Ctrl+-`       | Zoom out         |
| `Cmd/Ctrl+Shift+D` | Toggle dark mode |

### File associations

- `.tldr` files
- `.tldr.json` files

## Build system

- **esbuild**: Fast TypeScript/React compilation
- **Webpack**: Extension packaging
- **TypeScript**: Strict type checking

## Publishing

- **Pre-releases**: Automatic on `main` branch merges
- **Production**: Automatic on `production` branch merges
- **Manual**: `yarn publish` command
- **Direct download**: .vsix files from repository

## Key dependencies

- `vscode` - VS Code API
- `tldraw` - Full tldraw SDK
- `react` / `react-dom` - UI framework
- `esbuild` - Build tool
- `cheerio` - HTML parsing for unfurling

## How it works

### Editor provider

```typescript
class TldrawEditorProvider implements vscode.CustomEditorProvider {
	async openCustomDocument(uri: vscode.Uri) {
		// Load .tldr file content
		return new TldrawDocument(uri)
	}

	async resolveCustomEditor(document, webviewPanel) {
		// Create webview with tldraw editor
		const manager = new TldrawWebviewManager(webviewPanel, document)
		manager.setup()
	}
}
```

### Webview communication

```typescript
// Extension → Webview
webview.postMessage({ type: 'load', data: documentContent })

// Webview → Extension
vscode.postMessage({ type: 'save', data: editorState })
```

### Document synchronization

1. VS Code opens .tldr file
2. Extension loads content into TldrawDocument
3. Webview receives content via message
4. User edits in tldraw
5. Changes sent back to extension
6. Extension updates TldrawDocument
7. VS Code handles file persistence

## Key files

- `extension/src/extension.ts` - Extension entry point
- `extension/src/TldrawEditorProvider.ts` - Custom editor
- `editor/src/app.tsx` - Tldraw editor component
- `package.json` - Extension manifest

## Related

- [@tldraw/tldraw](../packages/tldraw.md) - Editor SDK
- [Examples app](./examples.md) - SDK examples
