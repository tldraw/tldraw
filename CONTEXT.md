# CONTEXT.md - tldraw Monorepo

This file provides comprehensive context for understanding the tldraw monorepo, an infinite canvas SDK for React applications and the infrastructure behind tldraw.com.

## Repository Overview

This is a TypeScript monorepo containing the complete tldraw ecosystem - from the core infinite canvas SDK to the collaborative whiteboard application tldraw.com. It's organized using Yarn Berry workspaces and built with a custom incremental build system called LazyRepo.

**Repository Purpose:** Develop and maintain tldraw as both an open-source SDK for developers and a commercial collaborative whiteboard service.

**Version:** 3.15.1 across all packages  
**Node.js:** ^20.0.0 required  
**React:** ^18.0.0 || ^19.0.0 peer dependency

## Essential Commands

### Development Commands

- `yarn dev` - Start development server for examples app (main SDK showcase)
- `yarn dev-app` - Start tldraw.com client app development
- `yarn dev-docs` - Start documentation site development (tldraw.dev)
- `yarn dev-vscode` - Start VSCode extension development
- `yarn dev-template <template>` - Run a specific template (e.g., vite, nextjs, workflow)
- `yarn refresh-assets` - Refresh and bundle assets after changes
- `yarn refresh-context` - Review and update CONTEXT.md files using Claude Code CLI
- `yarn context` - Find and display nearest CONTEXT.md file (supports -v, -r, -u flags)

### Building

- `yarn build` - Build all packages using LazyRepo (incremental build system)
- `yarn build-package` - Build all SDK packages only
- `yarn build-app` - Build tldraw.com client app
- `yarn build-docs` - Build documentation site

### Testing

- `yarn test run` - Run tests in specific workspace (cd to workspace first)
- `yarn test run --grep "pattern"` - Filter tests by pattern
- `yarn vitest` - Run all tests (slow, avoid unless necessary)
- `yarn test-ci` - Run tests in CI mode
- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-dotcom` - Run end-to-end tests for tldraw.com
- `yarn e2e-ui` - Run E2E tests with Playwright UI

### Code Quality

- `yarn lint` - Lint all packages
- `yarn typecheck` - Type check all packages (run before commits)
- `yarn format` - Format code with Prettier
- `yarn api-check` - Validate public API consistency

## High-Level Architecture

### Monorepo Structure

**Packages (`packages/`)** - Core SDK and libraries:

- `@tldraw/editor` - Foundational canvas editor engine without shapes or UI
- `@tldraw/tldraw` - Complete "batteries included" SDK with UI, shapes, and tools
- `@tldraw/store` - Reactive client-side database built on signals
- `@tldraw/state` - Fine-grained reactive state management (signals system)
- `@tldraw/tlschema` - Type definitions, validators, and migrations
- `@tldraw/sync` + `@tldraw/sync-core` - Multiplayer collaboration system
- `@tldraw/utils` - Shared utilities across packages
- `@tldraw/validate` - Lightweight validation library
- `@tldraw/create-tldraw` - npm create tldraw CLI tool
- `@tldraw/dotcom-shared` - Shared utilities for dotcom application
- `@tldraw/namespaced-tldraw` - Namespaced tldraw components
- `@tldraw/state-react` - React integration for state management
- `@tldraw/worker-shared` - Shared utilities for Cloudflare Workers

**Applications (`apps/`)** - Production applications and examples:

- `apps/examples/` - SDK examples and demos (primary development environment, 130+ examples)
- `apps/docs/` - Documentation website (tldraw.dev) built with Next.js
- `apps/dotcom/client/` - tldraw.com React frontend application with auth, file management
- `apps/dotcom/sync-worker/` - Cloudflare Worker handling multiplayer backend and real-time sync
- `apps/dotcom/asset-upload-worker/` - Cloudflare Worker for media uploads to R2
- `apps/dotcom/image-resize-worker/` - Cloudflare Worker for image optimization
- `apps/dotcom/zero-cache/` - Database synchronization layer using Rocicorp Zero
- `apps/vscode/` - tldraw VSCode extension for .tldr files
- `apps/analytics/` - Analytics service (UMD library for cookie consent and tracking)
- `apps/bemo-worker/` - Bemo worker service for collaboration and asset management

**Templates (`templates/`)** - Framework starter templates:

- `vite/` - Vite integration example (fastest way to get started)
- `nextjs/` - Next.js integration example with SSR support
- `vue/` - Vue integration example
- `sync-cloudflare/` - Multiplayer implementation with Cloudflare Durable Objects
- `ai/` - AI integration example
- `branching-chat/` - AI-powered conversational UI with node-based chat trees
- `workflow/` - Node-based visual programming interface for executable workflows
- `chat/`, `agent/`, `simple-server-example/` - Additional use case examples

### Core SDK Architecture

**Three-Layer System:**

1. **@tldraw/editor** - Pure canvas engine
   - No shapes, tools, or UI - just the reactive editor foundation
   - Shape system via ShapeUtil classes, Tools via StateNode state machines
   - Bindings system for relationships between shapes
   - Uses @tldraw/state for reactive state management

2. **@tldraw/tldraw** - Complete SDK
   - Wraps editor with full UI system, shape implementations, and tools
   - Default shapes: text, draw, geo, arrow, note, line, frame, highlight, etc.
   - Complete tool set: select, hand, eraser, laser, zoom + shape creation tools
   - Responsive UI with mobile/desktop adaptations

3. **@tldraw/store** - Reactive data layer
   - Type-safe record storage with automatic validation
   - Change history and undo/redo support
   - IndexedDB persistence and migration system
   - Built on @tldraw/state reactive signals

### Reactive State Management

**@tldraw/state - Signals Architecture:**

- Fine-grained reactivity similar to MobX or SolidJS
- `Atom<T>` for mutable state, `Computed<T>` for derived values
- Automatic dependency tracking during computation
- Efficient updates with minimal re-computation
- Memory-optimized with `ArraySet` and cleanup systems

**Pattern Throughout Codebase:**

- All editor state is reactive and observable
- Components automatically re-render when dependencies change
- Store changes trigger reactive updates across the system
- Batched updates prevent cascading re-computations

### Shape and Tool System

**Shape Architecture:**

- Each shape type has a `ShapeUtil` class defining behavior
- ShapeUtil handles geometry calculation, rendering, hit testing, interactions
- Extensible system - custom shapes via new ShapeUtil implementations
- Shape definitions in `@tldraw/tlschema` with validators and migrations

**Tool State Machines:**

- Tools implemented as `StateNode` hierarchies with parent/child states
- Event-driven architecture (pointer, keyboard, tick events)
- Complex tools like SelectTool have multiple child states (Brushing, Translating, etc.)
- State machines handle tool lifecycle and user interactions

**Bindings System:**

- Relationships between shapes (arrows connecting to shapes, etc.)
- `BindingUtil` classes define binding behavior and visual indicators
- Automatic updates when connected shapes change position/properties

## Testing Patterns

### Vitest Tests

**Unit Tests:**

- Test files named `*.test.ts` alongside source files (e.g., `LicenseManager.test.ts`)
- Integration tests use `src/test/feature-name.test.ts` format
- Test in tldraw workspace if you need default shapes/tools

**Running Tests:**

- Run from specific workspace directory: `cd packages/editor && yarn test run`
- Filter with additional args: `yarn test run --grep "selection"`
- Avoid root-level `yarn test` (slow and hard to filter)

### Playwright E2E Tests

- Located in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`
- Use `yarn e2e` and `yarn e2e-dotcom` commands
- Comprehensive UI interaction testing

## Development Workspace Structure

```
apps/
├── examples/          # SDK examples and demos (primary development environment)
├── docs/             # Documentation site (tldraw.dev) built with Next.js + SQLite + Algolia
├── dotcom/           # tldraw.com application stack
│   ├── client/       # Frontend React app with Clerk auth
│   ├── sync-worker/  # Cloudflare Worker for multiplayer backend + file management
│   ├── asset-upload-worker/  # Cloudflare Worker for media uploads to R2
│   ├── image-resize-worker/  # Cloudflare Worker for image optimization + format conversion
│   └── zero-cache/   # Future database synchronization layer (Rocicorp Zero + PostgreSQL)
├── vscode/           # tldraw VSCode extension (.tldr file support)
├── analytics/        # Analytics service (UMD library with GDPR compliance)
└── bemo-worker/      # Bemo worker service (collaboration + asset management)

packages/
├── editor/           # Core editor engine (foundational canvas editor)
├── tldraw/           # Complete SDK with UI ("batteries included")
├── store/            # Reactive client-side database built on signals
├── tlschema/         # Type definitions, validators, and migrations
├── state/            # Fine-grained reactive state management (signals system)
├── sync/             # Multiplayer collaboration system
├── sync-core/        # Core multiplayer functionality
├── utils/            # Shared utilities across packages
├── validate/         # Lightweight validation library
├── assets/           # Icons, fonts, translations (managed centrally)
├── create-tldraw/    # npm create tldraw CLI tool
├── dotcom-shared/    # Shared utilities for dotcom application
├── namespaced-tldraw/ # Namespaced tldraw components
├── state-react/      # React integration for state management
└── worker-shared/    # Shared utilities for Cloudflare Workers

templates/            # Starter templates for different frameworks
├── vite/            # Vite integration example (fastest way to start)
├── nextjs/          # Next.js integration example with SSR
├── vue/             # Vue integration example
├── sync-cloudflare/ # Multiplayer implementation with Cloudflare Durable Objects
├── ai/              # AI integration example
├── branching-chat/  # AI-powered conversational UI with node-based chat trees
├── workflow/        # Node-based visual programming interface for workflows
├── chat/            # Chat template
├── agent/           # Agent template
└── simple-server-example/ # Simple server example

internal/             # Internal development tools and configuration
├── apps-script/     # Google Apps Script configuration for Meet integration
├── config/          # Shared TypeScript, API, and test configurations
├── dev-tools/       # Git bisect helper tool for debugging
├── health-worker/   # Updown.io webhook → Discord alert forwarding
└── scripts/         # Build, deployment, and maintenance automation
```

## Development Infrastructure

### Build System (LazyRepo)

Custom incremental build system optimized for monorepos:

- Builds only packages that changed based on file inputs/outputs
- Automatic dependency resolution between workspaces
- Intelligent caching with cache invalidation
- Parallel execution where dependencies allow
- Configuration in `lazy.config.ts`

### Package Management

**Yarn Berry (v4) with Workspaces:**

- Workspace dependencies automatically linked
- Package manager enforced via `packageManager` field
- Efficient disk usage with Plug'n'Play
- Lock file and cache committed to repository

### Code Quality

**TypeScript Configuration:**

- Workspace references for incremental compilation
- API surface validation with Microsoft API Extractor
- Strict type checking across all packages
- Generated API documentation from TSDoc comments

**Linting and Formatting:**

- ESLint with custom configuration in `eslint.config.mjs`
- Prettier for consistent code formatting
- Pre-commit hooks via Husky ensuring quality

## Key Development Notes

### TypeScript Workflow

- Uses workspace references for fast incremental compilation
- Run `yarn typecheck` before commits (critical for API consistency)
- API surface validated with Microsoft API Extractor
- Strict type checking across all packages

### Monorepo Management

- Yarn workspaces with berry (yarn 4.x) - use `yarn` not `npm`
- Package manager enforced via `packageManager` field in package.json
- Dependencies managed at workspace level where possible
- Efficient disk usage with Plug'n'Play system

### Asset Management Workflow

- Icons, fonts, translations stored in `/assets` directory
- Run `yarn refresh-assets` after making asset changes
- Assets automatically bundled into packages during build process
- Shared across packages and applications with optimization

### Primary Development Environment

- Main development happens in `apps/examples` - the SDK showcase
- Examples demonstrate SDK capabilities and serve as development testbed
- See `apps/examples/writing-examples.md` for example guidelines
- Use examples app to test SDK changes in real scenarios

## Asset and Content Management

### Asset Pipeline

**Static Assets (`/assets`):**

- Automatic optimization and format conversion
- Deduplication and efficient bundling

**Dynamic Assets:**

- Image/video upload handling in Cloudflare Workers
- Asset validation, resizing, and optimization
- Hash-based deduplication and caching
- Support for various formats and size constraints

### External Content Integration

**Rich Content Handling:**

- Bookmark creation with metadata extraction
- Embed system for YouTube, Figma, Excalidraw, etc.
- SVG import with size calculation and optimization
- Copy/paste between tldraw instances with format preservation

## Collaboration and Sync

### Multiplayer Architecture

**@tldraw/sync System:**

- WebSocket-based real-time collaboration
- Conflict-free updates with operational transformation
- Presence awareness (cursors, selections) separate from document state
- Cloudflare Durable Objects for scalable backend

**Data Synchronization:**

- Document state synced via structured diffs
- Presence state (cursors, etc.) synced but not persisted
- Connection state management with reconnection logic
- See `templates/sync-cloudflare` for implementation patterns

### tldraw.com Infrastructure

**Production Application Stack:**

- **Frontend**: React SPA with Vite, Clerk auth, React Router, FormatJS i18n
- **Real-time Sync**: Cloudflare Workers + Durable Objects for multiplayer collaboration
- **Database**: PostgreSQL with Zero (Rocicorp) for optimistic client-server sync
- **Asset Pipeline**: R2 storage + image optimization + CDN delivery
- **Authentication**: Clerk integration with JWT-based API access
- **File Management**: Complete file system with sharing, publishing, version history

## Development Patterns

### Creating Custom Components

**Custom Shapes:**

1. Define shape type in schema with validator
2. Create `ShapeUtil` class extending base ShapeUtil
3. Implement required methods (getGeometry, component, indicator)
4. Register in editor via `shapeUtils` prop
5. Implement creation tool if needed

**Custom Tools:**

1. Create `StateNode` class with tool logic
2. Define state machine with onEnter/onExit/event handlers (onPointerDown, etc.)
3. Handle state transitions and editor updates
4. Register in editor via `tools` prop

### UI Customization

**Component Override System:**

- Every tldraw UI component can be replaced/customized
- Pass custom implementations via `components` prop
- Maintains responsive behavior and accessibility
- See existing components for architectural patterns

### Integration Patterns

**Embedding in Applications:**

- Import required CSS: `import 'tldraw/tldraw.css'` (full) or `import '@tldraw/editor/editor.css'` (editor only)
- Requires React 18+ and modern bundler support
- Works with Vite, Next.js, Create React App, and other React frameworks
- See templates directory for framework-specific examples
- Asset URLs configurable via `@tldraw/assets` package (imports, URLs, or self-hosted strategies)
- Use `npm create tldraw` CLI for quick project scaffolding

## Performance Considerations

### Rendering Optimization

**Canvas Performance:**

- WebGL-accelerated minimap rendering
- Viewport culling - only visible shapes rendered
- Shape geometry caching with invalidation
- Efficient hit testing and bounds calculation

**Reactive System Optimization:**

- Signals minimize unnecessary re-renders via precise dependency tracking
- Computed values cached until dependencies change
- Store changes batched to prevent cascading updates
- Component re-renders minimized through React.memo and signal integration
- Uses `__unsafe__getWithoutCapture()` for performance-critical paths

### Memory Management

**Efficient Resource Usage:**

- Automatic cleanup of event listeners and signal dependencies
- Asset deduplication reduces memory footprint
- Store history pruning prevents unbounded growth
- Shape utility garbage collection when unused

## Licensing and Business Model

**SDK Licensing:**

- Open source with "Made with tldraw" watermark by default
- Business license available for watermark removal
- Separate commercial terms for tldraw.com service

**Development Philosophy:**

- SDK-first development - tldraw.com built using the same APIs
- Extensive examples and documentation for SDK adoption
- Community-driven with transparent development process

## Advanced Features and Integrations

### Asset Management

**Centralized Assets (`@tldraw/assets`):**

- **Icon System**: 80+ icons in optimized SVG sprite format
- **Typography**: IBM Plex fonts (Sans, Serif, Mono) + Shantell Sans (handwritten)
- **Internationalization**: 40+ languages with regional variants (RTL support)
- **Embed Icons**: Service icons for external content (YouTube, Figma, etc.)
- **Export Strategies**: Multiple formats (imports, URLs, self-hosted) for different bundlers

**Dynamic Asset Pipeline:**

- **Upload Workers**: Cloudflare R2 + image optimization + format conversion (AVIF/WebP)
- **CDN Delivery**: Global asset distribution with intelligent caching
- **External Content**: Bookmark unfurling, embed metadata extraction
- **Deduplication**: Hash-based asset deduplication across uploads

### Collaboration Features

**Real-Time Multiplayer:**

- **Presence System**: Live cursors, selections, and user awareness indicators
- **Conflict Resolution**: Operational transformation for concurrent edits
- **Connection Reliability**: Automatic reconnection with exponential backoff
- **Permission Management**: File-level access control (view/edit/owner)

**Data Synchronization:**

- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Offline Support**: Queue changes during network issues, sync on reconnect
- **Version Control**: Complete change history with restore capability
- **Schema Migration**: Automatic data migration for schema evolution

### Extension and Customization

**Developer Tools:**

- **CLI Scaffolding**: `npm create tldraw` with interactive template selection
- **VSCode Integration**: Full editor for .tldr files with webview-based rendering
- **Testing Utilities**: TestEditor, comprehensive E2E test suites
- **Performance Monitoring**: Built-in performance tracking and analysis

**Extension Points:**

- **Custom Shapes**: ShapeUtil classes for new shape types
- **Custom Tools**: StateNode state machines for interactive tools
- **Custom Bindings**: BindingUtil classes for shape relationships
- **Custom UI**: Complete component override system
- **External Content**: Handlers for custom import/export formats

## Technical Deep Dive

### Reactive Architecture Details

**Signals System (`@tldraw/state`):**

- **Atom/Computed Pattern**: Mutable atoms + derived computed values
- **Dependency Tracking**: Automatic capture of signal dependencies during computation
- **Memory Optimization**: ArraySet hybrid data structure, WeakCache for object-keyed caches
- **Effect Scheduling**: Pluggable scheduling (immediate vs animation frame throttled)
- **Transaction Support**: Atomic multi-state updates with rollback capability

**Store System (`@tldraw/store`):**

- **Record Management**: Type-safe record storage with validation and migrations
- **Query System**: Reactive indexes with incremental updates
- **Side Effects**: Lifecycle hooks for create/update/delete operations
- **History Tracking**: Change diffs with configurable history length
- **Schema Evolution**: Version-based migration system with dependencies

### Database and Persistence

**Client-Side Storage:**

- **IndexedDB**: Local persistence with automatic migrations
- **Store Snapshots**: Complete document state serialization
- **Asset Caching**: Local asset storage with deduplication
- **User Preferences**: Settings persistence across sessions

**Server-Side Infrastructure:**

- **PostgreSQL**: Source of truth for user data, files, metadata
- **R2 Object Storage**: Durable asset storage with global replication
- **Durable Objects**: Stateful compute for room management and real-time sync
- **Zero Sync**: Optimistic synchronization with conflict resolution

## Development Workflow Best Practices

### Getting Started

1. **Clone and Setup**: `git clone` → `yarn install`
2. **Start Development**: `yarn dev` (examples app at localhost:5420)
3. **Run Tests**: `cd packages/editor && yarn test run` for specific packages
4. **Check Types**: `yarn typecheck` before commits
5. **Follow Patterns**: Read relevant CONTEXT.md files and existing code

### Creating Examples

- **Location**: `apps/examples/src/examples/your-example/`
- **Structure**: README.md with frontmatter + YourExample.tsx component
- **Guidelines**: See `apps/examples/writing-examples.md` for detailed patterns
- **Categories**: getting-started, configuration, editor-api, shapes/tools, etc.

### Package Development

- **Testing**: Run tests from package directory, not root
- **API Changes**: Run `yarn api-check` to validate public API surface
- **Dependencies**: Check existing usage before adding new libraries
- **Documentation**: API docs auto-generated from TSDoc comments

### Performance Guidelines

- **Use Signals**: Leverage reactive system for automatic optimization
- **Batch Updates**: Use transactions for multiple state changes
- **Memory Management**: Dispose of effects and subscriptions properly
- **Asset Optimization**: Use appropriate asset export strategy for your bundler

This context file provides the essential architectural understanding needed to navigate and contribute to the tldraw codebase effectively.
