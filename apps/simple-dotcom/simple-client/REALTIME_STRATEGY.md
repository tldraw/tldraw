# Realtime Data Updates Strategy

This document explains how Simple Dotcom keeps the UI synchronized with backend data changes using a **hybrid realtime approach**.

## Overview

The application uses a dual-layer synchronization strategy:

1. **Supabase Realtime Broadcast** (Primary) - Instant WebSocket-based updates
2. **React Query Polling** (Fallback) - Periodic refetching every 10-15 seconds

This hybrid approach ensures data consistency even when WebSocket connections are unreliable, throttled, or disconnected.

## Why Hybrid?

WebSocket-only approaches fail in common scenarios:
- Browser tab backgrounded (mobile Safari aggressively throttles)
- Network connection drops temporarily
- User navigates away and returns
- WebSocket connection not established before mutation occurs

Polling-only approaches are slow and wasteful:
- 10-15 second delays before seeing changes
- Unnecessary network requests when no changes occur

**The hybrid approach provides the best of both worlds:**
- Instant updates when WebSocket is active (95% of cases)
- Guaranteed consistency via polling (catches any missed events)

## Architecture

### Server Side: Broadcasting Events

When data changes on the server, API routes broadcast events via Supabase Realtime:

```typescript
// Example: POST /api/workspaces/{workspaceId}/documents
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'

// After creating document
await broadcastDocumentEvent(
  supabase,
  documentId,
  workspaceId,
  'document.created',
  { documentId, workspaceId, name: document.name },
  userId
)
```

**Broadcast Helpers:**
- `broadcastWorkspaceEvent()` - Workspace-level changes (rename, archive)
- `broadcastDocumentEvent()` - Document changes (create, update, archive, move)
- `broadcastFolderEvent()` - Folder changes (create, update, delete)
- `broadcastMemberEvent()` - Membership changes (add, remove, role change)

All broadcasts go to `workspace:{workspaceId}` channels.

### Client Side: React Query + Realtime Hooks

Components combine React Query for data fetching with realtime hooks for instant updates:

```typescript
// Example: Workspace documents list
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// React Query with polling fallback
const { data: documents } = useQuery({
  queryKey: ['workspace-documents', workspaceId],
  queryFn: fetchDocuments,
  staleTime: 1000 * 10,        // 10 seconds
  refetchInterval: 1000 * 15,  // Poll every 15 seconds
  refetchOnMount: true,         // Refetch when component mounts
  refetchOnReconnect: true,     // Refetch after network reconnect
})

// Realtime subscription for instant updates
useWorkspaceRealtimeUpdates(workspaceId, {
  onChange: () => {
    // Invalidate query to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspaceId] })
  },
  enabled: true,
})
```

## Implementation Patterns

### Pattern 1: Workspace-Level Data (Dashboard)

**Use Case:** Workspace list, workspace metadata

```typescript
// Dashboard component
const { data } = useQuery({
  queryKey: ['dashboard', userId],
  queryFn: fetchDashboard,
  staleTime: 1000 * 10,
  refetchInterval: 1000 * 15,
  refetchOnMount: true,
})

useDashboardRealtimeUpdates(userId, workspaceIds, {
  onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
})
```

### Pattern 2: Workspace Content (Documents/Folders)

**Use Case:** Document list within a workspace

```typescript
// Workspace section component
const { data: documents } = useQuery({
  queryKey: ['workspace-documents', workspaceId],
  queryFn: fetchDocuments,
  staleTime: 1000 * 10,
  refetchInterval: 1000 * 15,
  refetchOnMount: true,
})

useWorkspaceRealtimeUpdates(workspaceId, {
  onChange: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspaceId] })
    queryClient.invalidateQueries({ queryKey: ['workspace-folders', workspaceId] })
  }
})
```

### Pattern 3: Mutation with Immediate Feedback

**Use Case:** Creating a workspace, adding a document

```typescript
// Create workspace handler
const handleCreateWorkspace = async () => {
  setLoading(true)

  const response = await fetch('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name: workspaceName })
  })

  if (response.ok) {
    // Immediately refetch to show new workspace
    await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
    // Broadcast will also trigger updates for other clients
  }

  setLoading(false)
}
```

**Note:** The creating client refetches immediately. The broadcast ensures OTHER clients see the change instantly.

## Event Types

All events follow the `{resource}.{action}` naming convention:

**Workspace Events:**
- `workspace.created` - New workspace created
- `workspace.updated` - Workspace renamed or metadata changed
- `workspace.archived` - Workspace soft-deleted
- `workspace.restored` - Workspace unarchived

**Document Events:**
- `document.created` - New document created
- `document.updated` - Document renamed or metadata changed
- `document.moved` - Document moved to different folder
- `document.archived` - Document archived
- `document.restored` - Document unarchived
- `document.deleted` - Document permanently deleted

**Folder Events:**
- `folder.created` - New folder created
- `folder.updated` - Folder renamed or moved
- `folder.deleted` - Folder deleted

**Member Events:**
- `member.added` - New member joined workspace
- `member.removed` - Member left or was removed
- `member.updated` - Member role changed

## Channel Naming

Channels follow consistent naming patterns:

- **Workspace channels:** `workspace:{workspaceId}`
- **Document channels:** `document:{documentId}` (reserved for canvas sync)

All workspace-related events (documents, folders, members, workspace metadata) broadcast to the workspace channel.

## Troubleshooting

### Updates Not Appearing

1. **Check React Query polling is enabled:**
   - `refetchInterval` should be set (10-15 seconds)
   - `refetchOnMount: true` ensures fresh data on navigation

2. **Verify broadcast is called in API route:**
   - Check server logs for broadcast events
   - Ensure `broadcastWorkspaceEvent()` is called AFTER mutation succeeds
   - Fire-and-forget broadcasts (don't await) to avoid blocking responses

3. **Confirm realtime hook is subscribed:**
   - Check browser console for Supabase channel subscription
   - Verify workspace ID is valid and not null

### Broadcast Not Reaching Clients

1. **Ensure Supabase Realtime is enabled:**
   - Check `supabase/config.toml`: `[realtime] enabled = true`
   - For local development: ensure Supabase is running (`supabase start`)

2. **Verify admin client is used for broadcasts:**
   - Broadcasts require service role key (admin client)
   - Never broadcast from user-authenticated client

3. **Check channel naming consistency:**
   - Server broadcasts to: `workspace:{workspaceId}`
   - Client subscribes to: `CHANNEL_PATTERNS.workspace(workspaceId)`
   - These must match exactly

## Performance Considerations

**Polling Frequency:**
- 15 seconds is optimal for balance of freshness and server load
- Shorter intervals increase server load significantly
- Longer intervals make UI feel stale

**Query Invalidation vs Refetch:**
- `invalidateQueries()` - Marks data stale, refetches on next render
- `refetchQueries()` - Immediately refetches (use sparingly)
- Prefer `invalidateQueries()` for broadcasts (async updates)
- Use `refetchQueries()` only for mutations in current client

**Subscription Cleanup:**
- Always unsubscribe in `useEffect` cleanup
- Supabase limits concurrent channels per client (check docs)
- Remove channels on unmount to prevent memory leaks

## Testing

E2E tests verify the hybrid realtime strategy works correctly:

```typescript
// Create workspace and verify UI updates
test('should create workspace and see it appear', async ({ page }) => {
  await page.click('[data-testid="create-workspace"]')
  await page.fill('[data-testid="workspace-name"]', 'Test Workspace')
  await page.click('[data-testid="confirm"]')

  // Wait for modal to close (confirms refetch completed)
  await page.waitForSelector('[data-testid="workspace-name"]', { state: 'hidden' })

  // Verify workspace appears in list
  await expect(page.locator('text=Test Workspace')).toBeVisible({ timeout: 10000 })
})
```

The 10-second timeout accounts for:
- API request (1-2 seconds)
- React Query refetch (1-2 seconds)
- React re-render (< 100ms)
- Polling fallback (up to 15 seconds, but not needed if broadcast works)

## Future Optimizations

1. **Optimistic Updates:**
   - Update UI immediately on mutation
   - Rollback if server request fails
   - Requires more complex error handling

2. **Selective Invalidation:**
   - Parse broadcast payload to determine what changed
   - Only invalidate affected queries
   - Reduces unnecessary refetches

3. **Presence Tracking:**
   - Show who's viewing/editing documents
   - Use Supabase Presence API
   - Already available but not yet implemented
