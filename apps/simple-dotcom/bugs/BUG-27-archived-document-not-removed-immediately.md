# BUG-14: Archived Document Not Removed Immediately from Document List

**Status:** New
**Severity:** Medium
**Category:** Documents / Real-time Updates
**Date reported:** 2025-10-05

## Description

When archiving a document from the workspace documents view (`/workspace/[workspaceId]` page), the archived document remains visible in the document list until the page is manually refreshed. The document should disappear immediately after archiving, similar to how it works in the dashboard and workspace browser views.

## Steps to Reproduce

1. Navigate to a workspace page (`/workspace/[workspaceId]`)
2. Click the archive action on any document
3. Observe the document list

**Expected behavior:** The archived document should immediately disappear from the active documents list.

**Actual behavior:** The archived document remains visible in the list. Only after refreshing the page does it disappear.

## Root Cause Analysis

The issue is in `simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx`:

### Problem 1: Wrong API endpoint (lines 111-135)
The `handleArchiveDocument` function calls `DELETE /api/documents/:id` instead of `POST /api/documents/:id/archive`:

```typescript
const handleArchiveDocument = async (documentId: string) => {
    try {
        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE',  // ❌ Wrong - this is soft delete, not archive
        })
        // ...
        // Update document to archived state
        setDocuments((prev) =>
            prev.map((doc) =>
                doc.id === documentId
                    ? { ...doc, is_archived: true, archived_at: new Date().toISOString() }
                    : doc
            )
        )
    }
}
```

This endpoint updates `is_archived` in the database, but the component then updates local state incorrectly - it marks the document as archived but doesn't remove it from the visible list.

### Problem 2: Missing realtime subscription
Unlike `dashboard-client.tsx` (lines 96-190) and `workspace-browser-client.tsx` (lines 36-102), the `workspace-documents-client.tsx` component does NOT subscribe to realtime database changes. It should be using the Supabase realtime subscription to listen for document UPDATE events and remove documents when `is_archived` becomes true.

### Comparison with working implementations

**Dashboard** (dashboard-client.tsx:128-160) - WORKS:
```typescript
.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
}, (payload) => {
    const updatedDoc = payload.new as Document
    // Remove if archived ✅
    if (updatedDoc.is_archived) {
        return {
            ...ws,
            documents: ws.documents.filter((doc) => doc.id !== updatedDoc.id),
        }
    }
})
```

**Workspace Browser** (workspace-browser-client.tsx:60-80) - WORKS:
```typescript
.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `workspace_id=eq.${workspace.id}`,
}, (payload) => {
    const updatedDoc = payload.new as Document
    setDocuments((prev) => {
        // Remove if archived ✅
        if (updatedDoc.is_archived) {
            return prev.filter((doc) => doc.id !== updatedDoc.id)
        }
        // Update existing
        return prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
    })
})
```

## Affected Files

- `simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx:111-135` - Wrong endpoint and missing realtime subscription
- `simple-client/src/app/workspace/[workspaceId]/page.tsx` - Parent component that renders workspace-documents-client

## Suggested Fix

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

## Testing Notes

After fix, verify:
- Document immediately disappears when archived
- Document reappears immediately when restored
- Multiple browser tabs stay in sync (realtime updates work cross-tab)
- Test with both workspace browser and workspace documents views

## Related Issues

- Similar pattern should be verified in other document list views
- Consider creating a shared `useDocumentRealtimeUpdates` hook to avoid duplication (note: `useDocumentListRealtimeUpdates` already exists but is not used in this component!)

## Additional Context

The `useDocumentListRealtimeUpdates` hook at `simple-client/src/hooks/useDocumentListRealtimeUpdates.ts` already exists and provides exactly this functionality. The workspace-documents-client component should use this hook instead of reimplementing the subscription logic.
