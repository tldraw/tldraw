# [BUG-27]: Archived Document Not Removed Immediately from Document List

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
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

Description needed

## Steps to Reproduce

1. Navigate to a workspace page (`/workspace/[workspaceId]`)
2. Click the archive action on any document
3. Observe the document list

**Expected behavior:** The archived document should immediately disappear from the active documents list.

**Actual behavior:** The archived document remains visible in the list. Only after refreshing the page does it disappear.

## Expected Behavior

What should happen:

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- `simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx:111-135` - Wrong endpoint and missing realtime subscription
- `simple-client/src/app/workspace/[workspaceId]/page.tsx` - Parent component that renders workspace-documents-client

## Possible Cause

The issue is in `simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx`:

## Proposed Solution

1. **Change API endpoint**: Update `handleArchiveDocument` to call `POST /api/documents/:id/archive` instead of `DELETE /api/documents/:id`

2. **Add realtime subscription**: Implement Supabase realtime subscription similar to `workspace-browser-client.tsx`:
   ```typescript
   useEffect(() => {
       const supabase = getBrowserClient()
       const channel = supabase
           .channel(`workspace-documents-${workspace.id}`)
           .on('postgres_changes', {
               event: 'UPDATE',
               schema: 'public',
               table: 'documents',
               filter: `workspace_id=eq.${workspace.id}`,
           }, (payload) => {
               const updatedDoc = payload.new as Document
               setDocuments((prev) => {
                   if (updatedDoc.is_archived) {
                       return prev.filter((doc) => doc.id !== updatedDoc.id)
                   }
                   return prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
               })
           })
           .subscribe()

       return () => { supabase.removeChannel(channel) }
   }, [workspace.id])
   ```

3. **Remove manual state update**: The realtime subscription will handle the state update, so remove the manual `setDocuments` call from `handleArchiveDocument`.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

## Resolution

Description of how the bug was fixed, or why it was closed without fixing.
