# BUG-06: Document Sharing Permission Changes Not Updating Realtime for Guest Users

**Status:** New
**Date reported:** 2025-10-05
**Severity:** High
**Category:** Realtime / Document Sharing
**Reporter:** User

---

## Description

When a workspace member changes a document's sharing mode (from public editable to private, or from public editable to public read-only), the access change does not immediately reflect for guest users (unauthenticated or non-workspace-member users) who have the document open in another browser window (e.g., incognito mode). The guest user continues to see the old permission state (e.g., "Public - Editable" when it should now be "Private" or "Public - Read Only"). Only after manually refreshing the page does the correct permission state appear.

This indicates that document sharing permission changes are not being broadcast via the realtime system to guest users who are currently viewing the document.

---

## Steps to Reproduce

1. As a workspace member, create or open a document
2. Set the document sharing mode to "public_editable"
3. In an incognito window (or not logged in), open the same document using its public URL (`/d/[documentId]`)
4. Verify the document shows "Public - Editable" status in the header
5. Back in the member window, change the document sharing mode to "private" or "public_read_only"
6. Observe the incognito window - the status does NOT update automatically
7. Refresh the incognito window
8. Now the status correctly shows the new sharing mode

---

## Expected Behavior

When a workspace member changes a document's sharing mode, all users currently viewing that document (including guest users) should immediately see the updated access status without needing to manually refresh the page. The UI should update in real-time to reflect:
- Access status text (e.g., "Public - Editable" → "Public - Read Only" or "Private")
- Canvas edit permissions (if applicable)
- Potentially a notification or message indicating the change

---

## Actual Behavior

- Guest users viewing a document see the old sharing permission status
- The status only updates after a manual page refresh
- No realtime notification of the permission change is received

---

## Root Cause Analysis

### Missing Realtime Broadcast for Document Sharing Changes

The issue occurs because the document sharing update API (`/api/documents/[documentId]/share/route.ts`) does **not broadcast a realtime event** when the `sharing_mode` is changed.

**Current Flow:**
1. Member calls `PATCH /api/documents/[documentId]/share` with new `sharing_mode`
2. API updates the `documents` table in Supabase
3. API returns success
4. **No realtime event is broadcast**
5. Guest users subscribed to workspace or document channels receive no notification

**Evidence from Code:**

`simple-client/src/app/api/documents/[documentId]/share/route.ts:66-79`
```typescript
// Update sharing mode
const { data: updated, error } = await supabase
	.from('documents')
	.update({
		sharing_mode: body.sharing_mode,
		updated_at: new Date().toISOString(),
	})
	.eq('id', documentId)
	.select()
	.single()

if (error || !updated) {
	throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update sharing mode')
}

return successResponse<Document>(updated)
```

**No broadcast call is made** after updating the document. Compare this to other API routes that likely do broadcast events.

### Workspace Realtime Subscription Limitation

The realtime subscription system (`useWorkspaceRealtimeUpdates.ts`) listens to workspace-level events on channel `workspace:{workspaceId}`. However:

1. **Guest users viewing a document are NOT members of the workspace**, so they likely don't subscribe to the workspace channel (or are denied access by RLS)
2. Even if they were subscribed, the sharing change event is **not being broadcast** at all

`simple-client/src/hooks/useWorkspaceRealtimeUpdates.ts:81-93`
```typescript
const channel = supabase
	.channel(CHANNEL_PATTERNS.workspace(workspaceId))
	.on('broadcast', { event: 'workspace_event' }, handleEvent)
	.subscribe((status) => {
		if (status === 'SUBSCRIBED') {
			console.log(`Subscribed to workspace ${workspaceId} realtime updates`)
		} else if (status === 'CHANNEL_ERROR') {
			console.error(`Failed to subscribe to workspace ${workspaceId}`)
			onError?.(new Error('Failed to subscribe to realtime updates'))
		} else if (status === 'CLOSED') {
			console.log(`Channel closed for workspace ${workspaceId}`)
		}
	})
```

### Document-Level Realtime Channel Missing

From the realtime types definition (`simple-client/src/lib/realtime/types.ts`), there is a pattern for document-level channels:

```typescript
export const CHANNEL_PATTERNS = {
	workspace: (workspaceId: string) => `workspace:${workspaceId}`,
	document: (documentId: string) => `document:${documentId}`,
} as const
```

However, **no code appears to subscribe to document-level channels** (`document:{documentId}`). The `useDocumentListRealtimeUpdates` hook only subscribes to workspace-level events for document changes within a workspace list context, not for individual document viewers.

### No Database Trigger for Broadcast

The base schema migration (`supabase/migrations/20251004152910_tech_01_base_schema.sql`) does not include any database triggers to automatically broadcast events when the `documents` table is updated. All broadcasting must be done manually from API routes.

---

## Affected Files/Components

### API Routes
- `simple-client/src/app/api/documents/[documentId]/share/route.ts` - Missing broadcast after sharing mode update

### Frontend Components
- `simple-client/src/app/d/[documentId]/document-view-client.tsx` - Guest view component that should react to realtime changes
- `simple-client/src/app/d/[documentId]/page.tsx` - Document page wrapper

### Realtime Hooks
- `simple-client/src/hooks/useWorkspaceRealtimeUpdates.ts` - Workspace-level subscription (not document-level)
- `simple-client/src/hooks/useDocumentListRealtimeUpdates.ts` - Document list subscription (not individual document)
- No hook currently exists for subscribing to individual document changes

### Types
- `simple-client/src/lib/realtime/types.ts` - Defines event types and channel patterns

### Database
- `supabase/migrations/20251004152910_tech_01_base_schema.sql` - No triggers for document update broadcasts

---

## Possible Cause

The root cause is that **document sharing permission changes are not being broadcast via Supabase Realtime**. This is a missing feature in the implementation:

1. The API route updates the database but does not call `supabase.channel().send()` to broadcast an event
2. No realtime subscription exists for document-level events that guest users could listen to
3. Guest users cannot subscribe to workspace channels due to access restrictions

---

## Proposed Solution

### Option 1: Add Document-Level Realtime Subscription (Recommended)

1. **Create a `useDocumentRealtimeUpdates` hook** that subscribes to `document:{documentId}` channel
2. **Update the sharing API route** to broadcast a `document.sharing_updated` event after updating the database
3. **Update `document-view-client.tsx`** to use the new hook and react to sharing changes
4. **Ensure RLS policies** allow guest users to subscribe to document channels for public documents

**Implementation:**

`simple-client/src/hooks/useDocumentRealtimeUpdates.ts` (new file)
```typescript
export function useDocumentRealtimeUpdates(
  documentId: string | null | undefined,
  options: {
    onSharingChange?: (sharingMode: SharingMode) => void,
    onDocumentUpdate?: (updates: Partial<Document>) => void,
    enabled?: boolean
  } = {}
) {
  // Subscribe to document:{documentId} channel
  // Handle broadcast events for document.sharing_updated, document.updated, etc.
}
```

`simple-client/src/app/api/documents/[documentId]/share/route.ts`
```typescript
// After updating the document
const channel = supabase.channel(`document:${documentId}`)
await channel.send({
  type: 'broadcast',
  event: 'document_event',
  payload: {
    type: 'document.sharing_updated',
    documentId,
    sharing_mode: body.sharing_mode,
    timestamp: new Date().toISOString(),
    actor_id: user.id
  }
})
```

`simple-client/src/app/d/[documentId]/document-view-client.tsx`
```typescript
// Add hook to listen for sharing changes
useDocumentRealtimeUpdates(document.id, {
  onSharingChange: (newMode) => {
    setSharingMode(newMode)
    // Optionally show a toast notification
  },
  enabled: true
})
```

### Option 2: Use Workspace Broadcast with Guest Access

1. Allow guest users to subscribe to workspace channels for documents they're viewing
2. Broadcast sharing changes to workspace channel
3. Update RLS to allow read-only subscription for users viewing public documents

This option is more complex and may have security implications.

---

## Security Considerations

- Ensure guest users can only receive sharing change events for documents they have permission to view
- Do not leak sensitive workspace information through document channels
- Consider rate limiting realtime subscriptions to prevent abuse

---

## Additional Context

### Related Features
- Document sharing modal (in `document-view-client.tsx`)
- Workspace realtime updates system
- Document access control (RLS policies, to be implemented in PERM-01)

### Related Tickets
- COLLAB-01: Real-time editing (may implement document-level channels)
- PERM-01: RLS policies (may need updates for document channel access)

---

## Testing Recommendations

### Manual Testing
1. Two browser sessions: one as member, one as guest
2. Share document publicly, open in guest window
3. Change sharing mode in member window
4. Verify guest window updates without refresh

### Automated E2E Test
Create test in `simple-client/e2e/realtime-document-sharing.spec.ts`:
- Setup: Create workspace and document as member
- Set document to public_editable
- Open document in guest context (no auth)
- In member context, change to public_read_only
- Assert guest context receives update and UI reflects change
- Repeat for private mode change

---

## Priority Justification

**High Priority** because:
- Affects user experience significantly (confusing stale permission state)
- Security implication: guest users may attempt actions they no longer have permission for
- Will cause errors and poor UX when real-time editing (COLLAB-01) is implemented
- Simple to fix by adding broadcast calls and subscription hook

---

## Notes

- This bug was discovered during manual testing of the sharing feature
- No error logs exist because the system is "working as designed" - it just lacks the realtime broadcast feature
- This should be fixed before COLLAB-01 (real-time editing) to ensure permission changes propagate correctly during active collaboration sessions
