# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Simple tldraw** (`apps/simple-dotcom/`) is a self-contained collaborative whiteboard application built on the tldraw library. It's designed specifically for agent-driven development with structured specifications and ticket-based workflows.

**Key Difference from Main tldraw.com**: Simple Dotcom uses a streamlined cloud-native architecture without local-first capabilities. All application data lives in Supabase PostgreSQL with real-time collaboration via tldraw sync workers on Cloudflare.

## Essential Commands

### Development

```bash
# Start Next.js development server (from monorepo root)
yarn workspace simple-dotcom dev

# Build for production
yarn workspace simple-dotcom build

# Run production build locally
yarn workspace simple-dotcom start

# Lint code
yarn workspace simple-dotcom lint
```

### Database & Supabase

```bash
# Regenerate TypeScript types after schema changes
yarn workspace simple-client gen-types

# Start local Supabase instance
cd apps/simple-dotcom && supabase start

# Stop local Supabase
cd apps/simple-dotcom && supabase stop

# Reset local database (destructive)
cd apps/simple-dotcom && supabase db reset

# Create new migration
cd apps/simple-dotcom && supabase migration new <migration_name>

# Apply migrations
cd apps/simple-dotcom && supabase migration up
```

### Testing

```bash
# Run all E2E tests (Playwright)
yarn workspace simple-client test:e2e

# Run E2E tests in UI mode (interactive debugging)
yarn workspace simple-client test:e2e:ui

# Run E2E tests in headed mode (see browser)
yarn workspace simple-client test:e2e:headed

# Debug specific test
yarn workspace simple-client test:e2e:debug

# Run with retries on failures
yarn workspace simple-client test:e2e || yarn workspace simple-client test:e2e --last-failed
```

### Package Management

**IMPORTANT: Always use `yarn` for package management. This monorepo uses yarn workspaces - never use `npm`.**

```bash
# Add dependency
yarn workspace simple-dotcom add <package>

# Add dev dependency
yarn workspace simple-dotcom add -D <package>

# Add dependency to simple-client specifically
yarn workspace simple-client add <package>
```

## Sources of Truth

Follow this hierarchy when making decisions:

1. **`SPECIFICATION.md`** - Canonical product requirements and technical architecture. Start every task here. If reality diverges, update the spec.
2. **`MILESTONES.md`** - Staged delivery plan with ticket checklists. Confirms which milestone you should be executing.
3. **`tickets/`** - Individual work items that implement each milestone. Each ticket traces back to requirement IDs in SPECIFICATION.md.
4. **`secondary-sources/`** - Historic docs kept for context only. Don't modify these; use for background when needed.

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS 4
- **Backend**: Next.js API routes
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (email/password, session management)
- **Real-time**: Supabase Realtime (Broadcast channels) + React Query polling
- **Canvas Storage**: Cloudflare R2 (future milestone)
- **Sync Worker**: Cloudflare Durable Objects (future milestone)
- **Testing**: Playwright for E2E tests

### Key Architectural Patterns

**Hybrid Realtime Strategy**

The application uses a **dual-layer approach** for data synchronization:

1. **Supabase Realtime (Primary)** - Instant updates via Broadcast channels
2. **React Query Polling (Fallback)** - 10-15 second intervals to catch missed events

This handles browser throttling, tab backgrounding, connection drops, and missed events during navigation.

**Implementation Pattern:**

```typescript
// Client: React Query with polling
const { data } = useQuery({
  queryKey: ['dashboard', userId],
  queryFn: fetchDashboard,
  staleTime: 1000 * 10,           // 10 seconds
  refetchInterval: 1000 * 15,      // Poll every 15 seconds
  refetchOnMount: true,
  refetchOnReconnect: true,
})

// Client: Realtime subscription (Broadcast, not Postgres Changes)
const channel = supabase
  .channel(`workspace:${workspaceId}`)
  .on('broadcast', { event: 'workspace_event' }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })
  .subscribe()

// Server: Broadcasting events after mutations
await broadcastDocumentEvent(
  supabase,
  documentId,
  workspaceId,
  'document.created',
  { documentId, workspaceId, name: document.name },
  userId
)
```

**Data Model Overview**

Core tables (see `supabase/migrations/` for schema):
- `users` - User profiles (synced from auth.users via trigger)
- `workspaces` - Private (auto-created) and shared workspaces
- `workspace_members` - Workspace membership with owner/member roles
- `documents` - Canvas documents with metadata (name, folder, sharing, archive state)
- `folders` - Hierarchical folder structure (max 10 levels deep)
- `invitation_links` - Persistent invitation links per workspace (enable/disable/regenerate)
- `recent_documents` - Tracks document access for "Recent" lists

**Authentication Flow**

1. Supabase Auth handles email/password signup, login, password reset
2. Database trigger syncs `auth.users` → `public.users` on signup
3. Trigger automatically provisions private workspace for new users (AUTH-02)
4. Sessions validated via Supabase SSR in middleware and API routes

**Permission Model**

- **Row Level Security (RLS)** enforces all access control at database layer
- Workspace access: owner + members only
- Document access: workspace members OR guests (if sharing enabled)
- Private workspaces: non-deletable, non-renamable, owned by creating user
- Ownership transfer: atomic operation via database function

### Directory Structure

```
apps/simple-dotcom/
├── SPECIFICATION.md              # Product requirements & architecture
├── MILESTONES.md                 # Staged delivery plan
├── README.md                     # Developer guide
├── simple-client/                # Next.js application
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── api/              # API routes (RESTful endpoints)
│   │   │   ├── dashboard/        # Global dashboard
│   │   │   ├── workspace/[id]/   # Workspace view
│   │   │   ├── invite/[token]/   # Invitation acceptance
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── api/              # API client utilities and error types
│   │   │   ├── supabase/         # Supabase client configuration
│   │   │   ├── realtime/         # Realtime event broadcasting
│   │   │   └── logger/           # Structured logging (pino)
│   │   └── components/           # React components
│   ├── e2e/                      # Playwright E2E tests
│   ├── API.md                    # API endpoint documentation
│   └── INVITATION-SYSTEM.md      # Invitation link architecture
├── supabase/
│   ├── config.toml               # Supabase project config
│   ├── migrations/               # Database migrations
│   ├── types.ts                  # Generated TypeScript types
│   └── RLS_POLICIES_OUTLINE.md   # Security policies documentation
├── tickets/                      # Work item tracking
│   ├── TEMPLATE.md               # Ticket template
│   ├── backlog/                  # Future tickets
│   └── resolved/                 # Completed tickets
└── secondary-sources/            # Historical docs (read-only)
```

## Development Workflow

### 1. Understanding Requirements

Before starting any task:
1. Read relevant sections in `SPECIFICATION.md` - note requirement IDs (e.g., AUTH-01, DOC-03)
2. Check `MILESTONES.md` to confirm which milestone the work belongs to
3. Review the specific ticket in `tickets/` for acceptance criteria and dependencies

### 2. Implementation

When implementing features:
- Follow patterns from existing API routes and components
- Add RLS policies to `supabase/migrations/` for new tables
- Use structured logging: `logger.info({ context }, 'message')`
- Implement hybrid realtime: React Query polling + Supabase Broadcast
- Add data-testid attributes for E2E test selectors

**API Route Pattern:**

```typescript
// src/app/api/workspaces/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { ApiError, errorResponse, successResponse } from '@/lib/api/errors'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse(ApiError.UNAUTHORIZED)
  }

  // Fetch data (RLS enforces access)
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return errorResponse(ApiError.NOT_FOUND)

  return successResponse(data)
}
```

### 3. Database Changes

When modifying schema:
1. Create migration: `supabase migration new <descriptive_name>`
2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`
3. Include RLS policies in the same migration
4. Apply: `supabase db reset` (local) or `supabase migration up`
5. Regenerate types: `yarn workspace simple-client gen-types`

### 4. Testing

**E2E Testing Philosophy:**
- Test critical user flows end-to-end
- Use separate test database (configured in `playwright.config.ts`)
- Clean up test data after each test (see `e2e/helpers/test-helpers.ts`)
- Use data-testid selectors for stability

**Writing E2E Tests:**

```typescript
import { test, expect } from '@playwright/test'
import { createTestUser, loginUser, cleanup } from './helpers/test-helpers'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Setup
    const { email, password } = await createTestUser()
    await loginUser(page, email, password)

    // Test actions
    await page.click('[data-testid="create-workspace"]')
    await page.fill('[data-testid="workspace-name"]', 'Test Workspace')
    await page.click('[data-testid="submit"]')

    // Assertions
    await expect(page.locator('[data-testid="workspace-list"]')).toContainText('Test Workspace')

    // Cleanup
    await cleanup(page)
  })
})
```

### 5. Bug Reporting

**For Agents (YOU):**

When you encounter a bug during your work, delegate to the bug-report-generator agent using the Task tool. This is **FIRE-AND-FORGET** - do not wait for the agent to complete. Continue with your current task immediately.

```typescript
Task({
  subagent_type: "bug-report-generator",
  description: "Report dashboard crash bug",
  prompt: `Create a bug report for: Dashboard crashes when clicking 'New Workspace' button.

  Additional context: User was logged in, navigated to dashboard, clicked button in top-right.
  Browser console shows: TypeError: Cannot read property 'id' of undefined`
})
```

**What to include:**
- Clear description of the bug
- App state when observed (logged in/out, which page, actions taken)
- Error messages from browser console or UI
- Steps that led to the bug

**What NOT to do:**
- Don't investigate root cause yourself (unless you're the bug-report-generator agent)
- Don't manually check logs or stack traces
- Don't get sidetracked from your current task

The bug-report-generator agent will automatically create a properly formatted report in `bugs/BUG-XX-description.md`.

### 6. Logging & Debugging

**Backend Logs:**

Structured logs are written to:
- **Console**: Pretty-printed when running `yarn workspace simple-dotcom dev`
- **File**: JSON format in `apps/simple-dotcom/.logs/backend.log`

```bash
# View recent logs
tail -n 200 apps/simple-dotcom/.logs/backend.log

# Follow logs in real-time
tail -f apps/simple-dotcom/.logs/backend.log
```

**Debugging Realtime Issues:**

```typescript
// Enable console logging
console.log('[Realtime] Subscribed to workspace:', workspaceId)
console.log('[Realtime] Event received:', event.type, payload)

// Check subscription status
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('✅ Connected')
  } else if (status === 'CHANNEL_ERROR') {
    console.log('❌ Failed to subscribe')
  }
})
```

## Agent Workflow Best Practices

1. **Check Sources of Truth First**: Always consult SPECIFICATION.md and MILESTONES.md before acting on a request
2. **Cross-reference Requirements**: Restate relevant requirement IDs (AUTH-01, DOC-03, etc.) to confirm scope
3. **Update Tickets**: Use the Worklog section to track progress, decisions, and blockers with dated entries
4. **Synchronize Documentation**: Reflect any decisions or clarifications back into SPECIFICATION.md or MILESTONES.md
5. **Bug Triage Between Tasks**: Check `bugs/` folder after each ticket. Fix Critical/Blocking bugs immediately. Our philosophy: fix bugs as we go rather than accumulating them.
6. **Prefer Non-Destructive Exploration**: Use read-only commands (Read, Grep, Glob) unless explicitly requested to edit
7. **Announce Changes**: Provide concise diff-oriented summaries and validation results after making changes

## Common Patterns & Anti-Patterns

### DO:
- ✅ Always use `yarn` for package management (never `npm`)
- ✅ Regenerate types after schema changes: `yarn workspace simple-client gen-types`
- ✅ Implement hybrid realtime (Broadcast + React Query polling)
- ✅ Add RLS policies for all new tables
- ✅ Use data-testid attributes for E2E test selectors
- ✅ Add cleanup functions for Realtime subscriptions
- ✅ Broadcast events after every mutation
- ✅ Set `refetchOnMount: true` for realtime data
- ✅ Use workspace-aware yarn commands: `yarn workspace <package> <script>`

### DON'T:
- ❌ Use npm commands (monorepo requires yarn workspaces)
- ❌ Forget to regenerate types after migrations
- ❌ Rely solely on WebSocket connections (use hybrid approach)
- ❌ Use Postgres Changes for critical updates (use Broadcast instead)
- ❌ Skip RLS policies (security enforced at database layer)
- ❌ Pull tickets from future milestones before current exit criteria met
- ❌ Modify `secondary-sources/` (read-only historical docs)
- ❌ Use `refetchOnMount: false` for realtime data

## Additional Resources

- **API Documentation**: `simple-client/API.md`
- **Invitation System**: `simple-client/INVITATION-SYSTEM.md`
- **RLS Policies**: `supabase/RLS_POLICIES_OUTLINE.md`
- **Ticket Template**: `tickets/TEMPLATE.md`
- **Bug Template**: `tickets/BUG_TEMPLATE.md`

For external documentation:
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [Playwright](https://playwright.dev/)
- [tldraw](https://tldraw.dev)
