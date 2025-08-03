# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Setup:**
```bash
npm i -g corepack  # Enable corepack for correct yarn version
yarn                # Install dependencies
```

**Development:**
```bash
yarn dev                # Run examples app at localhost:5420
yarn dev-app           # Run dotcom client with all dependencies
yarn dev-docs          # Run documentation site
yarn dev-vscode        # Run VSCode extension development
```

**Build:**
```bash
yarn build             # Build all packages
yarn build-api         # Generate API documentation
yarn build-types       # Type checking and build types
yarn typecheck         # Run TypeScript type checking
```

**Testing:**
```bash
yarn test              # Run all Jest tests (from root - can be slow)
yarn test-ci           # Run tests in CI mode
yarn test-coverage     # Run tests with coverage report
yarn e2e               # Run Playwright end-to-end tests on examples
yarn e2e-dotcom        # Run Playwright tests on dotcom app
```

**Linting:**
```bash
yarn lint              # Run ESLint across all packages
yarn format            # Run Prettier formatting on all files
yarn format-current    # Format only currently changed files
```

## Architecture Overview

This is a TypeScript monorepo using Yarn Berry workspaces organized with the `lazyrepo` build system.

### Key Packages Structure
- **`packages/editor`** - Core tldraw editor without UI
- **`packages/tldraw`** - Full tldraw experience with shapes, tools, and UI
- **`packages/state`** - Reactive signals library for state management
- **`packages/state-react`** - React bindings for the state library
- **`packages/store`** - Client-side reactive database for tldraw documents
- **`packages/tlschema`** - Type definitions, validators, and migrations
- **`packages/sync` & `packages/sync-core`** - Multi-player backend SDK
- **`packages/ai`** - AI/LLM integration addon
- **`packages/assets`** - Fonts, icons, translations, and other static assets

### Applications
- **`apps/examples`** - SDK usage examples and demos
- **`apps/dotcom/client`** - The tldraw.com web application
- **`apps/dotcom/sync-worker`** - Main backend Cloudflare worker
- **`apps/docs`** - Documentation website at tldraw.dev
- **`apps/vscode`** - VSCode extension

### Development Infrastructure  
- **`internal/scripts`** - Build scripts and repository utilities
- **`templates/`** - Starting points for different framework integrations

## Testing Guidelines

- **Unit tests:** Use Jest, place test files next to source files (e.g., `LicenseManager.test.ts` next to `LicenseManager.ts`)
- **Integration tests:** Place in `src/test/` directory (e.g., `src/test/selection.test.ts`)
- **Run package-specific tests:** Use `yarn test` within individual package directories
- **End-to-end tests:** Use Playwright, configured in apps with e2e directories
- **Editor testing:** If you need default shapes/tools, write tests in the `tldraw` workspace, not `editor`

## Important Notes

- Uses `lazyrepo` for coordinated builds and caching
- TypeScript strict mode enabled across all packages
- Reactive state management using custom signals library
- Multi-package dependencies require running `yarn refresh-assets` after asset changes
- License: tldraw license with watermark requirement (see README.md)
- All development requires Node.js 20+