# Real-time Update Architecture

This directory contains the real-time update architecture for non-canvas changes in the Simple Dotcom application.

## Overview

The real-time system uses Supabase Realtime to broadcast and receive updates for workspace-level changes including:
- Workspace metadata updates
- Membership changes
- Document CRUD operations (metadata only, not canvas)
- Folder hierarchy changes

## Architecture Decisions

### Channel Structure

We use a **workspace-level channel** pattern:
- Channel name: `workspace:{workspace_id}`
- All updates for a workspace flow through this single channel
- Document-specific channels are NOT used (reserved for future canvas sync)

This minimizes connection overhead and simplifies subscription management.

### Event Format

All events follow a standard structure:
```typescript
{
  type: 'document.created' | 'member.added' | ...,
  payload: { /* event-specific data */ },
  timestamp: '2025-10-05T12:34:56Z',
  actor_id: 'user-uuid'
}
```

### Security

- Supabase RLS policies control channel access
- Users can only subscribe to workspaces they have access to
- Events never leak data across workspace boundaries

## Usage

### Client-Side: Subscribing to Updates

Use the `useWorkspaceRealtimeUpdates` hook with React Query for the hybrid realtime strategy:

```typescript
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'
import { useQueryClient } from '@tanstack/react-query'

function WorkspaceDocuments({ workspaceId }) {
  const queryClient = useQueryClient()

  // Hybrid strategy: React Query polling + Realtime for instant updates
  const { data: documents } = useQuery({
    queryKey: ['workspace-documents', workspaceId],
    queryFn: fetchDocuments,
    staleTime: 1000 * 10,        // 10 seconds
    refetchInterval: 1000 * 15,  // Poll every 15 seconds
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  // Subscribe to all workspace events with single onChange callback
  useWorkspaceRealtimeUpdates(workspaceId, {
    onChange: () => {
      // Invalidate queries to trigger refetch for any workspace event
      queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspaceId] })
    },
  })
}
```

This simplified pattern handles all event types (documents, folders, members, workspace) with a single callback. The hybrid approach (Broadcast + polling) ensures missed events are caught even if connections drop.

### Server-Side: Broadcasting Events

After mutations, broadcast events to notify subscribers:

```typescript
import { broadcastWorkspaceEvent } from '@/lib/realtime'

// In API route after creating a document
await broadcastWorkspaceEvent(
  supabaseAdmin,
  workspaceId,
  'document.created',
  {
    documentId: newDoc.id,
    workspaceId,
    name: newDoc.name,
    action: 'created'
  },
  userId
)
```

## Event Types

### Workspace Events
- `workspace.updated` - Workspace metadata changed
- `workspace.archived` - Workspace archived
- `workspace.restored` - Workspace restored from archive

### Member Events
- `member.added` - User added to workspace
- `member.removed` - User removed from workspace
- `member.updated` - Member role changed

### Document Events
- `document.created` - New document created
- `document.updated` - Document metadata updated (name, folder)
- `document.archived` - Document moved to archive
- `document.restored` - Document restored from archive
- `document.deleted` - Document permanently deleted

### Folder Events
- `folder.created` - New folder created
- `folder.updated` - Folder metadata updated
- `folder.deleted` - Folder deleted

## Reconnection Strategy

The hooks automatically handle reconnection:
1. Supabase Realtime reconnects automatically
2. The hook detects tab visibility changes and triggers `onChange`
3. React Query polling (15s intervals) catches any missed events
4. `refetchOnMount` and `refetchOnReconnect` provide additional safety nets
5. We don't attempt to replay missed events - instead we refetch current state

## Testing

Unit tests for broadcast utilities can mock the Supabase client.
Integration tests should verify end-to-end subscription flows.

## Future Enhancements

Post-MVP considerations:
- Event ordering guarantees (if needed)
- Event batching for performance
- Separate document channels for canvas sync
- Presence indicators for active users