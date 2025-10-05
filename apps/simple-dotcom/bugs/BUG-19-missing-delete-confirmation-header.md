# BUG-06: Missing Delete Confirmation Header in Workspace Browser

**Status:** Open
**Priority:** High
**Found By:** Code Review
**Affects:** Document deletion from workspace browser page

## Problem

When clicking "Delete permanently" from the three-dot menu on a document card in the workspace browser page, the delete request fails because the required `X-Confirm-Delete: true` header is missing from the API call. This causes the hard delete functionality to fail silently for users.

## Steps to Reproduce

1. Navigate to workspace browser page (`/workspace/[workspaceId]`)
2. Locate any document card
3. Click the three-dot menu (⋮) on the document card
4. Click "Delete permanently"
5. Observe that the delete operation fails

## Expected Result

The document should be permanently deleted from the database when "Delete permanently" is clicked, and the document should disappear from the UI.

## Actual Result

The API request fails with error: "Confirmation header X-Confirm-Delete: true is required for hard delete"

## Root Cause Analysis

The API route `/api/documents/[documentId]/delete` requires a confirmation header for hard delete operations:

**API Route** (`src/app/api/documents/[documentId]/delete/route.ts:26-33`):
```typescript
// Require confirmation header for hard delete
const confirmHeader = request.headers.get('X-Confirm-Delete')
if (confirmHeader !== 'true') {
  return NextResponse.json(
    { success: false, error: { code: 'MISSING_CONFIRMATION', message: 'Confirmation header X-Confirm-Delete: true is required for hard delete' } },
    { status: 400 }
  )
}
```

The workspace archive page correctly includes this header, but the workspace browser page does not.

## Affected Code

### Working Implementation (Archive Page)
`src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx:58-63`
```tsx
const res = await fetch(`/api/documents/${documentId}/delete`, {
  method: 'DELETE',
  headers: {
    'X-Confirm-Delete': 'true',
  },
})
```

### Broken Implementation (Browser Page)
`src/app/workspace/[workspaceId]/workspace-browser-client.tsx:230-246`
```tsx
const handleDeleteDocument = async (documentId: string) => {
  try {
    setDeletingDocumentId(documentId)

    const response = await fetch(`/api/documents/${documentId}/delete`, {
      method: 'DELETE',
      // ← MISSING: headers: { 'X-Confirm-Delete': 'true' }
    })

    if (!response.ok) {
      throw new Error('Failed to delete document')
    }

    // ... success handling
  } catch (error) {
    // ... error handling
  }
}
```

### Document Actions Component
`src/components/documents/DocumentActions.tsx:119-141`

The "Delete permanently" action calls the `onDelete` prop, which is the broken `handleDeleteDocument` function from workspace-browser-client.tsx.

## Proposed Solution

Update the `handleDeleteDocument` function in `workspace-browser-client.tsx` to include the confirmation header:

```tsx
const response = await fetch(`/api/documents/${documentId}/delete`, {
  method: 'DELETE',
  headers: {
    'X-Confirm-Delete': 'true',
  },
})
```

This matches the working implementation in the archive page and satisfies the API route's requirement.

## Files Affected

1. **Primary Fix Required:**
   - `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx` (lines 230-246)

2. **Reference Implementation (working):**
   - `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx` (lines 58-63)

3. **API Route (validation logic):**
   - `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/api/documents/[documentId]/delete/route.ts` (lines 26-33)

4. **UI Component (trigger point):**
   - `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/documents/DocumentActions.tsx` (lines 119-141)

## Impact

- **User Experience**: Users cannot permanently delete documents from the main workspace browser page
- **Functionality**: Hard delete feature is broken in the primary document management interface
- **Inconsistency**: Archive page works correctly but browser page does not
- **Data Management**: Users may accumulate unwanted documents because deletion fails

## Related Issues/Tickets

- WS-04: Workspace Archive Management (contains working implementation)
- SEC-01: Rate Limiting (both tickets completed in same commit)
