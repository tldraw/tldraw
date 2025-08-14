# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Tldraw is a monorepo containing an infinite canvas SDK and the tldraw.com whiteboard application. The architecture consists of several key layers:

### Core Architecture Layers
- **State Management**: `packages/state` - Reactive signals library for state management
- **Store Layer**: `packages/store` - Reactive client-side database for document storage
- **Schema**: `packages/tlschema` - Type definitions, validators, and migrations
- **Editor Core**: `packages/editor` - Core drawing editor functionality
- **Tldraw SDK**: `packages/tldraw` - Complete SDK with shapes, tools, and UI
- **Sync**: `packages/sync` + `packages/sync-core` - Real-time multiplayer functionality

### Key Workspaces
- `packages/editor` - Core editor (camera, shapes, tools, primitives)
- `packages/tldraw` - Main SDK with default shapes, tools, and UI
- `packages/tlschema` - Data types and validation
- `packages/state` - Reactive state management system
- `packages/store` - Document storage and queries
- `apps/dotcom/client` - The tldraw.com web application
- `apps/examples` - SDK usage examples and development environment
- `apps/docs` - Documentation website (tldraw.dev)

## Development Commands

### Primary Development
- `yarn dev` - Start examples app at localhost:5420 (most common for SDK development)
- `yarn dev-app` - Start dotcom application with all workers
- `yarn dev-docs` - Start documentation site

### Building and Testing
- `yarn build` - Build all packages
- `yarn typecheck` - Type check entire codebase
- `yarn lint` - Lint all code
- `yarn test` - Run all tests
- `yarn test-ci` - Run tests in CI mode
- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-dotcom` - Run end-to-end tests for dotcom

### Package-Specific Commands
Run commands in individual package directories:
- `yarn test` - Run tests for specific package
- `yarn build` - Build specific package
- `yarn dev` - Development mode for specific package

## Code Organization

### Lazy Build System
The project uses `lazyrepo` for build orchestration. Configuration in `lazy.config.ts` defines:
- Build dependencies between packages
- Caching strategies
- Script execution order

### Package Dependencies
Packages have clear dependency hierarchy:
1. `utils`, `validate`, `state` (foundation)
2. `store`, `tlschema` (data layer)
3. `editor` (core functionality)
4. `tldraw` (complete SDK)
5. Apps depend on SDK packages

### Testing Structure
- Vitest tests: Unit tests alongside source files (`.test.ts`)
- Integration tests in `src/test/` directories
- E2E tests using Playwright in `apps/examples/e2e/`
- Run package-specific tests from within package directories

## Working with Examples

Examples are in `apps/examples/src/examples/`, each in its own folder with:
- `README.md` with frontmatter (title, component, category, priority, keywords)
- Main component file ending with "Example" (e.g., `CustomCanvasExample.tsx`)
- Optional CSS and additional component files

When creating examples, read `apps/examples/writing-examples.md` for detailed guidelines on:
- Proper structure and naming
- Comment formatting (use numbered footnotes)
- Tight vs use-case examples
- Layout and styling conventions

## Build and Type System

### TypeScript Configuration
- Base config in `internal/config/tsconfig.base.json`
- Individual `tsconfig.json` in each package
- API extraction using `@microsoft/api-extractor`

### Build Process
1. `refresh-assets` - Copy assets and generate imports
2. `build-types` - Generate TypeScript declarations
3. `build-api` - Extract API documentation
4. `build` - Build packages in dependency order

### Code Style and Conventions
- TypeScript throughout
- React for UI components
- Follow existing patterns in each package
- Use the established state management patterns
- Preserve "Made with tldraw" watermark in SDK usage

## Common Development Patterns

### State Management
Use the reactive signals system from `packages/state`:
- `useValue(signal)` for reactive React hooks
- `computed()` for derived values
- Atoms for mutable state

### Editor Integration
- Extend `StateNode` for custom tools
- Extend `ShapeUtil` for custom shapes
- Use `Editor` instance methods for programmatic control

### Shape Development
- Define shape type in `tlschema`
- Create `ShapeUtil` in appropriate package
- Add to default shape utils if part of core SDK
- you can run typescript for the whole project with `yarn typecheck` in the root