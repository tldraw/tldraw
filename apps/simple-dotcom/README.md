# Simple tldraw – Simple Dotcom

Developer guide for building and shipping the Simple tldraw MVP. The authoritative requirements, architecture, and implementation details live in `SPECIFICATION.md`; everything else exists to support those decisions.

## Relationship to the tldraw Monorepo

Simple Dotcom is a self-contained collaborative application built on the tldraw library. The tldraw monorepo contains several applications:

- **tldraw.com** (`apps/dotcom/`) — Full-featured application with local-first functionality
- **examples app** (`apps/examples/`) — SDK showcase and demos
- **VS Code extension** (`apps/vscode/`) — Editor integration
- **Simple Dotcom** (`apps/simple-dotcom/`, this project) — Simplified collaborative app optimized for agent development

Simple Dotcom shares many features with the full dotcom application but deliberately omits local-first capabilities. Instead, it uses a streamlined, cloud-native architecture. The project is designed to be built and maintained primarily by AI agents, following structured specifications.

The monorepo uses a CONTEXT.md system throughout: AI-friendly documentation files distributed across packages that explain architecture and usage patterns. These files help agents understand the codebase structure and make informed implementation decisions.

## Sources of Truth

- **Primary**: `SPECIFICATION.md` — start every task by confirming scope, requirements, and technical constraints here. If reality diverges, update the specification before (or alongside) code.
- **Secondary**: Documents in `secondary-sources/` (historic product requirements, original design outline, meeting notes). Use them only for background or when porting context into the spec.
- **Execution trackers**: `MILESTONES.md` defines the staged delivery plan, and `tickets/` contains the work items that implement each milestone.

## Repository Layout

```
apps/simple-dotcom/
├── SPECIFICATION.md        # Canonical product + technical reference
├── MILESTONES.md           # MVP stage gates mapped to ticket checklists
├── README.md               # You are here
├── landing-page-signed-out.png # Visual reference for marketing entry point
├── secondary-sources/      # Legacy docs kept for context only
│   ├── design-doc.md
│   ├── eng-meeting-notes.md
│   ├── product-requirements.md
│   └── product.md
├── simple-client/          # Next.js app (marketing + authenticated experience)
├── simple-worker/          # Cloudflare worker (placeholder until implemented)
├── simple-shared/          # Shared types/utilities (placeholder until implemented)
└── tickets/                # Markdown tickets + TEMPLATE.md
```

## Getting Started

1. Install Node 20 (the monorepo requires it) and enable Corepack if you have not already: `corepack enable`.
2. **IMPORTANT: Always use `yarn` for package management. This monorepo uses yarn workspaces - never use `npm`.**
3. Install dependencies from the repository root: `yarn install`.
4. Seed environment configuration. Follow the integration guidance in `SPECIFICATION.md` under **Technical Architecture & Implementation** for Supabase, Better Auth, Cloudflare, and R2. Create `.env.local` files as needed for `simple-client` and future packages.
5. Run the web app:
   - `yarn workspace simple-dotcom dev` — Next.js development server with Turbopack.
   - `yarn workspace simple-dotcom build` / `start` for production verification.
   - `yarn workspace simple-dotcom lint` before opening a PR.
6. Add additional services (workers, shared packages) as you implement the corresponding milestones; wire up scripts in the root `package.json` or individual package manifests when ready.

## Package Management

- **Always use `yarn`** - this project uses yarn workspaces
- Add dependencies: `yarn workspace simple-dotcom add <package>`
- Add dev dependencies: `yarn workspace simple-dotcom add -D <package>`
- Run scripts: `yarn workspace simple-dotcom <script>`

## TypeScript Type Generation

When the Supabase database schema changes, regenerate TypeScript types:

```bash
yarn workspace simple-client gen-types
```

This command updates types in two locations:

- `supabase/types.ts` (shared types for the workspace)
- `simple-client/src/lib/supabase/types.ts` (client-specific types)

**When to regenerate types:**

- After running new migrations (`supabase migration up`)
- When database schema changes in development
- After pulling schema changes from other developers

## Realtime Data

The application uses a **hybrid realtime strategy** that combines Supabase Realtime with React Query polling for reliable data synchronization across all clients.

### Architecture Overview

We use **two complementary approaches** to ensure data consistency:

1. **Supabase Realtime (Primary)** - Instant updates when connections are stable
2. **React Query Polling (Fallback)** - Periodic fetching to catch missed events

This hybrid approach follows Supabase best practices for Next.js applications and handles browser throttling, tab backgrounding, and connection issues gracefully.

### Why Hybrid?

Relying solely on WebSocket connections (Realtime) can be unreliable due to:
- Browser throttling when tabs are backgrounded
- Connection drops during network transitions
- WebSocket suspension on mobile devices
- Events missed during navigation

The polling fallback ensures eventual consistency even when realtime events are missed.

### Implementation Pattern

**1. Client-Side: React Query with Polling**

```typescript
const { data } = useQuery({
  queryKey: ['dashboard', userId],
  queryFn: fetchDashboard,
  staleTime: 1000 * 10,           // 10 seconds - short to catch missed events
  refetchInterval: 1000 * 15,      // Poll every 15 seconds as fallback
  refetchOnMount: true,            // Refetch when returning to page
  refetchOnReconnect: true,        // Refetch when connection restored
})
```

**2. Client-Side: Realtime Subscriptions**

We use Supabase's **Broadcast** feature (not Postgres Changes) for reliability:

```typescript
// Subscribe to workspace events
const channel = supabase
  .channel(`workspace:${workspaceId}`)
  .on('broadcast', { event: 'workspace_event' }, (payload) => {
    // Invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })
  .subscribe()

// Always cleanup on unmount
return () => supabase.removeChannel(channel)
```

**3. Server-Side: Broadcasting Events**

After any mutation, broadcast an event to notify all subscribers:

```typescript
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'

// After creating/updating a document
await broadcastDocumentEvent(
  supabase,
  documentId,
  workspaceId,
  'document.created',
  {
    documentId,
    workspaceId,
    name: document.name,
    action: 'created'
  },
  userId
)
```

### Event Types

All events follow the pattern `{entity}.{action}`:

**Workspace Events:**
- `workspace.updated` - Workspace metadata changed
- `workspace.archived` - Workspace archived
- `workspace.restored` - Workspace restored

**Member Events:**
- `member.added` - User added to workspace
- `member.removed` - User removed from workspace
- `member.updated` - Member role changed

**Document Events:**
- `document.created` - New document created
- `document.updated` - Document metadata updated (name, folder)
- `document.archived` - Document moved to archive
- `document.restored` - Document restored from archive
- `document.deleted` - Document permanently deleted

**Folder Events:**
- `folder.created` - New folder created
- `folder.updated` - Folder metadata updated
- `folder.deleted` - Folder deleted

### Implementation Checklist

When adding new features that modify data:

- [ ] Add React Query configuration with polling fallback
- [ ] Set up Realtime subscription on client
- [ ] Add cleanup function to remove subscription on unmount
- [ ] Broadcast event after mutation on server
- [ ] Invalidate or refetch relevant queries on event receipt
- [ ] Test with tab backgrounding and navigation

### Best Practices

**DO:**
- ✅ Always implement cleanup functions for subscriptions
- ✅ Use Broadcast feature for reliability over Postgres Changes
- ✅ Combine Realtime with React Query polling (10-15 second interval)
- ✅ Set `refetchOnMount: true` to catch missed events
- ✅ Broadcast events after every mutation
- ✅ Invalidate queries when events are received

**DON'T:**
- ❌ Rely solely on WebSocket connections
- ❌ Use `refetchOnMount: false` for realtime data
- ❌ Forget to broadcast events after mutations
- ❌ Create excessive subscriptions (group related events)
- ❌ Use Postgres Changes for critical updates (less reliable)

### Channel Naming

We use consistent channel patterns defined in `/lib/realtime/types.ts`:

```typescript
const CHANNEL_PATTERNS = {
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  document: (documentId: string) => `document:${documentId}`,
}
```

### Debugging Realtime Issues

**Enable console logging:**
```typescript
console.log('[Realtime] Subscribed to workspace:', workspaceId)
console.log('[Realtime] Event received:', event.type, payload)
```

**Check subscription status:**
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('✅ Connected')
  } else if (status === 'CHANNEL_ERROR') {
    console.log('❌ Failed to subscribe')
  }
})
```

**Verify events are broadcast:**
- Check server logs for broadcast calls
- Verify channel names match between client and server
- Ensure user has permission to access the channel (RLS policies)

### Further Reading

- [Supabase Realtime Best Practices](https://supabase.com/docs/guides/realtime)
- [React Query Polling Strategy](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
- Implementation details: `/simple-client/src/lib/realtime/README.md`

## Viewing Backend Logs

The backend uses a structured logger that writes to both stdout and a rotating log file. This makes it easy to inspect server-side logs when debugging issues.

**Log Locations:**

- **Console**: Pretty-printed logs appear in your terminal when running `yarn workspace simple-dotcom dev`
- **File**: JSON-formatted logs are appended to `apps/simple-dotcom/.logs/backend.log`

**Viewing Recent Logs:**

To see the last 200 lines of backend logs:

```bash
tail -n 200 apps/simple-dotcom/.logs/backend.log
```

Or to follow logs in real-time:

```bash
tail -f apps/simple-dotcom/.logs/backend.log
```

**Log Format:**

Log entries are structured JSON with the following fields:

- `level`: Log level (info, warn, error, debug)
- `time`: ISO timestamp
- `msg`: Human-readable message
- Context-specific fields (route, user_id, error details, etc.)

**Notes:**

- Log files are created on first server startup and persist across process restarts
- The `.logs/` directory is git-ignored and will not be committed
- Logs are not automatically rotated - the file grows indefinitely (suitable for development)
- For production, consider implementing proper log rotation or using a log management service

## Delivery Workflow

1. **Plan via milestones**: Confirm which milestone you are executing (`MILESTONES.md`). Do not pull tickets from later milestones until current exit criteria are satisfied.
2. **Work from tickets**:
   - Each ticket in `tickets/` references a requirement ID from `SPECIFICATION.md`. Ensure acceptance criteria trace back to the spec (e.g., `AUTH-01`, `DOC-03`).
   - When creating a new ticket, copy `tickets/TEMPLATE.md`, fill in the metadata, and list relevant sections in the **Related Documentation** field (pointing to `SPECIFICATION.md` headings).
   - Update status checkboxes and dates as work progresses.
   - Use the **Worklog** section to track progress, decisions, and blockers with dated entries as work proceeds.
   - Use the **Open questions** section to capture unresolved issues or areas needing clarification; remove items as they are answered.
3. **Implement using the spec**:
   - Product scope: see **MVP Requirements** in `SPECIFICATION.md` for the authoritative feature list, user roles, and limits.
   - Technical direction: follow the same document's architecture, data model, API surface, sync worker plan, and security/testing strategies.
   - Open questions or new decisions should be recorded back in the spec's **Open Questions & Outstanding Decisions** section.
4. **Review & QA**:
   - Align test coverage with `SPECIFICATION.md` → **Testing Strategy** and milestone expectations. Add or update Playwright, integration, and unit tests as features are implemented.
   - Document manual verification steps in the related ticket for future regressions.
5. **Bug Triage** (after each ticket):
   - Check the `bugs/` folder for new bug reports
   - Assign priority: Critical/Blocking, High, Medium, or Low
   - Update `MILESTONES.md` to incorporate the bug based on priority
   - Fix Critical/Blocking bugs immediately before proceeding to the next task
   - Our team philosophy: **fix bugs between tasks** rather than accumulating them for the end of a milestone. We are very fast at bug fixes and prefer this "fix as we go" approach to keep the codebase healthy.

## Reporting Bugs

**For Users:**
To report a bug, use the `/bug` slash command followed by a description of the issue:

```
/bug Dashboard crashes when clicking 'New Workspace' button. User was logged in,
navigated to dashboard, clicked button in top-right. Browser console shows
TypeError: Cannot read property 'id' of undefined
```

**For Agents:**
When you encounter a bug during your work, delegate to the **bug-report-generator agent** using the Task tool. This is **FIRE-AND-FORGET** - do not wait for the agent to complete. Continue with your work immediately.

```typescript
// Delegate bug report creation to specialist agent (fire-and-forget)
Task({
  subagent_type: "bug-report-generator",
  description: "Report dashboard crash bug",
  prompt: `Create a bug report for the following issue:

  Dashboard crashes when clicking 'New Workspace' button. User was logged in,
  navigated to dashboard, clicked button in top-right. Browser console shows
  TypeError: Cannot read property 'id' of undefined

  Additional context: [any relevant details about state, recent changes, etc.]`
})

// Then immediately continue with your current task - don't wait!
```

**What to include in your bug description:**
- Clear description of the bug
- State of the app when you observed it (logged in/out, which page, what actions)
- Error messages from browser console or UI
- Steps that led to the bug
- Any additional context (recent changes, affected files, etc.)

**What NOT to do:**
- Don't investigate or analyze the root cause yourself (unless you're the bug-report-generator agent)
- Don't manually check logs or stack traces
- Don't try to diagnose the issue
- Don't get sidetracked from your current task

The **bug-report-generator agent** will automatically:
- Check backend logs for related errors
- Extract stack traces and error details
- Determine severity and priority
- Assign the next bug number
- Create a properly formatted bug report in `bugs/BUG-XX-description.md`
- Perform initial root cause analysis

Just describe what you observed, delegate to the bug-report-generator agent, and continue with your work.
6. **Ship**:
   - Use milestone exit criteria to confirm readiness.
   - Summarize spec deltas, tests run, and outstanding risks in your PR description.

## Agent Workflow Guide

- Treat `SPECIFICATION.md` as your contract. Before acting on a request, restate the relevant requirement IDs, assumptions, and affected sections to the user. Call out any ambiguity so the spec can be updated.
- Cross-check `MILESTONES.md` to ensure work aligns with the current milestone. If a request falls outside scope, flag it and propose a ticket move or spec change.
- When drafting or completing tickets, mirror the workflow expected of human contributors: note assumptions, list tests run (or not run), and reference spec sections by heading name.
- Prefer non-destructive exploration commands (read-only listing, `rg`, etc.) unless the user explicitly requests edits. Announce planned file changes before executing them.
- After making changes, provide a concise diff-oriented summary, validation results, and next-step suggestions so humans can review quickly.
- Keep documentation synchronized. Any decision, workaround, or clarification uncovered while assisting must be reflected in `SPECIFICATION.md`, `MILESTONES.md`, or the relevant ticket before handing off.

## Updating Documentation

- **SPECIFICATION.md**: Update whenever requirements, architecture, or decisions change. Treat it as the contract for the product and engineering teams.
- **MILESTONES.md**: Adjust ticket groupings or exit criteria if sequencing changes; keep history via git so the plan is auditable.
- **Secondary sources**: Only touch when archiving new background material. Annotate the spec with references instead of duplicating content here.
- **Tickets**: Keep statuses, acceptance criteria, and dependencies current. Close the loop by linking code changes and noting validation steps.

## Additional Notes

- Design artifacts (like `landing-page-signed-out.png`) should be stored in this folder and referenced from tickets/spec as needed.
- If you add new tooling (scripts, config, CI), note the workflow in this README and cross-link to the relevant spec section.
- Prefer workspace-aware Yarn commands (`yarn workspace <package> <script>`) to keep dependency management centralized.

This README is intentionally lightweight. If a contributor cannot accomplish a task using this guide plus `SPECIFICATION.md`, update the documentation so the next person can.

For Better Auth, see the [Better Auth documentation](https://www.better-auth.com/llms.txt).
For Supabase, see the [Supabase documentation](https://supabase.com/docs).
For Cloudflare, see the [Cloudflare documentation](https://developers.cloudflare.com/workers/runtime-apis/overview).
For R2, see the [R2 documentation](https://developers.cloudflare.com/r2/reference).
