# BUG-06: Dashboard Document List Missing Actions Menu

**Date reported:** 2025-10-05
**Status:** New
**Severity:** Medium
**Category:** Dashboard UI
**Reporter:** User

---

## Summary

Document list items in the dashboard sidebar lack a three-dot menu (kebab menu) for accessing document actions like rename, duplicate, and archive. The workspace documents view has this functionality via `DocumentActions` component, but the dashboard sidebar documents are simply links without any action menu.

---

## Description

In the dashboard sidebar, documents are displayed as simple links within each workspace's collapsible section. Unlike the full workspace document view (which uses `DocumentListItem` component with `DocumentActions`), the dashboard sidebar documents don't have any way to perform actions without first navigating to the document or workspace.

The workspace view implementation shows documents with:
- Three-dot menu (kebab menu) that appears on hover
- Actions: Rename, Duplicate, Archive, Restore, Delete (permission-based)
- Implemented via `DocumentActions` component

The dashboard sidebar implementation shows documents as:
- Plain links with emoji icon and name
- No actions menu available
- User must navigate away to perform any document operations

---

## Steps to Reproduce

1. Log in and navigate to dashboard
2. Expand a workspace in the sidebar that contains documents
3. Hover over a document in the list
4. Observe: No three-dot menu or action buttons appear
5. Compare to: Navigate to workspace view → Documents tab → Hover over document → Three-dot menu appears

---

## Expected Behavior

Document list items in the dashboard sidebar should display a three-dot menu (similar to workspace document view) that provides quick access to document actions:
- Rename
- Duplicate
- Archive (for active documents)
- Restore (for archived documents)
- Delete permanently (for owners only)

The menu should appear on hover, similar to how it works in `DocumentListItem`.

---

## Actual Behavior

Documents in the dashboard sidebar are rendered as plain links without any action menu. Users cannot perform document operations from the dashboard and must navigate to the workspace or document first.

---

## Affected Files

- `simple-client/src/app/dashboard/dashboard-client.tsx:560-569` - Document rendering in sidebar (simple Link components)
- `simple-client/src/components/documents/DocumentListItem.tsx:116-128` - Reference implementation with DocumentActions
- `simple-client/src/components/documents/DocumentActions.tsx` - Reusable actions menu component

---

## Technical Details

### Current Dashboard Implementation (Lines 560-569)

```tsx
{documents.map((doc) => (
  <Link
    key={doc.id}
    href={`/d/${doc.id}`}
    className="block px-2 py-1 text-sm rounded hover:bg-foreground/5"
    data-testid={`document-${doc.id}`}
  >
    📄 {doc.name}
  </Link>
))}
```

### Working Implementation in Workspace View

The workspace documents view (`workspace-documents-client.tsx`) uses `DocumentListItem` which includes:
- `DocumentActions` component with kebab menu (lines 118-127)
- Handlers for rename, duplicate, archive, restore, delete (lines 69-161)
- Permission checks for canEdit and canDelete props

---

## Analysis

The dashboard was implemented with a simplified document list for quick navigation, but this creates an inconsistent UX where users expect to be able to perform common actions from the dashboard view. The `DocumentActions` component is already built and reusable.

To fix:
1. Replace simple Link components with a lightweight version of DocumentListItem or inline DocumentActions
2. Implement/reuse handlers for document operations (handleRenameDocument, handleDuplicateDocument, etc.)
3. Add permission checks based on workspace ownership and membership
4. Handle optimistic updates or trigger refetch after document operations

---

## Possible Cause

Dashboard was built with a minimalist approach for quick workspace/document navigation. The action menu functionality exists but wasn't integrated into the dashboard sidebar view.

---

## Related Issues

- Similar to workspace browser functionality added in previous milestones
- Document CRUD operations already implemented via API routes
- Realtime updates already handle document changes in dashboard (lines 96-190)

---

## Impact

- **User Experience:** Users expect consistent document management capabilities across views
- **Efficiency:** Forces unnecessary navigation to perform common document operations
- **Consistency:** Creates UX inconsistency between dashboard and workspace document views

---

## Proposed Solution

1. Create a simplified `DashboardDocumentItem` component or adapt `DocumentListItem` for sidebar use
2. Add `DocumentActions` menu to dashboard document items
3. Implement document operation handlers in dashboard-client (similar to workspace-documents-client)
4. Ensure proper permission handling based on workspace role
5. Maintain existing realtime update behavior for seamless state sync
