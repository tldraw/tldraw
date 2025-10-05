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

Use the provided hooks in React components:

```typescript
import { useWorkspaceRealtimeUpdates } from '@/hooks'

function WorkspaceView({ workspaceId }) {
  // Subscribe to all workspace events
  useWorkspaceRealtimeUpdates(workspaceId, {
    onDocumentChange: (event) => {
      // Handle document updates
      refetchDocuments()
    },
    onMemberChange: (event) => {
      // Handle member updates
      refetchMembers()
    },
    onReconnect: () => {
      // Refetch data after reconnection
      refetchAll()
    }
  })
}
```

Or use the specialized document list hook:

```typescript
import { useDocumentListRealtimeUpdates } from '@/hooks'

function DocumentList({ workspaceId }) {
  useDocumentListRealtimeUpdates(workspaceId, {
    onDocumentCreated: (documentId, name) => {
      // Add to local state
    },
    onDocumentDeleted: (documentId) => {
      // Remove from local state
    }
  })
}
```

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
2. On reconnect, the `onReconnect` callback fires
3. UI components should refetch current state to catch missed updates
4. We don't attempt to replay missed events

## Testing

Unit tests for broadcast utilities can mock the Supabase client.
Integration tests should verify end-to-end subscription flows.

## Future Enhancements

Post-MVP considerations:
- Event ordering guarantees (if needed)
- Event batching for performance
- Separate document channels for canvas sync
- Presence indicators for active users