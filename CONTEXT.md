# CONTEXT.md - tldraw Monorepo

This file provides comprehensive context for understanding the tldraw monorepo - an infinite canvas SDK for React applications with a complete ecosystem of packages, applications, and tooling.

## Repository Overview

**tldraw** is a production-ready infinite canvas SDK and drawing application. It consists of:

- **Core SDK packages** providing the editor engine, UI components, and data management
- **Production applications** including tldraw.com and documentation sites
- **Developer tools** like the VSCode extension and create-tldraw CLI
- **Templates and examples** demonstrating usage across different frameworks

**Key URLs:**

- Production App: [tldraw.com](https://tldraw.com)
- Documentation: [tldraw.dev](https://tldraw.dev)
- Examples: [examples.tldraw.com](https://examples.tldraw.com)
- GitHub: [github.com/tldraw/tldraw](https://github.com/tldraw/tldraw)

## Monorepo Structure

```
tldraw/
├── apps/                     # Production applications
│   ├── dotcom/              # tldraw.com application
│   │   ├── client/          # React frontend
│   │   ├── sync-worker/     # Cloudflare multiplayer backend
│   │   └── asset-upload-worker/
│   ├── docs/                # Documentation site (tldraw.dev)
│   ├── examples/            # SDK examples showcase
│   ├── huppy/              # GitHub bot for PR management
│   └── vscode/             # VSCode extension
│
├── packages/                 # Core SDK packages
│   ├── editor/              # Core infinite canvas engine
│   ├── tldraw/              # Complete SDK with UI and shapes
│   ├── store/               # Reactive data store
│   ├── tlschema/            # Type definitions and migrations
│   ├── state/               # Reactive signals library
│   ├── sync/                # Real-time collaboration
│   ├── utils/               # Shared utilities
│   ├── validate/            # Validation library
│   ├── assets/              # Icons, fonts, translations
│   ├── ai/                  # AI module SDK addon
│   └── create-tldraw/       # npm create CLI tool
│
├── templates/                # Starter templates
│   ├── simple/              # Basic HTML template
│   ├── vite/                # Vite React template
│   ├── nextjs/              # Next.js template
│   ├── remix/               # Remix template
│   └── sync-cloudflare/     # Multiplayer template
│
├── internal/                 # Internal tooling
│   ├── scripts/             # Build and dev scripts
│   └── lazyrepo/            # Custom build system
│
├── e2e/                     # End-to-end tests
├── assets/                  # Global assets source
└── config/                  # Shared configuration
```

## Package Architecture

### Core Package Hierarchy

```
@tldraw/tldraw (Complete SDK)
    ├── @tldraw/editor (Core engine)
    │   ├── @tldraw/store (Data layer)
    │   ├── @tldraw/tlschema (Types)
    │   ├── @tldraw/state (Reactivity)
    │   └── @tldraw/utils (Utilities)
    └── Default shapes, tools, and UI
```

### Package Responsibilities

**@tldraw/editor** - Core infinite canvas engine

- No default shapes or UI - just the canvas
- Shape and tool extensibility system
- Event handling and state management
- Camera, selection, and interaction logic

**@tldraw/tldraw** - Complete drawing application

- Builds on editor with full UI system
- Default shapes (text, draw, geo, arrow, etc.)
- Complete toolset (select, hand, eraser, etc.)
- Responsive UI with customizable components

**@tldraw/store** - Reactive document store

- Client-side database with IndexedDB persistence
- Schema migrations and validation
- Reactive updates via signals

**@tldraw/state** - Reactive signals library

- Atoms for mutable state
- Computed values with automatic dependency tracking
- Efficient reactive updates

**@tldraw/sync** - Real-time collaboration

- WebSocket-based synchronization
- Presence and cursor sharing
- Conflict resolution

## Development Environment

### Prerequisites

- **Node.js**: ^20.0.0 required
- **Yarn**: 4.x (Berry) - enforced via packageManager field
- **Git**: For version control
- **Platform**: Works on macOS, Linux, Windows (WSL recommended)

### Essential Commands

**Development:**

```bash
yarn install              # Install dependencies
yarn dev                  # Start examples app (localhost:5420)
yarn dev-app             # Start tldraw.com locally
yarn dev-docs            # Start documentation site
yarn dev-vscode          # Start VSCode extension dev
yarn dev-template <name> # Run a specific template
```

**Testing:**

```bash
yarn test run            # Run tests (from specific workspace)
yarn e2e                 # Run E2E tests for examples
yarn e2e-dotcom         # Run E2E tests for tldraw.com
```

**Code Quality:**

```bash
yarn lint               # Lint code
yarn typecheck         # Type check all packages
yarn format            # Format with Prettier
yarn api-check         # Validate public API
```

**Build:**

```bash
yarn build             # Build all packages
yarn build-package <name> # Build specific package
```

### Context Discovery

The repository includes CONTEXT.md files throughout for AI agents:

```bash
yarn context          # Find nearest CONTEXT.md
yarn context -v       # Verbose output
yarn context -r       # Show from repo root
yarn refresh-context  # Update CONTEXT.md files
```

## Build System (LazyRepo)

Custom incremental build system with caching:

- **Incremental builds** - Only rebuilds changed packages
- **Dependency tracking** - Automatic workspace ordering
- **Parallel execution** - Maximizes CPU utilization
- **File-based caching** - Skips unchanged builds
- **Configuration**: `lazy.config.ts` in root

## Testing Strategy

### Test Types

**Unit Tests** (Vitest)

- Located alongside source files
- Named `*.test.ts` or `*.test.tsx`
- Run with `yarn test run` from workspace

**Integration Tests**

- Located in `src/test/` directories
- Test cross-component interactions
- Use TestEditor utilities

**E2E Tests** (Playwright)

- Located in `e2e/` directories
- Test full user workflows
- Visual regression testing

### Testing Best Practices

- Test from specific workspace directory for speed
- Use TestEditor for editor testing
- Mock external dependencies
- Test both success and error paths

## Key Architectural Patterns

### Reactive State Management

All state uses reactive signals from @tldraw/state:

```typescript
// Atoms for mutable state
const atom = createAtom('name', initialValue)

// Computed for derived values
const computed = createComputed('name', () => {
	return atom.get() * 2
})

// Automatic dependency tracking
react('reaction', () => {
	console.log(computed.get()) // Re-runs when dependencies change
})
```

### Shape System

Extensible shape architecture via ShapeUtil:

```typescript
class CustomShapeUtil extends ShapeUtil<CustomShape> {
	static type = 'custom'

	getGeometry(shape) {
		/* ... */
	}
	component(shape) {
		/* ... */
	}
	indicator(shape) {
		/* ... */
	}
}
```

### Tool System

Tools as hierarchical state machines:

```typescript
class CustomTool extends StateNode {
	static id = 'custom'

	onEnter() {
		/* ... */
	}
	onPointerDown(info) {
		/* ... */
	}
	onPointerMove(info) {
		/* ... */
	}
}
```

### Component Customization

Every UI component can be overridden:

```typescript
<Tldraw
  components={{
    Toolbar: CustomToolbar,
    ContextMenu: CustomContextMenu,
    // ... any component
  }}
/>
```

## Deployment & Infrastructure

### Production Deployments

**tldraw.com**

- Cloudflare Pages (frontend)
- Cloudflare Workers (multiplayer backend)
- Cloudflare R2 (asset storage)
- Automatic deployments from main branch

**Documentation (tldraw.dev)**

- Vercel deployment
- MDX-based documentation
- API reference generation

**Examples (examples.tldraw.com)**

- Vercel deployment
- Preview deployments for PRs
- Canary deployments from main

### Release Process

1. Version bumping via changesets
2. Automated CI/CD pipeline
3. NPM package publishing
4. Documentation updates
5. Example site deployment

## Contributing Guidelines

### Development Workflow

1. Fork and clone repository
2. Create feature branch from main
3. Make changes with tests
4. Run `yarn lint` and `yarn typecheck`
5. Submit PR with clear description

### Code Style

- TypeScript for all code
- Prettier for formatting
- ESLint for linting
- Conventional commits encouraged
- Comprehensive JSDoc comments

### Adding Features

**New Shapes:**

1. Create ShapeUtil in packages/tldraw
2. Add to defaultShapeUtils
3. Create corresponding tool
4. Add tests and examples

**New Tools:**

1. Create StateNode implementation
2. Add to defaultTools
3. Define state transitions
4. Add UI integration

**New Examples:**

1. Create in apps/examples/src/examples/
2. Add README with metadata
3. Follow example patterns
4. Test with yarn dev

## Licensing

- **SDK Core**: Apache 2.0 License
- **VS Code Extension**: Apache 2.0 License
- **tldraw.com**: Proprietary
- **Business License**: Available for watermark removal
- See LICENSE.md for full details

## Support & Resources

- **Documentation**: [tldraw.dev](https://tldraw.dev)
- **Discord**: [discord.gg/tldraw](https://discord.gg/tldraw)
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community Q&A
- **Twitter/X**: [@tldraw](https://twitter.com/tldraw)

## Performance Considerations

### Optimization Strategies

- **Viewport culling** - Only render visible shapes
- **Geometry caching** - Memoized shape calculations
- **Reactive batching** - Grouped state updates
- **Lazy loading** - On-demand asset loading
- **Worker threads** - Offload heavy computations

### Benchmarks

- Handles 10,000+ shapes smoothly
- 60fps interactions maintained
- Sub-100ms response times
- Efficient memory usage patterns

## Security

- No automatic execution of user content
- Sanitized SVG imports
- CSP headers in production
- Regular dependency updates
- Security reports: security@tldraw.com
