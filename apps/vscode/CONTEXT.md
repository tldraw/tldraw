# VSCode Extension (apps/vscode)

The tldraw VS Code extension enables users to create, view, and edit `.tldr` files directly within VS Code, bringing the full tldraw infinite canvas experience to the editor.

## Architecture Overview

This application consists of two main components:

### Extension (`apps/vscode/extension/`)

The VS Code extension itself, built in TypeScript:

- **Entry Point**: `src/extension.ts` - Main activation function and extension lifecycle
- **Editor Provider**: `src/TldrawEditorProvider.ts` - Custom editor provider for .tldr files
- **Webview Manager**: `src/TldrawWebviewManager.ts` - Manages webview communication
- **Document Handling**: `src/TldrawDocument.ts` - Document model for .tldr files
- **File Operations**: `src/file.ts` - File I/O utilities for .tldr files
- **Utilities**: `src/utils.ts`, `src/unfurl.ts`, `src/media.ts` - Supporting functionality

### Editor (`apps/vscode/editor/`)

A React-based webview application that renders the tldraw editor:

- **Entry Point**: `src/index.tsx` - React app initialization
- **Main App**: `src/app.tsx` - Core tldraw editor component
- **File Handling**: `src/FileOpen.tsx` - File open/import UI
- **Change Tracking**: `src/ChangeResponder.tsx` - Handles editor state changes
- **Messages**: `src/FullPageMessage.tsx` - Error/loading states
- **Utils**: `src/utils/` - RPC communication, bookmarks, external content handling

## Key Features

**File Support**

- Opens `.tldr` and `.tldr.json` files
- Creates new tldraw files via command palette
- Bidirectional compatibility with tldraw.com web app

**Editor Integration**

- Custom VS Code editor provider for seamless integration
- Keyboard shortcuts for zoom and dark mode toggle
- Hot reload support in development mode
- Webview-based rendering using the full tldraw SDK

**Communication**

- RPC-based communication between extension and webview
- Real-time file change synchronization
- External content handling for links and embeds

## Development Commands

**Extension Development**

- `yarn dev` - Start extension development with hot reload
- `yarn build` - Build extension and editor for production
- `yarn package` - Create .vsix package for distribution

**Editor Development**

- `yarn dev` (from editor/) - Start editor development server
- `yarn build` (from editor/) - Build editor bundle

## Extension Configuration

The extension contributes:

- Custom editor for `.tldr` files
- Command palette command "tldraw: New Project"
- Keyboard shortcuts for zoom and dark mode
- File type associations for `.tldr` and `.tldr.json`

## Build System

- Extension uses esbuild for fast compilation
- Editor uses esbuild with React/JSX support
- Webpack used for extension packaging
- TypeScript with strict settings for type safety

## Publishing

- Pre-releases: Automatic on `main` branch merges
- Production releases: Automatic on `production` branch merges
- Manual publishing via `yarn publish` command
- Direct .vsix downloads available from repository

## Key Dependencies

- **VS Code API**: Core extension functionality
- **tldraw**: Full tldraw SDK for editor capabilities
- **React/ReactDOM**: UI framework for webview
- **fs-extra**: Enhanced file system operations
- **esbuild**: Fast TypeScript/React compilation
- **cheerio**: HTML parsing for unfurling
- **node-fetch**: HTTP requests for external content
