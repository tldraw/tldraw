# @dotcom/client

The frontend React application for tldraw.com - the official tldraw web application.

## Overview

A modern React SPA built with Vite that provides the complete tldraw.com user experience. This is the main consumer-facing application that users interact with when visiting tldraw.com, featuring real-time collaboration, file management, user accounts, and the full tldraw editor experience.

## Architecture

### Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Router**: React Router v6 with lazy-loaded routes
- **Authentication**: Clerk for user management and auth
- **Collaboration**: @tldraw/sync for real-time multiplayer
- **Database**: @rocicorp/zero for client-side data sync
- **Styling**: CSS Modules with global styles
- **Internationalization**: FormatJS for i18n support
- **Monitoring**: Sentry for error tracking, PostHog for analytics

### Application Structure

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

## Core Features

### Authentication & User Management

- **Clerk Integration**: Complete auth flow with sign-in/sign-up
- **User Sessions**: Persistent authentication state
- **Protected Routes**: Authenticated route protection
- **Social Login**: Multiple authentication providers

### Real-time Collaboration

- **WebSocket Sync**: Real-time document synchronization
- **Multiplayer Editing**: Multiple users editing simultaneously
- **Conflict Resolution**: Operational transforms for concurrent edits
- **Presence Indicators**: Live cursors and user awareness

### File Management (TLA System)

- **Local Files**: Client-side file storage with IndexedDB
- **Cloud Sync**: Server-side file persistence and sync
- **File History**: Version control with snapshots
- **Sharing**: Public sharing and collaborative access
- **Import/Export**: Multiple file format support

### Editor Integration

- **Full tldraw SDK**: Complete drawing and design capabilities
- **Asset Management**: Image upload and storage via workers
- **Responsive UI**: Adaptive interface for different screen sizes
- **Keyboard Shortcuts**: Comprehensive hotkey system

## Routing Architecture

### Route Structure

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

### Lazy Loading

- **Route-based Splitting**: Each page component lazy loaded
- **Provider Splitting**: Context providers loaded on demand
- **Component Splitting**: Large components split for performance

### Error Boundaries

- **Global Error Handling**: Captures and reports all errors
- **Sync Error Handling**: Specific handling for collaboration errors
- **User-friendly Messages**: Contextual error messages
- **Sentry Integration**: Automatic error reporting

## Data Management

### Client-side Storage

- **IndexedDB**: Local file persistence via IDB library
- **Zero Database**: Real-time sync with server state
- **Asset Caching**: Local caching of uploaded images
- **Settings Persistence**: User preferences and settings

### State Management

- **React Context**: Global app state via providers
- **Custom Hooks**: Business logic encapsulation
- **Zero Sync**: Real-time data synchronization
- **Signal-based Updates**: Reactive state updates

### API Integration

- **Sync Worker**: Real-time collaboration backend
- **Asset Upload Worker**: File upload and storage
- **Image Resize Worker**: Image processing and optimization
- **Zero Server**: Data persistence and sync

## Development Environment

### Build Configuration

- **Vite Config**: Modern build tooling with HMR
- **Environment Variables**: Config via .env files
- **Proxy Setup**: API proxying for development
- **Source Maps**: Full debugging support with Sentry

### Development Commands

```bash
yarn dev         # Start development server
yarn build       # Production build
yarn build-i18n   # Extract and compile translations
yarn e2e         # End-to-end tests via Playwright
yarn test        # Unit tests via Vitest
yarn lint        # Code quality checks
```

### Environment Setup

- **PostgreSQL**: Database dependency via wait-for-postgres.sh
- **Worker Services**: Local development with companion workers
- **Hot Reload**: Fast refresh for development
- **Debug Tools**: Inspector and debugging support

## Internationalization

### FormatJS Integration

- **Message Extraction**: `yarn i18n:extract` extracts translatable strings
- **Compilation**: `yarn i18n:compile` compiles for runtime
- **ICU Messages**: Full ICU message format support
- **Locale Support**: Multiple language support infrastructure

### Translation Workflow

- **Source Scanning**: Automatic message ID generation
- **Lokalise Format**: Translation management integration
- **AST Compilation**: Optimized runtime message handling
- **Dynamic Loading**: Locale-specific bundle loading

## Testing Strategy

### End-to-End Testing

- **Playwright**: Full browser automation testing
- **Auth Testing**: @clerk/testing for authentication flows
- **Multiple Environments**: Testing against staging/production
- **Parallel Execution**: Fast test suite execution

### Unit Testing

- **Vitest**: Fast unit test runner
- **React Testing**: Component and hook testing
- **Snapshot Tests**: UI regression testing
- **Coverage Reports**: Code coverage analysis

## Performance Optimizations

### Bundle Optimization

- **Code Splitting**: Route and component-level splitting
- **Asset Optimization**: Image optimization and inlining limits
- **Tree Shaking**: Unused code elimination
- **Compression**: Gzip and Brotli compression

### Runtime Performance

- **Lazy Loading**: On-demand component loading
- **Memoization**: React.memo and useMemo optimization
- **Virtual DOM**: Efficient React rendering
- **Service Worker**: Cache management (legacy cleanup)

### Network Optimization

- **CDN Assets**: Static asset delivery via CDN
- **HTTP/2**: Modern protocol support
- **Caching Headers**: Browser caching optimization
- **Preloading**: Critical resource preloading

## Security Considerations

### Authentication Security

- **JWT Tokens**: Secure token-based authentication
- **HTTPS Only**: Encrypted communication
- **CSRF Protection**: Cross-site request forgery prevention
- **Session Management**: Secure session handling

### Content Security

- **Iframe Protection**: IFrameProtector component for embedding
- **XSS Prevention**: Input sanitization and validation
- **Asset Validation**: Safe asset handling
- **Privacy Controls**: User data protection

## Deployment & Infrastructure

### Build Process

- **Vite Build**: Optimized production bundles
- **Source Maps**: Error tracking and debugging
- **Asset Fingerprinting**: Cache busting for static assets
- **Environment Configuration**: Runtime environment detection

### Hosting

- **Vercel Deployment**: Serverless hosting platform
- **CDN Integration**: Global asset distribution
- **SSL/TLS**: Automatic certificate management
- **Custom Domains**: tldraw.com domain configuration

### Monitoring & Analytics

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Google Analytics**: User behavior tracking
- **Real User Monitoring**: Performance metrics collection

## Integration Points

### Backend Services

- **Sync Worker**: Real-time collaboration
- **Asset Upload Worker**: File upload handling
- **Image Resize Worker**: Image processing
- **Zero Server**: Data persistence and sync

### Third-party Services

- **Clerk**: Authentication and user management
- **Sentry**: Error reporting and monitoring
- **PostHog**: Analytics and feature flags
- **Vercel**: Hosting and deployment

## Key Files

### Configuration

- `vite.config.ts` - Build tool configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

### Application Core

- `src/main.tsx` - Application entry point
- `src/routes.tsx` - Route definitions and error boundaries
- `src/routeDefs.ts` - Route constants and utilities

### TLA System

- `src/tla/` - Complete file management system
- `src/tla/app/` - Core TLA functionality
- `src/tla/providers/` - Context providers

This client application serves as the primary interface for tldraw.com users, combining the powerful tldraw editor with real-time collaboration, user management, and a comprehensive file system to create a complete creative platform.
