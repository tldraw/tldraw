# @dotcom/client

The frontend React application for tldraw.com - the official tldraw web application.

## Overview

A modern React SPA built with Vite that provides the complete tldraw.com user experience. This is the main consumer-facing application that users interact with when visiting tldraw.com, featuring real-time collaboration, file management, user accounts, and the full tldraw editor experience.

## Architecture

### Tech stack

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite with SWC for fast compilation
- **Router**: React Router v6 with lazy-loaded routes
- **Authentication**: Clerk for user management and auth
- **Collaboration**: @tldraw/sync for real-time multiplayer
- **Database**: @rocicorp/zero for client-side data sync
- **Styling**: CSS Modules with global styles
- **Internationalization**: FormatJS for i18n support
- **Monitoring**: Sentry for error tracking, PostHog for analytics

### Application structure

```
src/
├── components/         # Shared UI components
├── pages/             # Route components
├── tla/               # TLA (tldraw app) specific features
│   ├── app/           # Core TLA functionality
│   ├── components/    # TLA-specific components
│   ├── hooks/         # TLA business logic hooks
│   ├── pages/         # TLA route pages
│   ├── providers/     # Context providers
│   └── utils/         # TLA utilities
├── hooks/             # Global React hooks
├── utils/             # Shared utilities
└── assets/            # Static assets
```

## Core features

### Authentication & user management

- **Clerk integration**: Complete auth flow with sign-in/sign-up
- **User sessions**: Persistent authentication state
- **Protected routes**: Authenticated route protection
- **Social login**: Multiple authentication providers

### Real-time collaboration

- **WebSocket sync**: Real-time document synchronization
- **Multiplayer editing**: Multiple users editing simultaneously
- **Conflict resolution**: Operational transforms for concurrent edits
- **Presence indicators**: Live cursors and user awareness

### File management (TLA system)

- **Local files**: Client-side file storage with IndexedDB
- **Cloud sync**: Server-side file persistence and sync
- **File history**: Version control with snapshots
- **Sharing**: Public sharing and collaborative access
- **Import/export**: Multiple file format support

### Editor integration

- **Full tldraw SDK**: Complete drawing and design capabilities
- **Asset management**: Image upload and storage via workers
- **Responsive UI**: Adaptive interface for different screen sizes
- **Keyboard shortcuts**: Comprehensive hotkey system

## Routing architecture

### Route structure

```typescript
// Main application routes
/                    # Root/landing page (TLA)
/new                # Create new file
/f/:fileId          # File editor
/f/:fileId/h        # File history
/f/:fileId/h/:vsId  # History snapshot
/publish            # Publishing flow

// Legacy compatibility routes
/r/:roomId          # Legacy room redirect
/ro/:roomId         # Legacy readonly redirect
/s/:roomId          # Legacy snapshot redirect
/v/:roomId          # Legacy readonly (old format)
```

### Lazy loading

- **Route-based splitting**: Each page component lazy loaded
- **Provider splitting**: Context providers loaded on demand
- **Component splitting**: Large components split for performance

### Error boundaries

- **Global error handling**: Captures and reports all errors
- **Sync error handling**: Specific handling for collaboration errors
- **User-friendly messages**: Contextual error messages
- **Sentry integration**: Automatic error reporting

## Data management

### Client-side storage

- **IndexedDB**: Local file persistence via IDB library
- **Zero database**: Real-time sync with server state
- **Asset caching**: Local caching of uploaded images
- **Settings persistence**: User preferences and settings

### State management

- **React Context**: Global app state via providers
- **Custom hooks**: Business logic encapsulation
- **Zero Sync**: Real-time data synchronization
- **Signal-based updates**: Reactive state updates

### API integration

- **Sync worker**: Real-time collaboration backend
- **Asset upload worker**: File upload and storage
- **Image resize worker**: Image processing and optimization
- **Zero server**: Data persistence and sync

## Development environment

### Build configuration

- **Vite config**: Modern build tooling with HMR
- **Environment variables**: Config via .env files
- **Proxy setup**: API proxying for development
- **Source maps**: Full debugging support with Sentry

### Development commands

```bash
yarn dev         # Start development server
yarn build       # Production build
yarn build-i18n   # Extract and compile translations
yarn e2e         # End-to-end tests via Playwright
yarn test        # Unit tests via Vitest
yarn lint        # Code quality checks
```

### Environment setup

- **PostgreSQL**: Database dependency via wait-for-postgres.sh
- **Worker services**: Local development with companion workers
- **Hot reload**: Fast refresh for development
- **Debug tools**: Inspector and debugging support

## Internationalization

### FormatJS integration

- **Message extraction**: `yarn i18n:extract` extracts translatable strings
- **Compilation**: `yarn i18n:compile` compiles for runtime
- **ICU messages**: Full ICU message format support
- **Locale support**: Multiple language support infrastructure

### Translation workflow

- **Source scanning**: Automatic message ID generation
- **Lokalise format**: Translation management integration
- **AST compilation**: Optimized runtime message handling
- **Dynamic loading**: Locale-specific bundle loading

## Testing strategy

### End-to-end testing

- **Playwright**: Full browser automation testing
- **Auth testing**: @clerk/testing for authentication flows
- **Multiple environments**: Testing against staging/production
- **Parallel execution**: Fast test suite execution

### Unit testing

- **Vitest**: Fast unit test runner
- **React testing**: Component and hook testing
- **Snapshot tests**: UI regression testing
- **Coverage reports**: Code coverage analysis

## Performance optimizations

### Bundle optimization

- **Code splitting**: Route and component-level splitting
- **Asset optimization**: Image optimization and inlining limits
- **Tree shaking**: Unused code elimination
- **Compression**: Gzip and Brotli compression

### Runtime performance

- **Lazy loading**: On-demand component loading
- **Memoization**: React.memo and useMemo optimization
- **Virtual DOM**: Efficient React rendering
- **Service worker**: Cache management (legacy cleanup)

### Network optimization

- **CDN assets**: Static asset delivery via CDN
- **HTTP/2**: Modern protocol support
- **Caching headers**: Browser caching optimization
- **Preloading**: Critical resource preloading

## Security considerations

### Authentication security

- **JWT tokens**: Secure token-based authentication
- **HTTPS only**: Encrypted communication
- **CSRF protection**: Cross-site request forgery prevention
- **Session management**: Secure session handling

### Content security

- **Iframe protection**: IFrameProtector component for embedding
- **XSS prevention**: Input sanitization and validation
- **Asset validation**: Safe asset handling
- **Privacy controls**: User data protection

## Deployment & infrastructure

### Build process

- **Vite build**: Optimized production bundles
- **Source maps**: Error tracking and debugging
- **Asset fingerprinting**: Cache busting for static assets
- **Environment configuration**: Runtime environment detection

### Hosting

- **Vercel deployment**: Serverless hosting platform
- **CDN integration**: Global asset distribution
- **SSL/TLS**: Automatic certificate management
- **Custom domains**: tldraw.com domain configuration

### Monitoring & analytics

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Google Analytics**: User behavior tracking
- **Real user monitoring**: Performance metrics collection

## Integration points

### Backend services

- **Sync worker**: Real-time collaboration
- **Asset upload worker**: File upload handling
- **Image resize worker**: Image processing
- **Zero server**: Data persistence and sync

### Third-party services

- **Clerk**: Authentication and user management
- **Sentry**: Error reporting and monitoring
- **PostHog**: Analytics and feature flags
- **Vercel**: Hosting and deployment

## Key files

### Configuration

- `vite.config.ts` - Build tool configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

### Application core

- `src/main.tsx` - Application entry point
- `src/routes.tsx` - Route definitions and error boundaries
- `src/routeDefs.ts` - Route constants and utilities

### TLA system

- `src/tla/` - Complete file management system
- `src/tla/app/` - Core TLA functionality
- `src/tla/providers/` - Context providers

This client application serves as the primary interface for tldraw.com users, combining the powerful tldraw editor with real-time collaboration, user management, and a comprehensive file system to create a complete creative platform.
