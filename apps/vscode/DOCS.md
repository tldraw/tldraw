# VS Code Extension Documentation

## 1. Introduction

### What is the tldraw VS Code Extension?

The tldraw VS Code extension brings the full power of tldraw's infinite canvas directly into your code editor. You can create, view, and edit `.tldr` files seamlessly within VS Code, making it perfect for sketching ideas, creating diagrams, wireframes, and visual documentation alongside your code.

This extension provides a native editing experience that's fully compatible with tldraw.com, so you can start a drawing in VS Code and continue it in the browser, or vice versa.

### Installation

Install the extension directly from the VS Code marketplace:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "tldraw"
4. Click Install

Alternatively, you can install from a `.vsix` file by running:
```bash
code --install-extension tldraw-vscode.vsix
```

### Quick Start

Here's how to get started with your first tldraw file:

```bash
# Create a new .tldr file
touch my-diagram.tldr

# Open it in VS Code - the tldraw editor will launch automatically
code my-diagram.tldr
```

You'll immediately have access to the full tldraw toolset: drawing, shapes, text, arrows, and more.

## 2. Core Features

### File Support

The extension provides comprehensive support for tldraw files:

**Supported File Types**
- `.tldr` files - Native tldraw format
- `.tldr.json` files - JSON representation of tldraw documents

**File Operations**
- Create new tldraw files via Command Palette (`Cmd/Ctrl+Shift+P` → "tldraw: New Project")
- Open existing `.tldr` files with automatic editor activation
- Auto-save changes as you work
- Full bidirectional compatibility with tldraw.com

### Drawing and Design Tools

You have access to tldraw's complete toolset within VS Code:

**Core Drawing Tools**
- **Select Tool** - Move, resize, and modify shapes
- **Draw Tool** - Freehand drawing with pressure sensitivity support
- **Eraser Tool** - Remove parts of drawings or entire shapes
- **Hand Tool** - Pan around the infinite canvas

**Shape Creation**
- **Rectangle** - Perfect for wireframes and layouts
- **Ellipse** - Circles and ovals for diagrams
- **Arrow** - Connect ideas with labeled arrows
- **Line** - Straight lines with various styles
- **Text** - Rich text with formatting options
- **Sticky Notes** - Great for brainstorming and annotations

**Advanced Features**
- Infinite canvas with smooth zoom and pan
- Layer management and grouping
- Shape styling (colors, fills, strokes)
- Snap-to-grid and alignment tools
- Undo/redo with full history

### Editor Integration

The extension integrates seamlessly with VS Code's interface:

**Custom Editor Provider**
- Native VS Code editor experience for `.tldr` files
- Appears in editor tabs like any other file
- Works with VS Code's split-pane layout
- Respects VS Code's theme settings (light/dark mode)

**Keyboard Shortcuts**
- `Cmd/Ctrl +` - Zoom in
- `Cmd/Ctrl -` - Zoom out  
- `Cmd/Ctrl 0` - Reset zoom to fit content
- `Cmd/Ctrl D` - Toggle dark mode

**Command Palette Integration**
- "tldraw: New Project" - Create a new `.tldr` file
- All commands prefixed with "tldraw:" for easy discovery

## 3. Working with Files

### Creating New Projects

You can create new tldraw files in several ways:

**Via Command Palette**
```bash
# Open Command Palette
Cmd/Ctrl + Shift + P

# Type and select
tldraw: New Project
```

This creates a new untitled `.tldr` file and opens it in the tldraw editor.

**Via File Explorer**
```bash
# Create an empty .tldr file
touch project-wireframes.tldr

# VS Code will automatically open it with the tldraw editor
```

**Programmatically**
You can also create `.tldr` files through VS Code's file system APIs if you're building extensions or automation.

### File Persistence and Auto-Save

The extension handles file persistence automatically:

**Auto-Save Behavior**
- Changes are automatically saved as you work
- No need to manually save (Cmd/Ctrl+S) in most cases
- File modification indicators work as expected in VS Code

**File Format**
- Files are stored in tldraw's native binary format
- Optimized for performance and file size
- Maintains full compatibility with tldraw.com

### Cross-Platform Compatibility

Your `.tldr` files work seamlessly across platforms:

**Browser Integration**
- Upload files directly to tldraw.com
- Download files from tldraw.com to edit in VS Code
- No conversion needed - files are fully compatible

**Sharing and Collaboration**
- Share `.tldr` files like any other project asset
- Version control friendly (though binary diffs aren't human-readable)
- Works great in shared repositories and project folders

## 4. Development and Customization

### Extension Architecture

The extension consists of two main components working together:

**Extension Process** (`apps/vscode/extension/`)
- Handles VS Code integration and file system operations
- Manages the custom editor provider registration
- Coordinates between VS Code APIs and the webview editor

**Webview Editor** (`apps/vscode/editor/`)
- React-based tldraw editor running in a webview
- Full tldraw SDK implementation with complete feature set
- Handles real-time drawing, user interactions, and state management

### Communication System

The extension uses a robust RPC (Remote Procedure Call) system for communication:

**Bidirectional Messaging**
```ts
// Extension to webview
webview.postMessage({
  type: 'openFile',
  data: { content: fileContent }
})

// Webview to extension  
message.addEventListener('message', (event) => {
  if (event.data.type === 'fileChanged') {
    // Save changes to disk
    saveFile(event.data.content)
  }
})
```

**File Change Synchronization**
- Real-time sync between editor state and file system
- Automatic conflict resolution for external file changes
- Efficient delta updates to minimize data transfer

### Hot Reload Development

For extension developers, the build system supports hot reload:

**Development Setup**
```bash
# Start extension development with hot reload
cd apps/vscode
yarn dev

# This starts both extension and editor in watch mode
# Extension reloads automatically when files change
```

**Development Workflow**
1. Make changes to extension or editor code
2. Extension automatically recompiles and reloads
3. Test changes immediately in VS Code Extension Development Host
4. No need to manually rebuild or restart

### External Content Handling

The extension can handle external content intelligently:

**Link Unfurling**
- Paste URLs to automatically create rich link previews
- Supports common sites with Open Graph metadata
- Configurable unfurling behavior

**Asset Management**
- Drag and drop images directly into drawings
- Automatic asset optimization and caching
- Support for various image formats

## 5. Advanced Usage

### Performance Optimization

The extension is optimized for performance in VS Code:

**Memory Management**
- Efficient webview lifecycle management
- Automatic cleanup when files are closed
- Optimized rendering for large documents

**File Loading**
- Lazy loading of large `.tldr` files
- Progressive rendering for complex drawings
- Background processing for file operations

**Zoom and Pan Performance**
- Hardware-accelerated rendering where available
- Smooth interactions even with complex drawings
- Efficient viewport culling for large canvases

### Integration with VS Code Features

The extension works well with VS Code's ecosystem:

**Multi-Root Workspaces**
- Full support for multi-root workspace configurations
- Proper file path resolution across workspace folders
- Consistent behavior regardless of workspace setup

**Split Editors**
- Open multiple `.tldr` files in split panes
- Compare different versions side-by-side
- Works with VS Code's editor group management

**Extension Compatibility**
- Compatible with other VS Code extensions
- Respects VS Code's theme and color customizations
- Works with productivity extensions like project managers

### Troubleshooting Common Issues

**File Won't Open**
- Ensure the file has a `.tldr` or `.tldr.json` extension
- Check that the file isn't corrupted or empty
- Try creating a new file to test the extension

**Performance Issues**
- Close unused `.tldr` files to free memory
- Restart VS Code if webviews become unresponsive
- Check VS Code's output panel for error messages

**Sync Issues with tldraw.com**
- Verify file format compatibility
- Try re-saving the file in VS Code
- Check for any file permission issues

## 6. Building and Distribution

### Development Build

To build the extension locally:

**Prerequisites**
- Node.js 16+ and yarn
- VS Code development environment

**Build Process**
```bash
# Install dependencies
cd apps/vscode
yarn install

# Build extension and editor
yarn build

# Package for distribution
yarn package
```

This creates a `.vsix` file that can be installed locally or distributed.

**Development Testing**
```bash
# Start development environment
yarn dev

# This opens VS Code Extension Development Host
# Test your changes in the new VS Code window
```

### Publishing

The extension supports multiple distribution channels:

**VS Code Marketplace**
- Automated publishing from CI/CD pipeline
- Version tagging based on git branches
- Pre-release builds available for testing

**Manual Installation**
```bash
# Install from local .vsix file
code --install-extension tldraw-vscode-*.vsix

# Or drag the .vsix file into VS Code Extensions view
```

**GitHub Releases**
- Direct `.vsix` downloads from repository releases
- Includes release notes and compatibility information
- Tagged versions for stable releases

### Configuration and Settings

The extension supports customization through VS Code settings:

**Available Settings**
- Theme preferences (auto-detect from VS Code)
- Default canvas size and grid settings
- Auto-save behavior configuration
- Performance optimization toggles

**Settings Access**
```json
{
  "tldraw.theme": "auto",
  "tldraw.autoSave": true,
  "tldraw.gridSize": 20
}
```

Access these through VS Code's Settings UI or directly in `settings.json`.

## Quality and Best Practices

This extension follows VS Code's development best practices:

- **Accessibility** - Full keyboard navigation and screen reader support
- **Performance** - Efficient resource usage and memory management  
- **Security** - Safe handling of user content and external resources
- **Internationalization** - Ready for localization and global users
- **Error Handling** - Graceful degradation and helpful error messages

The extension provides a professional-grade drawing experience that integrates seamlessly with your development workflow, making visual thinking and documentation a natural part of your coding process.