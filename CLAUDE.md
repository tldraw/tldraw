# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
- `yarn dev` - Runs examples app with hot reload (localhost:5420)
- `yarn dev-app` - Runs dotcom client and workers
- `yarn dev-docs` - Runs documentation site
- `yarn dev-vscode` - Develops VS Code extension

**Building & Testing:**
- `yarn build` - Builds all packages
- `yarn test` - Runs all Jest tests (slow, use package-specific instead)
- `yarn test-ci` - Runs CI test suite
- `yarn typecheck` - Type checks entire codebase
- `yarn lint` - Lints all code
- `yarn format` - Formats code with Prettier

**Package-specific commands:**
- Run `yarn test` within individual package directories for faster testing
- Run `yarn build` within package directories for specific builds

## Architecture Overview

This is a monorepo using Yarn workspaces with the following key components:

**Core SDK Packages:**
- `packages/editor` - Core infinite canvas editor without shapes/tools
- `packages/tldraw` - Complete editor with default shapes, tools, and UI
- `packages/state` - Reactive signals library (like MobX/Solid)
- `packages/store` - Reactive in-memory database for tldraw documents
- `packages/tlschema` - Type definitions, validators, and migrations
- `packages/utils` - Internal utilities and helpers

**Supporting Packages:**
- `packages/assets` - Fonts, icons, translations, watermarks
- `packages/sync` & `packages/sync-core` - Multiplayer SDK
- `packages/ai` - AI integration module
- `packages/validate` - Lightweight validation library

**Applications:**
- `apps/examples` - SDK examples and development environment
- `apps/docs` - Documentation website (tldraw.dev)
- `apps/dotcom/*` - The tldraw.com application and workers
- `apps/vscode` - VS Code extension

**Templates:**
- Various starting points for different frameworks and use cases

## Key Development Patterns

**Monorepo Management:**
- Uses `lazyrepo` for task orchestration and caching
- Workspace dependencies use `workspace:*` protocol
- Build system handles TypeScript compilation and API extraction

**State Management:**
- Uses custom reactive signals (`@tldraw/state`) throughout
- Editor state is managed via reactive derivations and atoms
- Store manages document data with automatic persistence

**Testing:**
- Jest for unit tests with package-specific test commands
- Playwright for E2E tests
- Test files should be co-located with source files (`.test.ts`)
- Integration tests go in `src/test/` directories
- Use tldraw workspace for testing editor with default shapes

**Examples Development:**
- Examples live in `apps/examples/src/examples/`
- Each example needs `README.md` with frontmatter and component file
- Use footnote-style comments `// [1]` with explanations at bottom
- Follow writing guide in `apps/examples/writing-examples.md`

## Important Notes

- Node.js ^20.0.0 required
- Uses Yarn Berry (4.7.0+) - enable corepack
- TypeScript project with strict type checking
- CSS bundled separately (`tldraw.css`, `editor.css`)
- Watermark licensing applies to commercial use