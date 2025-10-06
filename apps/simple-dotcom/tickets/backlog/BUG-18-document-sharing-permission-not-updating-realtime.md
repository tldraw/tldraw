# [BUG-18]: Document Sharing Permission Changes Not Updating Realtime for Guest Users

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 

## Status

- [x] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When a workspace member changes a document's sharing mode (from public editable to private, or from public editable to public read-only), the access change does not immediately reflect for guest users (unauthenticated or non-workspace-member users) who have the document open in another browser window (e.g., incognito mode). The guest user continues to see the old permission state (e.g., "Public - Editable" when it should now be "Private" or "Public - Read Only"). Only after manually refreshing the page does the correct permission state appear.

This indicates that document sharing permission changes are not being broadcast via the realtime system to guest users who are currently viewing the document.

## Steps to Reproduce

1. As a workspace member, create or open a document
2. Set the document sharing mode to "public_editable"
3. In an incognito window (or not logged in), open the same document using its public URL (`/d/[documentId]`)
4. Verify the document shows "Public - Editable" status in the header
5. Back in the member window, change the document sharing mode to "private" or "public_read_only"
6. Observe the incognito window - the status does NOT update automatically
7. Refresh the incognito window
8. Now the status correctly shows the new sharing mode

## Expected Behavior

When a workspace member changes a document's sharing mode, all users currently viewing that document (including guest users) should immediately see the updated access status without needing to manually refresh the page. The UI should update in real-time to reflect:
- Access status text (e.g., "Public - Editable" → "Public - Read Only" or "Private")
- Canvas edit permissions (if applicable)
- Potentially a notification or message indicating the change

## Actual Behavior

- Guest users viewing a document see the old sharing permission status
- The status only updates after a manual page refresh
- No realtime notification of the permission change is received

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- `simple-client/src/app/api/documents/[documentId]/share/route.ts` - Missing broadcast after sharing mode update
- `simple-client/src/app/d/[documentId]/document-view-client.tsx` - Guest view component that should react to realtime changes
- `simple-client/src/hooks/useWorkspaceRealtimeUpdates.ts` - Workspace-level subscription (not document-level)
- `simple-client/src/lib/realtime/types.ts` - Defines event types and channel patterns
- `supabase/migrations/20251004152910_tech_01_base_schema.sql` - No triggers for document update broadcasts

## Possible Cause

The document sharing update API does **not broadcast a realtime event** when the `sharing_mode` is changed.

**Root Cause:**
1. The API route updates the database but does not broadcast a realtime event
2. No realtime subscription exists for document-level events that guest users could listen to
3. Guest users cannot subscribe to workspace channels due to access restrictions

**Evidence** (`simple-client/src/app/api/documents/[documentId]/share/route.ts:66-79`):
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

// No broadcast call is made after updating the document
return successResponse<Document>(updated)
```

## Proposed Solution

### Option 1: Add Document-Level Realtime Subscription (Recommended)

1. Create a `useDocumentRealtimeUpdates` hook that subscribes to `document:{documentId}` channel
2. Update the sharing API route to broadcast a `document.sharing_updated` event after updating the database
3. Update `document-view-client.tsx` to use the new hook and react to sharing changes
4. Ensure RLS policies allow guest users to subscribe to document channels for public documents

### Option 2: Use Workspace Broadcast with Guest Access

1. Allow guest users to subscribe to workspace channels for documents they're viewing
2. Broadcast sharing changes to workspace channel
3. Update RLS to allow read-only subscription for users viewing public documents

**Note:** Option 2 is more complex and may have security implications.

## Related Issues

- Related to: COLLAB-01 (Real-time editing), PERM-01 (RLS policies)

## Worklog

**2025-10-05:**
- Bug discovered during manual testing of sharing feature
- No error logs exist because system lacks realtime broadcast feature
- Should be fixed before COLLAB-01 to ensure permission changes propagate during collaboration

## Resolution

Pending implementation.
