---
title: Repository overview
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - overview
  - monorepo
  - introduction
  - structure
---

This document provides a high-level introduction to the tldraw monorepo, its purpose, and how its components fit together.

## What is tldraw?

tldraw is an infinite canvas SDK for React applications. It provides everything needed to build collaborative drawing and diagramming experiences, from the low-level canvas engine to a complete, ready-to-use editor with shapes, tools, and UI.

The tldraw project serves two purposes:

1. **An open-source SDK** that developers use to add infinite canvas functionality to their applications
2. **The tldraw.com application**, a commercial collaborative whiteboard built using the same SDK

This repository contains both the SDK and the production application, along with documentation, examples, templates, and supporting infrastructure.

## Repository structure

The monorepo is organized into four main directories:

```
tldraw/
├── packages/     # SDK packages (npm-published libraries)
├── apps/         # Applications (examples, docs, tldraw.com)
├── templates/    # Starter templates for different frameworks
└── internal/     # Internal tools and configuration
```

### packages/

The `packages/` directory contains the core SDK libraries that get published to npm. These are the building blocks developers use when integrating tldraw:

| Package             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `@tldraw/editor`    | Core canvas engine without shapes or UI |
| `@tldraw/tldraw`    | Complete SDK with UI, shapes, and tools |
| `@tldraw/store`     | Reactive record database                |
| `@tldraw/state`     | Signals-based state management          |
| `@tldraw/tlschema`  | Type definitions and data migrations    |
| `@tldraw/sync`      | Multiplayer collaboration hooks         |
| `@tldraw/sync-core` | Core sync infrastructure                |
| `@tldraw/validate`  | Runtime validation library              |
| `@tldraw/utils`     | Shared utilities                        |
| `@tldraw/assets`    | Icons, fonts, and translations          |

### apps/

The `apps/` directory contains applications built with the SDK:

| Application                   | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `examples/`                   | SDK showcase with 130+ examples (primary dev environment) |
| `docs/`                       | Documentation website (tldraw.dev)                        |
| `dotcom/client/`              | tldraw.com frontend application                           |
| `dotcom/sync-worker/`         | Multiplayer backend (Cloudflare Worker)                   |
| `dotcom/asset-upload-worker/` | Asset upload service                                      |
| `dotcom/image-resize-worker/` | Image optimization service                                |
| `vscode/`                     | VSCode extension for .tldr files                          |

### templates/

The `templates/` directory contains starter projects for different frameworks and use cases:

- `vite/` - Minimal Vite setup (fastest way to start)
- `nextjs/` - Next.js with SSR support
- `sync-cloudflare/` - Multiplayer with Cloudflare Durable Objects
- `workflow/` - Node-based visual programming
- `ai/` - AI integration patterns

### internal/

The `internal/` directory contains development tooling:

- `scripts/` - Build and deployment automation
- `config/` - Shared TypeScript and test configuration
- `dev-tools/` - Debugging utilities

## Technology stack

The repository uses:

- **TypeScript** for all code
- **React 18+** as the UI framework
- **Yarn Berry (v4)** for package management
- **LazyRepo** for incremental builds
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **Cloudflare Workers** for backend services

## Package relationships

The SDK packages form a layered architecture:

```
┌─────────────────────────────────────────┐
│            @tldraw/tldraw               │  Complete SDK
│     (shapes, tools, UI, everything)     │
├─────────────────────────────────────────┤
│            @tldraw/editor               │  Canvas engine
│      (core editing, no defaults)        │
├─────────────────────────────────────────┤
│  @tldraw/store  │  @tldraw/tlschema     │  Data layer
│   (database)    │   (types/schemas)     │
├─────────────────────────────────────────┤
│            @tldraw/state                │  Reactivity
│         (signals system)                │
├─────────────────────────────────────────┤
│  @tldraw/validate  │  @tldraw/utils     │  Foundation
└─────────────────────────────────────────┘
```

Most developers use `@tldraw/tldraw` directly. The lower-level packages are for advanced customization or building alternative implementations.

## Development environments

The repository supports several development modes:

| Command           | What it starts                 |
| ----------------- | ------------------------------ |
| `yarn dev`        | Examples app at localhost:5420 |
| `yarn dev-app`    | tldraw.com client              |
| `yarn dev-docs`   | Documentation site             |
| `yarn dev-vscode` | VSCode extension               |

The examples app (`yarn dev`) is the primary development environment. It provides a testbed for SDK changes with hot reloading.

## Versioning and releases

All packages share the same version number and are released together. The current version is tracked in each package's `package.json`. Releases are published to npm under the `@tldraw` scope.

## Licensing

The SDK uses the tldraw license, which allows free use with a "Made with tldraw" watermark. A business license removes the watermark requirement. See the LICENSE.md file for details.

## Key files

- package.json - Root workspace configuration
- CLAUDE.md - AI agent guidance and essential commands
- CONTEXT.md - Detailed architecture documentation
- lazy.config.ts - Build system configuration
- LICENSE.md - Licensing terms

## Related

- [Architecture overview](./architecture-overview.md) - How the SDK layers work together
- [Getting started](./getting-started.md) - Setting up your development environment
