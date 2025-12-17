---
title: Documentation
created_at: 17/12/2025
updated_at: 17/12/2025
keywords:
  - documentation
  - entry
  - index
---

Welcome to the documentation for the tldraw monorepo. This repository contains the source code for the tldraw SDK as well as the tldraw.com application, the tldraw.dev documentation, and several other applications that depend on the SDK or support its deployment and operations.

## Table of contents

### Overview

- [Repository overview](./overview/repository-overview.md) - High-level introduction to the monorepo structure, purpose, and key components
- [Architecture overview](./overview/architecture-overview.md) - The three-layer SDK architecture (editor, tldraw, store) and how packages relate
- [Getting started](./overview/getting-started.md) - Setting up the development environment, essential commands, and first steps

### Core SDK packages

- [@tldraw/editor](./packages/editor.md) - The foundational infinite canvas editor engine without shapes, tools, or UI
- [@tldraw/tldraw](./packages/tldraw.md) - The "batteries included" SDK with complete UI, shapes, and tools
- [@tldraw/store](./packages/store.md) - Reactive client-side database for record storage with change tracking
- [@tldraw/state](./packages/state.md) - Fine-grained reactive state management using signals (Atom, Computed)
- [@tldraw/tlschema](./packages/tlschema.md) - Type definitions, validators, migrations, and the complete data model
- [@tldraw/validate](./packages/validate.md) - Lightweight runtime validation library with TypeScript integration

### Collaboration and sync

- [@tldraw/sync](./packages/sync.md) - React hooks and high-level utilities for multiplayer integration
- [@tldraw/sync-core](./packages/sync-core.md) - Core synchronization infrastructure and WebSocket protocol
- [Multiplayer architecture](./architecture/multiplayer.md) - How real-time collaboration works: WebSockets, conflict resolution, presence

### Supporting packages

- [@tldraw/utils](./packages/utils.md) - Shared utilities used across all packages
- [@tldraw/assets](./packages/assets.md) - Centralized icons, fonts, translations, and asset management
- [@tldraw/state-react](./packages/state-react.md) - React integration for the signals state management system
- [@tldraw/dotcom-shared](./packages/dotcom-shared.md) - Shared utilities for the tldraw.com application
- [@tldraw/worker-shared](./packages/worker-shared.md) - Shared utilities for Cloudflare Workers
- [@tldraw/create-tldraw](./packages/create-tldraw.md) - The `npm create tldraw` CLI scaffolding tool

### Applications

- [Examples app](./apps/examples.md) - The SDK showcase with 130+ examples (primary development environment)
- [Documentation site](./apps/docs.md) - The tldraw.dev documentation website (Next.js + Algolia)
- [tldraw.com client](./apps/dotcom-client.md) - The tldraw.com React frontend with auth, file management, and collaboration
- [VSCode extension](./apps/vscode.md) - The tldraw extension for editing .tldr files in VSCode

### Backend infrastructure

- [Sync worker](./infrastructure/sync-worker.md) - Cloudflare Worker handling multiplayer rooms and real-time sync
- [Asset upload worker](./infrastructure/asset-upload-worker.md) - Cloudflare Worker for media uploads to R2
- [Image resize worker](./infrastructure/image-resize-worker.md) - Cloudflare Worker for image optimization and format conversion
- [Zero cache](./infrastructure/zero-cache.md) - Database synchronization layer using Rocicorp Zero
- [Fairy worker](./infrastructure/fairy-worker.md) - AI agent worker for intelligent canvas assistants

### Architecture deep dives

- [Shape system](./architecture/shape-system.md) - How ShapeUtil works: geometry, rendering, hit testing, interactions
- [Tool system](./architecture/tool-system.md) - StateNode state machines and the hierarchical tool architecture
- [Binding system](./architecture/binding-system.md) - BindingUtil and shape relationships (arrows, connections)
- [Reactive state](./architecture/reactive-state.md) - The signals system: Atoms, Computed values, effects, and transactions
- [Store and records](./architecture/store-records.md) - Record types, scopes, queries, side effects, and change tracking
- [Migration system](./architecture/migrations.md) - Schema evolution, migration sequences, and backward compatibility
- [Style system](./architecture/style-system.md) - StyleProp, themes, colors, and how styling works across shapes
- [Asset pipeline](./architecture/asset-pipeline.md) - Asset upload, storage, optimization, and the TLAssetStore interface
- [UI component system](./architecture/ui-components.md) - Component overrides, responsive design, and customization patterns

### Development guides

- [Creating custom shapes](./guides/custom-shapes.md) - Step-by-step guide to implementing new shape types
- [Creating custom tools](./guides/custom-tools.md) - Building interactive tools with StateNode
- [Creating custom bindings](./guides/custom-bindings.md) - Implementing shape-to-shape relationships
- [UI customization](./guides/ui-customization.md) - Overriding components, menus, and toolbars
- [Testing patterns](./guides/testing.md) - Unit testing with Vitest, E2E testing with Playwright, TestEditor utilities
- [Writing examples](./guides/writing-examples.md) - Guidelines for adding examples to the examples app

### Templates

- [Vite template](./templates/vite.md) - Fastest way to get started with tldraw
- [Next.js template](./templates/nextjs.md) - Server-side rendering and Next.js integration
- [Sync Cloudflare template](./templates/sync-cloudflare.md) - Multiplayer implementation with Durable Objects
- [Workflow template](./templates/workflow.md) - Node-based visual programming interface for executable workflows
- [Branching chat template](./templates/branching-chat.md) - AI-powered conversational UI with node-based chat trees
- [Agent template](./templates/agent.md) - AI agent integration with canvas interaction

### Build system and tooling

- [LazyRepo build system](./tooling/lazyrepo.md) - Incremental builds, caching, and dependency management
- [Yarn workspaces](./tooling/yarn-workspaces.md) - Monorepo package management with Yarn Berry
- [TypeScript configuration](./tooling/typescript.md) - Workspace references, API Extractor, and type checking
- [Code quality](./tooling/code-quality.md) - ESLint, Prettier, pre-commit hooks, and CI checks

### Reference

- [Commands reference](./reference/commands.md) - Complete list of yarn commands for development, testing, and building
- [API conventions](./reference/api-conventions.md) - Naming patterns, TypeScript conventions, and code style
- [Glossary](./reference/glossary.md) - Key terms and concepts used throughout the codebase
