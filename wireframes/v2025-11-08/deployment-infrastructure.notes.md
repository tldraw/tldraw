# Deployment Infrastructure - Detailed Notes

## Overview

tldraw uses a modern cloud-native infrastructure with:
- **Vercel** for frontend hosting (tldraw.com, tldraw.dev)
- **Cloudflare Workers** for backend services (sync, assets, etc.)
- **PostgreSQL** for persistent data storage
- **GitHub Actions** for CI/CD
- **Third-party services** for auth, monitoring, analytics

## Source Control & CI/CD

### GitHub Repository

**Repository:** `tldraw/tldraw`

**Branch Strategy:**
- **main** - Production branch
- **feature/*** - Feature branches
- **fix/*** - Bug fix branches

**Protection Rules:**
- Require PR reviews
- Require passing CI checks
- Require up-to-date branches
- No direct pushes to main

---

### GitHub Actions CI/CD

**Workflow Triggers:**
- Push to any branch
- Pull request opened/updated
- Manual workflow dispatch

**Pipeline Stages:**

#### 1. Build Stage
```yaml
name: Build
jobs:
  build-sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: yarn install --frozen-lockfile
      - run: yarn build-package
      # LazyRepo only builds changed packages
```

#### 2. Test Stage
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - run: yarn typecheck
    - run: yarn lint
    - run: yarn test run
```

#### 3. E2E Test Stage
```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - run: yarn e2e
    - run: yarn e2e-dotcom
```

#### 4. Publish Stage (on main branch)
```yaml
publish:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - run: yarn publish-packages
      env:
        NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

### Deployment Workflows

**Automatic Deployments:**

**Frontend (Vercel):**
- Push to main → Production deployment
- PR opened → Preview deployment

**Workers (Cloudflare):**
- Push to main → Production workers deployed
- PR opened → No automatic worker deployment (manual)

**Docs (Vercel):**
- Push to main → tldraw.dev updated
- Preview for PRs

---

## Frontend Hosting (Vercel)

### Vercel Edge Network

**Purpose:** Global CDN for fast content delivery.

**Characteristics:**
- 100+ edge locations worldwide
- Automatic SSL/TLS certificates
- HTTP/2 and HTTP/3 support
- Automatic image optimization
- Smart routing and caching

---

### tldraw.com Deployment

**Build Process:**
```bash
# In apps/dotcom/client/
yarn build
# Produces:
# - dist/ directory with static assets
# - Optimized JS bundles
# - CSS files
# - Asset fingerprinting for cache busting
```

**Build Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-abc123.js       # Main bundle (fingerprinted)
│   ├── vendor-def456.js      # Vendor bundle
│   ├── editor-ghi789.js      # Editor bundle
│   └── styles-jkl012.css     # Styles
└── images/
    └── ...
```

**Vercel Configuration (vercel.json):**
```json
{
  "framework": "vite",
  "buildCommand": "yarn build",
  "outputDirectory": "dist",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://sync.tldraw.com/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

### tldraw.dev Deployment

**Build Process:**
```bash
# In apps/docs/
yarn build
# Next.js static site generation
# Produces optimized static site
```

**Hosting:**
- Static site hosted on Vercel
- Incremental Static Regeneration (ISR) for some pages
- API routes for search (Algolia integration)

---

### Vercel Features Used

**1. Edge Functions:**
- Serverless functions at edge locations
- Used for API routes (if needed)
- Low latency worldwide

**2. Analytics:**
- Real User Monitoring (RUM)
- Core Web Vitals tracking
- Performance insights

**3. Preview Deployments:**
- Unique URL per PR
- Full production-like environment
- Automatic cleanup after PR closed

**4. Environment Variables:**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SYNC_URL=wss://sync.tldraw.com
VITE_SENTRY_DSN=https://...
VITE_POSTHOG_KEY=phc_...
```

---

## Backend Services (Cloudflare)

### Cloudflare Workers

**What are Workers?**
- Serverless JavaScript runtime
- Edge execution (low latency)
- V8 isolates (fast cold starts)
- Global deployment

---

### Sync Worker

**Purpose:** Real-time collaboration backend.

**Responsibilities:**
- WebSocket connection management
- Document synchronization
- File CRUD operations
- Permissions enforcement

**Deployment:**
```bash
cd apps/dotcom/sync-worker
wrangler publish
# Deployed to: sync.tldraw.com
```

**Configuration (wrangler.toml):**
```toml
name = "tldraw-sync-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
workers_dev = false

[durable_objects]
bindings = [
  { name = "ROOMS", class_name = "TLDrawDurableObject" }
]

[[kv_namespaces]]
binding = "KV"
id = "abc123..."

[env.production]
name = "tldraw-sync-worker-production"
route = "sync.tldraw.com/*"

[env.staging]
name = "tldraw-sync-worker-staging"
route = "sync-staging.tldraw.com/*"
```

**Runtime Limits:**
- CPU time: 50ms per request (can be extended)
- Memory: 128 MB
- Duration: No limit for WebSocket connections

---

### Durable Objects

**What are Durable Objects?**
- Stateful serverless compute
- Single-threaded consistency
- Persistent storage
- Global uniqueness

**Room Durable Object:**
```typescript
export class TLDrawDurableObject {
  state: DurableObjectState
  storage: DurableObjectStorage

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage
  }

  async fetch(request: Request) {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }

    // Handle HTTP requests
    return this.handleHttp(request)
  }

  async handleWebSocket(request: Request) {
    const [client, server] = Object.values(new WebSocketPair())

    await this.handleSession(server)

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }
}
```

**State Persistence:**
- Automatic state persistence
- Durability guarantees
- Transactional storage
- Hibernation when idle

---

### Asset Upload Worker

**Purpose:** Handle media uploads to R2.

**Flow:**
1. Client uploads file via POST
2. Worker validates file (type, size)
3. Computes SHA256 hash (deduplication)
4. Uploads to R2 bucket
5. Returns URL

**Code:**
```typescript
export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validate
    if (file.size > 10 * 1024 * 1024) {
      return new Response('File too large', { status: 413 })
    }

    // Compute hash
    const buffer = await file.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Upload to R2
    const key = `${hashHex}-${file.name}`
    await env.ASSET_BUCKET.put(key, buffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    const url = `https://cdn.tldraw.com/${key}`
    return Response.json({ url })
  }
}
```

---

### Image Resize Worker

**Purpose:** On-the-fly image optimization.

**Flow:**
1. Client requests image with size params
2. Worker checks cache (KV or R2)
3. If not cached, resize original
4. Store resized version
5. Return optimized image

**URL Format:**
```
https://images.tldraw.com/abc123.jpg?w=800&h=600&format=avif
```

**Implementation:**
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const imageKey = url.pathname.slice(1)
    const width = url.searchParams.get('w')
    const height = url.searchParams.get('h')
    const format = url.searchParams.get('format') || 'auto'

    // Check cache
    const cacheKey = `${imageKey}-${width}x${height}-${format}`
    const cached = await env.KV.get(cacheKey, 'arrayBuffer')
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=31536000'
        }
      })
    }

    // Get original from R2
    const original = await env.ASSET_BUCKET.get(imageKey)
    if (!original) {
      return new Response('Not found', { status: 404 })
    }

    // Resize using Cloudflare Image Resizing
    const resized = await fetch(original.url, {
      cf: {
        image: {
          width: parseInt(width),
          height: parseInt(height),
          format: format
        }
      }
    })

    const resizedBuffer = await resized.arrayBuffer()

    // Cache
    await env.KV.put(cacheKey, resizedBuffer, {
      expirationTtl: 60 * 60 * 24 * 30  // 30 days
    })

    return new Response(resizedBuffer, {
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  }
}
```

---

### R2 Object Storage

**What is R2?**
- S3-compatible object storage
- No egress fees
- Global distribution
- Automatic replication

**Bucket Structure:**
```
tldraw-assets/
├── abc123def456-image.png      # User uploads (hash-named)
├── ghi789jkl012-video.mp4
└── mno345pqr678-screenshot.jpg
```

**Features:**
- Automatic CDN integration
- Public or private buckets
- Signed URLs for private access
- Lifecycle policies

---

### KV Store

**What is KV?**
- Global key-value store
- Eventually consistent
- Fast reads (low latency)
- Used for caching

**Use Cases:**
- Resized image cache
- Session data cache
- Rate limiting counters

**Example:**
```typescript
// Set value
await env.KV.put('key', 'value', {
  expirationTtl: 3600  // 1 hour
})

// Get value
const value = await env.KV.get('key')

// Delete value
await env.KV.delete('key')
```

---

## Database & Persistence

### PostgreSQL

**Hosting:** Managed PostgreSQL (e.g., Neon, Supabase, or self-hosted)

**Configuration:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/tldraw?sslmode=require
```

**Connection Pooling:**
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

**Migrations:**
```bash
# Run migrations
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

---

### Zero Sync (Rocicorp)

**Purpose:** Optimistic client-server synchronization.

**Architecture:**
```
Client (Browser)
  ↕ Zero Client (IndexedDB)
  ↕ WebSocket
  ↕ Zero Server
  ↕ PostgreSQL
```

**Features:**
- Optimistic updates (immediate UI)
- Automatic conflict resolution
- Offline support
- Real-time sync

**Integration:**
```typescript
import { useZero } from '@rocicorp/zero'

function App() {
  const z = useZero({
    server: 'https://zero.tldraw.com',
    userID: userId,
    auth: token
  })

  const files = z.query.files.where('ownerId', userId).all()

  return <FileList files={files} />
}
```

---

## Third-Party Services

### Clerk (Authentication)

**Purpose:** User authentication and management.

**Integration:**
- Frontend: `@clerk/clerk-react`
- Backend: JWT verification

**Features:**
- Email/password auth
- OAuth (Google, GitHub, etc.)
- User management dashboard
- Webhooks for user events

**Configuration:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

---

### Sentry (Error Tracking)

**Purpose:** Error monitoring and performance tracking.

**Frontend Integration:**
```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
})
```

**Backend Integration (Workers):**
```typescript
import { Toucan } from 'toucan-js'

export default {
  async fetch(request, env, ctx) {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      context: ctx,
      request
    })

    try {
      return await handleRequest(request)
    } catch (err) {
      sentry.captureException(err)
      throw err
    }
  }
}
```

---

### PostHog (Analytics)

**Purpose:** Product analytics and feature flags.

**Integration:**
```typescript
import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  autocapture: false
})

// Track events
posthog.capture('file_created', {
  fileId: file.id,
  shapeCount: shapes.length
})
```

**Feature Flags:**
```typescript
const enableNewFeature = posthog.isFeatureEnabled('new-feature')

if (enableNewFeature) {
  // Show new feature
}
```

---

### Vercel Analytics

**Purpose:** Performance monitoring.

**Metrics Tracked:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Time to First Byte (TTFB)

**Integration:**
```typescript
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  )
}
```

---

## DNS & CDN

### Cloudflare DNS

**Domain:** `tldraw.com`

**Records:**
```
tldraw.com              A       76.76.21.21 (Vercel)
www.tldraw.com          CNAME   tldraw.com
sync.tldraw.com         CNAME   tldraw.workers.dev
images.tldraw.com       CNAME   tldraw.workers.dev
cdn.tldraw.com          CNAME   tldraw.r2.dev
```

**SSL/TLS:**
- Automatic certificate provisioning
- TLS 1.3 support
- Always use HTTPS

---

### Cloudflare CDN

**Purpose:** Global content delivery.

**Features:**
- Edge caching
- DDoS protection
- Web Application Firewall (WAF)
- Bot protection
- Rate limiting

**Cache Rules:**
```javascript
// Static assets: cache for 1 year
/assets/* → Cache-Control: public, max-age=31536000, immutable

// HTML: no cache
/*.html → Cache-Control: no-cache

// API: no cache
/api/* → Cache-Control: no-store
```

---

## Monitoring & Observability

### Vercel Logs

**What's Logged:**
- HTTP requests
- Function invocations
- Build logs
- Deployment logs

**Access:**
- Vercel Dashboard > Logs
- Real-time streaming
- Search and filter

---

### Cloudflare Logs

**What's Logged:**
- Worker invocations
- Durable Object operations
- R2 access
- KV operations

**Access:**
- Cloudflare Dashboard > Workers > Logs
- Logpush to external services (optional)

**Log Aggregation:**
```typescript
// Worker logging
console.log('Processing request', {
  url: request.url,
  method: request.method,
  userId: userId
})

// Logs appear in Cloudflare Dashboard
```

---

### Sentry Dashboard

**Error Analysis:**
- Stack traces
- Breadcrumbs (events leading to error)
- User impact (how many affected)
- Environment context
- Release tracking

**Performance Monitoring:**
- Transaction traces
- Slow queries
- API endpoint performance
- Frontend performance

---

### PostHog Dashboard

**Analytics:**
- User behavior flows
- Feature adoption
- Retention cohorts
- Funnels
- Session replays

**Dashboards:**
- Custom dashboards
- Real-time metrics
- Alerts

---

## Development Environments

### Local Development

**Start Development:**
```bash
yarn dev
# Runs:
# - Vite dev server (frontend)
# - Miniflare (workers emulation)
# - PostgreSQL (local instance)
```

**Ports:**
- Frontend: `localhost:5420`
- Sync worker: `localhost:8787`
- PostgreSQL: `localhost:5432`

**Environment:**
```env
# .env.development
DATABASE_URL=postgresql://localhost/tldraw_dev
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SYNC_URL=ws://localhost:8787
```

---

### Staging Environment

**Purpose:** Pre-production testing.

**Deployment:**
- Automatic for specific branches (e.g., `staging`)
- Manual trigger for feature branches

**URLs:**
```
Frontend: staging.tldraw.com (Vercel preview)
Workers: sync-staging.tldraw.com
Database: PostgreSQL staging instance
```

**Configuration:**
- Separate environment variables
- Staging Clerk environment
- Staging database

---

### Preview Deployments (Per-PR)

**Purpose:** Test changes in production-like environment.

**Vercel Previews:**
- Unique URL per PR: `tldraw-pr-123.vercel.app`
- Full frontend deployment
- Shared backend services (staging)

**GitHub Integration:**
- Comment on PR with preview URL
- Auto-update on new commits
- Auto-delete on PR merge/close

---

## Package Distribution

### npm Registry

**Published Packages:**
```
@tldraw/editor
@tldraw/tldraw
@tldraw/store
@tldraw/state
@tldraw/tlschema
@tldraw/sync
@tldraw/sync-core
@tldraw/utils
@tldraw/validate
@tldraw/assets
@tldraw/create-tldraw
```

**Publishing Process:**
```bash
# Manual publish
yarn publish-packages

# Automatic publish (GitHub Actions)
# Triggers on main branch merge
```

**Version Management:**
- All packages versioned together
- Semantic versioning (semver)
- Changelog generation

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Type checking passing
- [ ] No linting errors
- [ ] Changelog updated
- [ ] Breaking changes documented
- [ ] Migration scripts ready (if schema changes)

### Deployment Steps

1. **Merge to main** (triggers CI/CD)
2. **GitHub Actions builds**
   - SDK packages built
   - Frontend built
   - Workers built
3. **Automated tests run**
   - Unit tests
   - Integration tests
   - E2E tests
4. **Deployments triggered**
   - Vercel deploys frontend
   - Wrangler deploys workers
   - npm publishes packages
5. **Smoke tests** (manual or automated)
   - Verify frontend loads
   - Test WebSocket connection
   - Check file operations

### Post-Deployment

- [ ] Monitor error rates (Sentry)
- [ ] Check performance metrics (Vercel Analytics)
- [ ] Verify user analytics (PostHog)
- [ ] Watch logs for issues
- [ ] Announce deployment (if major)

---

## Rollback Procedure

### Frontend Rollback (Vercel)

**Process:**
1. Go to Vercel Dashboard
2. Find previous deployment
3. Click "Promote to Production"
4. Instant rollback (seconds)

**Automatic:**
- Keep previous deployment available
- Rollback in < 30 seconds

---

### Worker Rollback (Cloudflare)

**Process:**
```bash
# Rollback to previous version
wrangler rollback --name tldraw-sync-worker

# Or deploy specific version
wrangler publish --env production --version 1.2.3
```

**Time:** < 5 minutes globally

---

### Database Rollback

**Note:** Database rollbacks are complex and should be avoided.

**Strategy:**
- Forward-only migrations
- Backward-compatible changes
- Blue-green deployment for major changes

---

## Disaster Recovery

### Backup Strategy

**Database:**
- Automated daily backups
- Point-in-time recovery
- 30-day retention
- Offsite replication

**R2 Assets:**
- Versioning enabled
- Cross-region replication
- Lifecycle policies

**Code:**
- GitHub as source of truth
- All commits preserved
- Release tags

---

### Recovery Time Objectives

**RTO (Recovery Time Objective):**
- Frontend: < 5 minutes (Vercel rollback)
- Workers: < 10 minutes (Cloudflare rollback)
- Database: < 1 hour (restore from backup)

**RPO (Recovery Point Objective):**
- Database: < 5 minutes (point-in-time recovery)
- Assets: < 1 hour (last backup)
- Code: 0 (all commits preserved)

---

## Security Considerations

### HTTPS/TLS
- All traffic encrypted (TLS 1.3)
- HSTS headers
- Certificate auto-renewal

### DDoS Protection
- Cloudflare DDoS mitigation
- Rate limiting
- Bot protection

### WAF (Web Application Firewall)
- OWASP rule sets
- Custom rules
- Geo-blocking (if needed)

### Secrets Management
- Environment variables (Vercel/Cloudflare)
- GitHub Secrets for CI/CD
- Rotation policy for sensitive keys

---

## Cost Optimization

### Vercel Costs
- Charged by bandwidth and build minutes
- Optimize bundle sizes
- Image optimization reduces bandwidth

### Cloudflare Costs
- Workers: Free tier + paid usage
- Durable Objects: Per request + storage
- R2: Storage only (no egress fees)

### Database Costs
- Connection pooling reduces overhead
- Optimize queries
- Archive old data

---

## Performance Optimization

### Frontend
- Code splitting (Vite automatic)
- Tree shaking
- Lazy loading routes
- Image optimization

### Workers
- Minimize CPU time
- Cache frequently accessed data (KV)
- Durable Object hibernation

### Database
- Indexed queries
- Connection pooling
- Read replicas for reads

---

## Summary

### Architecture Highlights
- **Global Edge Deployment** - Low latency worldwide
- **Serverless Backend** - Automatic scaling
- **Managed Services** - Reduce operational overhead
- **Comprehensive Monitoring** - Full observability

### Key Technologies
- Vercel (Frontend)
- Cloudflare Workers (Backend)
- Durable Objects (Stateful compute)
- PostgreSQL (Database)
- R2 (Object storage)
- GitHub Actions (CI/CD)

### Deployment Flow
```
Code → GitHub → CI/CD → Deploy → Monitor → Iterate
```
