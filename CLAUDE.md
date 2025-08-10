# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the monorepo for tldraw, an infinite canvas whiteboard SDK and the software behind [tldraw.com](https://tldraw.com). The project is organized using pnpm workspaces with a complex multi-package architecture.

## Key Development Commands

### Setup and Installation

```bash
# Install pnpm globally (if not already installed)
npm i -g pnpm

# Install dependencies
pnpm install

# Development server (examples app with hot reload)
pnpm dev

# Development server for dotcom app
pnpm dev-app

# Development server for docs
pnpm dev-docs
```

### Building and Testing

```bash
# Build all packages
pnpm build

# Build specific package types
pnpm build-package    # packages only
pnpm build-app        # dotcom client
pnpm build-docs       # documentation

# Type checking (always run refresh-assets first)
pnpm typecheck

# Linting and formatting
pnpm lint
pnpm format

# Testing
pnpm test                    # run all tests (slow, avoid from root)
pnpm test-ci                 # CI test runner
pnpm test-coverage          # test with coverage
pnpm e2e                     # end-to-end tests for examples
pnpm e2e-dotcom              # end-to-end tests for dotcom

# Run tests for specific package
cd packages/editor && pnpm test
```

### API and Documentation

```bash
# API extraction and checking
pnpm build-api
pnpm api-check

# Refresh assets (run before typecheck)
pnpm refresh-assets
```

## Architecture Overview

### Core Packages

- **`packages/editor`**: Core tldraw editor functionality
- **`packages/tldraw`**: Complete tldraw UI with shapes, tools, and default behaviors
- **`packages/tlschema`**: Type definitions, validators, and data migrations
- **`packages/state`**: Reactive signals library for state management
- **`packages/state-react`**: React bindings for the state library
- **`packages/store`**: Client-side reactive database for tldraw documents
- **`packages/sync`** & **`packages/sync-core`**: Multi-player synchronization SDK
- **`packages/utils`**: Internal utilities and helpers
- **`packages/validate`**: Lightweight validation library
- **`packages/assets`**: Fonts, icons, images, and translations

### Applications

- **`apps/examples`**: SDK usage examples and demos
- **`apps/docs`**: tldraw.dev Next.js documentation site
- **`apps/dotcom/client`**: tldraw.com frontend application
- **`apps/dotcom/sync-worker`**: Main Cloudflare worker backend
- **`apps/dotcom/asset-upload-worker`**: Media asset upload handler
- **`apps/dotcom/image-resize-worker`**: Image optimization service
- **`apps/vscode`**: VS Code extension

### Templates and Tools

- **`templates/*`**: Framework starters and domain-specific examples
- **`packages/create-tldraw`**: CLI for creating new tldraw apps
- **`internal/*`**: Build tools, scripts, and internal utilities

## Build System

The project uses `lazyrepo` for task orchestration with complex dependency management and `pnpm` workspaces:

- **Incremental builds**: Packages build only when dependencies change
- **Type generation**: `build-types` runs before API extraction
- **Asset management**: `refresh-assets` must run before type checking
- **Independent development**: Most apps can be developed independently

## Testing Guidelines

### Jest Tests

- Unit tests: `src/lib/Component.test.ts` next to `src/lib/Component.ts`
- Integration tests: `src/test/feature-name.test.ts`
- Test specific packages from their directory: `cd packages/editor && pnpm test`
- Avoid `pnpm test` from root (slow and no filtering)

### Editor vs Tldraw Testing

- If you need default shapes/tools, write tests in `packages/tldraw`
- Pure editor functionality tests go in `packages/editor`

### End-to-End Tests

- Playwright for E2E testing
- Run with `pnpm e2e` (examples) or `pnpm e2e-dotcom`

## Code Style and Conventions

### TypeScript Configuration

- Strict TypeScript settings enabled
- Composite project setup for incremental compilation
- React JSX transform used throughout

### State Management

- Uses custom reactive signals library (`packages/state`)
- React components use `packages/state-react` for integration
- Store pattern for document data (`packages/store`)

### Validation and Schema

- Custom validation library instead of Zod
- Schema definitions in `packages/tlschema`
- Migration system for data compatibility

## Development Workflow

1. **Before starting**: Ensure `pnpm` is installed and run `pnpm refresh-assets`
2. **Type checking**: Always run `pnpm typecheck` before commits
3. **Testing**: Run relevant package tests during development
4. **Building**: Use `pnpm build` to verify full build before PR
5. **Contributing**: Create an issue first, then follow the standard GitHub flow

## Important Notes

- The monorepo is complex - understand the package you're working on before making changes
- Always refresh assets before type checking
- Use package-specific test commands for faster feedback
- Examples app (`pnpm dev`) is the main development environment
- CI runs comprehensive checks - ensure local builds pass first

## Internationalization

- Translations stored in `assets/translations/`
- Upload/download strings with `pnpm i18n-upload-strings` / `pnpm i18n-download-strings`
- Check i18n compliance with `pnpm i18n-check`
