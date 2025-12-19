---
title: tldraw.com client
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - dotcom
  - client
  - web app
  - tldraw.com
---

The frontend React application for tldraw.com - the official tldraw web application providing real-time collaboration, file management, and the full tldraw editor experience.

## Overview

A modern React SPA built with Vite that powers tldraw.com:

- Real-time collaborative editing
- File management with cloud sync
- User authentication and accounts
- Full tldraw SDK integration

## Tech stack

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite with SWC
- **Router**: React Router v6
- **Authentication**: Clerk
- **Collaboration**: @tldraw/sync
- **Database**: @rocicorp/zero for client-side sync
- **Styling**: CSS Modules
- **Internationalization**: FormatJS
- **Monitoring**: Sentry, PostHog

## Architecture

```
src/
├── components/         # Shared UI components
├── pages/             # Route components
├── tla/               # TLA (tldraw app) features
│   ├── app/           # Core TLA functionality
│   ├── components/    # TLA-specific components
│   ├── hooks/         # Business logic hooks
│   ├── pages/         # TLA route pages
│   ├── providers/     # Context providers
│   └── utils/         # TLA utilities
├── hooks/             # Global React hooks
└── utils/             # Shared utilities
```

## Core features

### Authentication

- Clerk integration for sign-in/sign-up
- Social login (Google, GitHub, etc.)
- Protected routes
- Session management

### Real-time collaboration

- WebSocket-based synchronization
- Live cursors and presence
- Conflict resolution
- Multi-user editing

### File management (TLA)

- Local files with IndexedDB
- Cloud sync with server
- Version history
- Public sharing
- Import/export

### Editor integration

- Full tldraw SDK
- Asset upload and storage
- Responsive UI
- Keyboard shortcuts

## Routes

```typescript
/                    # Root/landing page
/new                # Create new file
/f/:fileId          # File editor
/f/:fileId/h        # File history
/f/:fileId/h/:vsId  # History snapshot
/publish            # Publishing flow

// Legacy routes
/r/:roomId          # Legacy room
/ro/:roomId         # Legacy readonly
```

## Development

### Commands

```bash
yarn dev         # Start development server
yarn build       # Production build
yarn build-i18n  # Extract and compile translations
yarn e2e         # End-to-end tests
yarn test        # Unit tests
```

### Environment setup

```bash
# .env file required
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_SENTRY_DSN=...
```

## Data management

### Client-side storage

- **IndexedDB**: Local file persistence
- **Zero database**: Real-time sync with server
- **Asset caching**: Uploaded images
- **Settings**: User preferences

### Backend integration

- **Sync worker**: Real-time collaboration
- **Asset upload worker**: File uploads
- **Image resize worker**: Image processing
- **Zero server**: Data persistence

## Internationalization

```bash
yarn i18n:extract  # Extract translatable strings
yarn i18n:compile  # Compile for runtime
```

- ICU message format support
- Multiple language infrastructure
- Lokalise integration

## Testing

### End-to-end

- Playwright for browser automation
- @clerk/testing for auth flows
- Multiple environment support

### Unit tests

- Vitest test runner
- Component and hook testing
- Coverage reports

## Performance

### Bundle optimization

- Route-level code splitting
- Asset optimization
- Tree shaking
- Gzip/Brotli compression

### Runtime

- Lazy loading components
- React.memo optimization
- Service worker caching
- CDN asset delivery

## Security

- JWT token authentication
- HTTPS only
- CSRF protection
- XSS prevention
- Asset validation

## Deployment

- Vercel hosting
- CDN integration
- Automatic SSL
- Source maps for debugging

## Key files

- `vite.config.ts` - Build configuration
- `src/main.tsx` - Entry point
- `src/routes.tsx` - Route definitions
- `src/tla/` - File management system

## Related

- [Sync worker](../infrastructure/sync-worker.md) - Backend collaboration
- [@tldraw/sync](../packages/sync.md) - Sync hooks
- [@tldraw/tldraw](../packages/tldraw.md) - Editor SDK
