# @tldraw/bemo-worker

A Cloudflare Worker that provides essential services for tldraw applications, including asset management, bookmark unfurling, and WebSocket connections to collaborative rooms.

## Architecture

**Cloudflare Worker + Durable Object pattern**

- Main worker handles HTTP requests via itty-router
- BemoDO (Durable Object) manages persistent WebSocket connections and room state
- Uses Cloudflare R2 for asset storage and Analytics Engine for telemetry

## Core responsibilities

### 1. Asset management

- **Upload endpoint**: `POST /uploads/:objectName` - Handles user asset uploads to R2 bucket
- **Asset retrieval**: `GET /uploads/:objectName` - Serves uploaded assets with proper caching
- Storage path: `asset-uploads/{objectName}` in BEMO_BUCKET

### 2. Bookmark unfurling

- **Legacy route**: `GET /bookmarks/unfurl` - Extract metadata only
- **Full unfurl**: `POST /bookmarks/unfurl` - Extract metadata and save preview images
- **Asset serving**: `GET /bookmarks/assets/:objectName` - Serve bookmark preview images
- Storage path: `bookmark-assets/{objectName}` in BEMO_BUCKET

### 3. Real-time collaboration

- **Room connection**: `GET /connect/:slug` - Establishes WebSocket connection to collaborative rooms
- Uses BemoDO (Durable Object) to maintain room state and handle multiplayer synchronization
- Integrates with @tldraw/sync-core for real-time document collaboration

## Key components

### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates room connections to Durable Objects.

### BemoDO (BemoDO.ts)

Durable Object that manages:

- WebSocket connections for real-time collaboration
- Room state persistence and synchronization
- Analytics event tracking
- R2 bucket integration for persistent storage

### Environment configuration

Multi-environment setup (dev/preview/staging/production) with:

- Custom domains for staging/production
- Separate R2 buckets per environment
- Analytics datasets per environment
- Durable Object bindings

## Dependencies

**Core tldraw packages:**

- `@tldraw/sync-core` - Real-time collaboration engine
- `@tldraw/worker-shared` - Shared worker utilities
- `@tldraw/store` - Reactive state management
- `@tldraw/tlschema` - Type definitions and validators

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers types and APIs
- R2 for object storage
- Analytics Engine for telemetry

## Development

- `yarn dev` - Start local development server on port 8989
- Uses wrangler for local development and deployment
- Bundle size limit: 350KB (enforced via check-bundle-size script)
- TypeScript configuration optimized for Cloudflare Workers environment

## Deployment environments

- **dev**: Local development with preview bucket
- **preview**: Feature branches with temporary deployments
- **staging**: `canary-demo.tldraw.xyz` for pre-production testing
- **production**: `demo.tldraw.xyz` for live service

## Security & performance

- CORS enabled for cross-origin requests
- Proper asset caching headers
- Analytics tracking for monitoring usage patterns
- Durable Objects provide consistent state management across requests
