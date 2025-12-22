---
title: tldraw.com client
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - dotcom
  - client
  - web app
  - tldraw.com
---

The tldraw.com client is the React application that powers the public web app. It is a Vite SPA that integrates authentication, file management, and real-time collaboration on top of the tldraw SDK.

## Key components

### App shell and routing

Routes map to file views, publishing flows, and legacy rooms. Route handling lives in the client router and page components under `src/pages` and `src/tla/pages`.

### TLA file system

The tldraw app (TLA) layer handles file metadata, local persistence, cloud sync, and sharing. It integrates with the sync backend and asset pipelines.

### Collaboration and presence

Multiplayer uses `@tldraw/sync` to keep document state in sync and to publish presence (cursors and selections) to other collaborators.

### Authentication

Clerk provides session management and protects routes that require signed-in users.

## Data flow

1. The client authenticates the user and loads their workspace.
2. A file route resolves metadata and initializes a Store.
3. The sync client hydrates state and begins diff-based updates.
4. Editor UI renders on top of the Store and listens for changes.

## Development workflow

```bash
yarn dev

yarn build

yarn e2e
```

Environment variables are required for local development:

```bash
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_SENTRY_DSN=...
```

## Routes

```
/                  # Landing page
/new               # Create new file
/f/:fileId         # File editor
/f/:fileId/h       # File history
/f/:fileId/h/:vsId # History snapshot
/publish           # Publishing flow
```

## Key files

- apps/dotcom-client/vite.config.ts - Build configuration
- apps/dotcom-client/src/main.tsx - Entry point
- apps/dotcom-client/src/routes.tsx - Route definitions
- apps/dotcom-client/src/tla/ - File management system

## Related

- [Sync worker](../infrastructure/sync-worker.md) - Backend collaboration
- [`@tldraw/sync`](../packages/sync.md) - Sync hooks
- [`@tldraw/tldraw`](../packages/tldraw.md) - Editor SDK
