# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the tldraw monorepo - an infinite canvas SDK for React applications. It's organized using yarn workspaces with packages for the core editor, UI components, shapes, tools, and supporting infrastructure.

**Important**: There are CONTEXT.md files throughout this repository designed specifically for AI agents. Always read the relevant CONTEXT.md files to understand packages and their architecture.

## Essential Commands

### Development

- `yarn dev` - Start development server for examples app (main SDK showcase)
- `yarn dev-app` - Start tldraw.com client app development
- `yarn dev-docs` - Start documentation site development
- `yarn dev-vscode` - Start VSCode extension development
- `yarn dev-template <template name>` - Runs a template
- `yarn context` - Find and display nearest CONTEXT.md file (supports -v, -r, -u flags)
- `yarn refresh-context` - Update CONTEXT.md files using Claude Code CLI

### Testing

- `yarn test run` in root - Run all tests (slow, avoid unless necessary)
- `yarn test run` in a workspace - Run tests in specific workspace (cd to workspace first)
- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-dotcom` - Run end-to-end tests for tldraw.com

### Code Quality

- `yarn lint` - Lint package
- `yarn typecheck` in workspace root - Type check all packages
- `yarn format` - Format code with Prettier
- `yarn api-check` - Validate public API consistency

IMPORTANT: NEVER run bare `tsc` - always use `yarn typecheck`.
If the `typecheck` command is not found, it's because you're not running it from the root of the repo.

## Architecture Overview

### Core Packages Structure

**@tldraw/editor** - Foundational infinite canvas editor

- No shapes, tools, or UI - just the core engine
- State management using reactive signals (@tldraw/state)
- Shape system via ShapeUtil, Tools via StateNode
- Bindings system for shape relationships

**@tldraw/tldraw** - Complete "batteries included" SDK

- Builds on editor with full UI, shapes, and tools
- Default shape utilities (text, draw, geo, arrow, etc.)
- Complete tool set (select, hand, eraser, etc.)
- Responsive UI system with customizable components

**@tldraw/store** - Reactive client-side database

- Document persistence with IndexedDB
- Reactive updates using signals
- Migration system for schema changes

**@tldraw/tlschema** - Type definitions and validators

- Shape, binding, and record type definitions
- Validation schemas and migrations
- Shared data structures

### Key Architectural Patterns

**Reactive State Management**

- Uses @tldraw/state for reactive signals (Atom, Computed)
- All editor state is reactive and observable
- Automatic dependency tracking prevents unnecessary re-renders

**Shape System**

- Each shape type has a ShapeUtil class defining behavior
- ShapeUtil handles geometry, rendering, interactions
- Extensible - custom shapes via new ShapeUtil implementations

**Tools as State Machines**

- Tools implemented as StateNode hierarchies
- Event-driven with pointer, keyboard, tick handlers
- Complex tools have child states (e.g., SelectTool has Brushing, Translating, etc.)

**Bindings System**

- Relationships between shapes (arrows to shapes, etc.)
- BindingUtil classes define binding behavior
- Automatic updates when connected shapes change

## Testing Patterns

**Vitest Tests**

- Unit tests: name test files after the file being tested (e.g., `LicenseManager.test.ts`)
- Integration tests: use `src/test/feature-name.test.ts` format
- Test in tldraw workspace if you need default shapes/tools

**Running Tests**

- Run from specific workspace directory: `cd packages/editor && yarn test run`
- Filter with additional args: `yarn test run --grep "selection"`
- Avoid `yarn test` from root (slow and hard to filter)

**Playwright E2E Tests**

- Located in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`
- Use `yarn e2e` and `yarn e2e-dotcom` commands

## Development Workspace Structure

```
apps/
├── examples/          # SDK examples and demos
├── docs/             # Documentation site (tldraw.dev)
├── dotcom/           # tldraw.com application
│   ├── client/       # Frontend React app
│   ├── sync-worker/  # Multiplayer backend
│   └── asset-upload-worker/
└── vscode/           # VSCode extension

packages/
├── editor/           # Core editor engine
├── tldraw/           # Complete SDK with UI
├── store/            # Reactive database
├── tlschema/         # Type definitions
├── state/            # Reactive signals library
├── sync/             # Multiplayer SDK
├── utils/            # Shared utilities
├── validate/         # Lightweight validation library
├── assets/           # Icons, fonts, translations
└── create-tldraw/    # npm create tldraw CLI

templates/            # Starter templates for different frameworks
```

## Build System (LazyRepo)

Uses `lazyrepo` for incremental builds with caching:

- `yarn build` builds only what changed
- Workspace dependencies handled automatically
- Caching based on file inputs/outputs
- Parallel execution where possible

## Key Development Notes

**TypeScript**

- Uses workspace references for fast incremental compilation
- Run `yarn typecheck` before commits
- API surface validated with Microsoft API Extractor

**Monorepo Management**

- Yarn workspaces with berry (yarn 4.x)
- Use `yarn` not `npm` - packageManager field enforces this
- Dependencies managed at workspace level where possible

**Asset Management**

- Icons, fonts, translations in `/assets` (managed centrally)
- Run `yarn refresh-assets` after asset changes
- Assets bundled into packages during build
- Automatic optimization and deduplication

**Example Development**

- Main development happens in `apps/examples`
- Examples showcase SDK capabilities
- See `apps/examples/writing-examples.md` for guidelines

## Creating New Components

**Custom Shapes**

1. Create ShapeUtil class extending base ShapeUtil
2. Implement required methods (getGeometry, component, indicator)
3. Register in editor via shapeUtils prop

**Custom Tools**

1. Create StateNode class with tool logic
2. Define state machine with onEnter/onExit/event handlers
3. Register in editor via tools prop

**UI Customization**

- Every tldraw UI component can be overridden
- Pass custom components via `components` prop
- See existing components for patterns

## Integration Notes

**With External Apps**

- Import CSS: `import 'tldraw/tldraw.css'` (full) or `import '@tldraw/editor/editor.css'` (editor only)
- Requires React 18+ and modern bundler
- Support for Vite, Next.js, and other React frameworks

**Collaboration**

- Use @tldraw/sync for multiplayer
- WebSocket-based real-time synchronization
- See templates/sync-cloudflare for implementation example

**Licensing**

- SDK has "Made with tldraw" watermark by default
- Business license removes watermark
- See tldraw.dev for licensing details

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

# cursor-rules-integration

When writing examples, be sure to read the `./apps/examples/writing-examples.md` file for proper example patterns and conventions.
