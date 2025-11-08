# Repository Structure - Detailed Notes

## Overview

The tldraw repository is organized as a TypeScript monorepo using Yarn Berry (v4) workspaces. It contains the complete tldraw ecosystem - from the core infinite canvas SDK to the collaborative whiteboard application tldraw.com.

**Version:** 3.15.1 across all packages
**Node.js:** ^20.0.0 required
**React:** ^18.0.0 || ^19.0.0 peer dependency

## Directory Purposes

### Root Configuration Files

**Purpose:** Configure the monorepo build system, dependencies, and development environment.

- **`package.json`** - Yarn Berry workspace manager, defines all workspaces and scripts
- **`lazy.config.ts`** - LazyRepo incremental build system configuration
- **`tsconfig.json`** - TypeScript workspace references for incremental compilation
- **`CONTEXT.md`** - Comprehensive AI-friendly documentation for the entire codebase
- **`CLAUDE.md`** - Specific instructions for Claude Code (claude.ai/code) development

### Core SDK Packages (`/packages`)

**Purpose:** The foundation of tldraw - reusable packages that make up the SDK.

#### Foundation Layer

The lowest-level packages that everything else builds on:

- **`editor/`** - Core canvas engine without any shapes, tools, or UI
  - Pure reactive editor foundation
  - Shape system via ShapeUtil classes
  - Tools via StateNode state machines
  - Bindings system for shape relationships

- **`store/`** - Reactive client-side database built on signals
  - Type-safe record storage with validation
  - Change history and undo/redo
  - IndexedDB persistence
  - Migration system

- **`state/`** - Fine-grained reactive state management (signals system)
  - `Atom<T>` for mutable state
  - `Computed<T>` for derived values
  - Automatic dependency tracking
  - Similar to MobX or SolidJS

- **`tlschema/`** - Type definitions, validators, and migrations
  - Shape definitions
  - Binding definitions
  - Record type definitions
  - Validation schemas

- **`utils/`** - Shared utilities across packages
  - Math utilities (vectors, matrices)
  - Array/object helpers
  - Performance utilities

- **`validate/`** - Lightweight validation library
  - Schema definition
  - Runtime validation

#### Complete SDK Layer

- **`tldraw/`** - "Batteries included" SDK
  - Wraps editor with full UI system
  - Default shapes (text, draw, geo, arrow, note, line, frame, highlight, etc.)
  - Complete tool set (select, hand, eraser, laser, zoom + shape tools)
  - Responsive UI with mobile/desktop adaptations

#### Collaboration Layer

- **`sync-core/`** - Core multiplayer functionality
  - WebSocket protocol implementation
  - Conflict-free updates with operational transformation
  - Connection state management

- **`sync/`** - Multiplayer collaboration system (React hooks)
  - `useSync` hook for production
  - `useSyncDemo` hook for prototyping
  - Presence awareness (cursors, selections)

#### Supporting Packages

- **`assets/`** - Icons, fonts, translations
  - 80+ icons in optimized SVG sprite format
  - IBM Plex fonts + Shantell Sans
  - 40+ languages with regional variants

- **`state-react/`** - React integration for state management
  - React hooks for signals
  - Component integration

- **`create-tldraw/`** - `npm create tldraw` CLI tool
  - Interactive project scaffolding
  - Template selection

- **`dotcom-shared/`** - Shared utilities for tldraw.com application
  - Used by both workers and client

- **`worker-shared/`** - Shared utilities for Cloudflare Workers
  - Common worker functionality

- **`namespaced-tldraw/`** - Namespaced tldraw components
  - For embedding multiple instances

### Applications (`/apps`)

**Purpose:** Production applications and development environments.

#### Primary Development Environment

- **`examples/`** - SDK examples and demos (130+ examples)
  - Primary development environment
  - Showcases SDK capabilities
  - Development testbed
  - See `writing-examples.md` for guidelines

#### tldraw.com Stack

The complete infrastructure for the tldraw.com collaborative whiteboard:

- **`dotcom/client/`** - Frontend React SPA
  - Vite build system
  - Clerk authentication
  - React Router for navigation
  - FormatJS i18n
  - Sentry error tracking
  - PostHog analytics

- **`dotcom/sync-worker/`** - Multiplayer backend
  - Cloudflare Worker
  - Durable Objects for room management
  - Real-time sync
  - File management

- **`dotcom/asset-upload-worker/`** - Media uploads
  - Cloudflare Worker
  - R2 object storage
  - Asset validation

- **`dotcom/image-resize-worker/`** - Image optimization
  - Cloudflare Worker
  - Format conversion (AVIF/WebP)
  - Automatic resizing

- **`dotcom/zero-cache/`** - Database synchronization layer
  - Rocicorp Zero integration
  - PostgreSQL backend
  - Optimistic client-server sync

#### Documentation & Tooling

- **`docs/`** - Documentation website (tldraw.dev)
  - Next.js framework
  - SQLite database
  - Algolia search

- **`vscode/`** - tldraw VSCode extension
  - .tldr file support
  - Webview-based rendering

#### Additional Services

- **`analytics/`** - Analytics service
  - UMD library format
  - Cookie consent
  - GDPR compliance

- **`bemo-worker/`** - Bemo worker service
  - Collaboration features
  - Asset management

### Starter Templates (`/templates`)

**Purpose:** Framework-specific starter templates for developers.

- **`vite/`** - Vite integration (fastest way to start)
- **`nextjs/`** - Next.js integration with SSR support
- **`vue/`** - Vue 3 integration
- **`sync-cloudflare/`** - Multiplayer implementation with Cloudflare Durable Objects
- **`ai/`** - AI integration examples
- **`branching-chat/`** - AI-powered conversational UI with node-based chat trees
- **`workflow/`** - Node-based visual programming interface for workflows
- **`chat/`** - Chat template
- **`agent/`** - Agent template
- **`simple-server-example/`** - Simple server example

### Internal Tools (`/internal`)

**Purpose:** Development tools and configuration not published to npm.

- **`apps-script/`** - Google Apps Script configuration for Meet integration
- **`config/`** - Shared TypeScript, API, and test configurations
- **`dev-tools/`** - Git bisect helper tool for debugging
- **`health-worker/`** - Updown.io webhook → Discord alert forwarding
- **`scripts/`** - Build, deployment, and maintenance automation

## Code Organization Patterns

### Package Naming

All published packages use the `@tldraw/` namespace:
- Core packages: `@tldraw/editor`, `@tldraw/tldraw`, etc.
- Internal packages remain private

### Workspace Dependencies

Packages reference each other via workspace protocol:
```json
{
  "dependencies": {
    "@tldraw/editor": "workspace:*"
  }
}
```

### Source Organization

Standard package structure:
```
package/
├── src/
│   ├── lib/          # Main source code
│   │   ├── index.ts  # Public API exports
│   │   └── ...       # Implementation files
│   └── test/         # Test files (*.test.ts)
├── package.json
├── tsconfig.json
└── CONTEXT.md        # Package-specific documentation
```

## Where to Find Different Types of Code

### Shape Implementations
- Default shapes: `/packages/tldraw/src/lib/shapes/`
- Shape utilities: Each shape has its own directory with ShapeUtil, ShapeTool, and states

### Tool Implementations
- Default tools: `/packages/tldraw/src/lib/tools/`
- Tool base classes: `/packages/editor/src/lib/editor/tools/`
- SelectTool (complex): `/packages/tldraw/src/lib/tools/SelectTool/`

### UI Components
- Editor base components: `/packages/editor/src/lib/components/`
- Tldraw UI: `/packages/tldraw/src/lib/ui/components/`
- Responsive breakpoints: `/packages/tldraw/src/lib/ui/context/breakpoints.tsx`

### State Management
- Signals implementation: `/packages/state/src/lib/`
- Store implementation: `/packages/store/src/lib/`
- React integration: `/packages/state-react/src/lib/`

### Examples and Demos
- All examples: `/apps/examples/src/examples/`
- Example categories: getting-started, configuration, editor-api, shapes-tools, etc.
- Writing guidelines: `/apps/examples/writing-examples.md`

### Tests
- Unit tests: Alongside source files (e.g., `Editor.test.ts`)
- Integration tests: In `src/test/` directories
- E2E tests: `/apps/examples/e2e/` and `/apps/dotcom/client/e2e/`

### Configuration Files
- Root configs: `/` (tsconfig.json, lazy.config.ts, etc.)
- Shared configs: `/internal/config/`
- Package configs: Each package has its own tsconfig.json

### Build System
- LazyRepo config: `/lazy.config.ts`
- Build scripts: `/internal/scripts/`
- Package build configs: Individual `package.json` files

### Documentation
- Main docs site source: `/apps/docs/`
- Package documentation: Each package's `CONTEXT.md`
- API docs: Auto-generated from TSDoc comments

### Internationalization
- Translation files: `/packages/assets/translations/`
- Translation extraction: `/apps/dotcom/client/src/i18n/`
- 40+ languages supported

## Development Workflow

### Primary Development Entry Points

1. **SDK Development** - Start with `/apps/examples`
   ```bash
   yarn dev  # Starts examples at localhost:5420
   ```

2. **tldraw.com Development** - Start with `/apps/dotcom/client`
   ```bash
   yarn dev-app  # Starts client app
   ```

3. **Documentation** - Start with `/apps/docs`
   ```bash
   yarn dev-docs  # Starts docs site
   ```

### Testing

Run tests from specific workspace directories, not root:
```bash
cd packages/editor
yarn test run
```

### Building

Use LazyRepo for incremental builds:
```bash
yarn build  # Builds only changed packages
```

## Key Architectural Insights

1. **Layered Architecture** - Foundation (editor) → Complete SDK (tldraw) → Applications
2. **Reactive Core** - All state management built on signals (@tldraw/state)
3. **Extensible Design** - Shapes, tools, bindings, UI all customizable
4. **Monorepo Benefits** - Shared code, consistent tooling, atomic changes
5. **AI-Friendly** - CONTEXT.md files throughout for AI agents

## Common Workflows

### Adding a New Shape
1. Define schema in `/packages/tlschema/src/shapes/`
2. Create ShapeUtil in `/packages/tldraw/src/lib/shapes/`
3. Create ShapeTool if needed
4. Register in `defaultShapeUtils.ts`
5. Add example in `/apps/examples/`

### Adding a New Tool
1. Create StateNode class in `/packages/tldraw/src/lib/tools/`
2. Define state machine with handlers
3. Register in `defaultTools.ts`
4. Add example in `/apps/examples/`

### Creating an Example
1. Create directory in `/apps/examples/src/examples/`
2. Add README.md with frontmatter
3. Create YourExample.tsx component
4. Follow guidelines in `writing-examples.md`

## Technical Debt & Complexity Areas

1. **Migration System** - Complex version-based migrations in @tldraw/store
2. **SelectTool** - Sophisticated state machine with many child states
3. **Asset Pipeline** - Multiple workers and optimization strategies
4. **Sync Protocol** - Complex operational transformation logic
5. **Legacy Routes** - Compatibility routes in dotcom/client for old URLs

## Performance Considerations

1. **Build Performance** - LazyRepo caching reduces rebuild times
2. **Runtime Performance** - Signals minimize unnecessary re-renders
3. **Bundle Size** - Code splitting at route and component levels
4. **Network Performance** - CDN delivery, image optimization
5. **Memory Management** - Automatic cleanup of signals and listeners
