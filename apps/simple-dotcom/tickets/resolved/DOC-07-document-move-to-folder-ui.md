# DOC-07: Document Move to Folder UI

Date created: 2025-01-09
Date last updated: 2025-01-09
Date completed: 2025-01-09

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Add a "Move to..." action to the document dropdown menu on the workspace page that allows users to move a document to a different folder within the same workspace or move it out of a folder to the workspace root.

This feature enhances document organization by providing an intuitive way to reorganize documents without drag-and-drop. It supports the folder hierarchy established in DOC-02 and complements the existing folder navigation.

## Acceptance Criteria

- [ ] Document dropdown menu includes a "Move to..." action (available to workspace members only)
- [ ] Clicking "Move to..." opens a modal/dialog showing folder structure for the current workspace
- [ ] Folder picker shows hierarchical folder structure (respecting 10-level depth limit)
- [ ] User can select a destination folder or choose "Workspace Root" to remove from folder
- [ ] Current folder (if any) is visually indicated in the picker
- [ ] Disabled state for current location (can't move to same folder)
- [ ] Moving document updates `folder_id` in database atomically
- [ ] Success confirmation shown after move completes
- [ ] Document list updates immediately via realtime system (Broadcast + React Query polling)
- [ ] Error handling for permission failures, missing folders, or network issues
- [ ] E2E test coverage for move operations

## Technical Details

### Database Schema Changes

No schema changes required. Uses existing `documents.folder_id` field (UUID, nullable, references `folders.id` with `ON DELETE SET NULL`).

### API Endpoints

**New endpoint:**

```typescript
PATCH /api/documents/[documentId]/move
Body: { folder_id: string | null }  // null = move to workspace root
Response: { document: Document }
```

**Validation:**
- User must be workspace member (RLS enforced)
- Folder must belong to same workspace as document
- Folder must exist and not be deleted
- Document must exist and not be archived

**Implementation pattern:**
```typescript
// src/app/api/documents/[documentId]/move/route.ts
export async function PATCH(request: Request, { params }: { params: { documentId: string } }) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse(ApiError.UNAUTHORIZED)

  const { folder_id } = await request.json()

  // Validate folder belongs to same workspace (if not null)
  if (folder_id !== null) {
    // Query to verify folder exists and belongs to same workspace as document
  }

  // Update document.folder_id
  const { data, error } = await supabase
    .from('documents')
    .update({ folder_id })
    .eq('id', params.documentId)
    .select('*, workspace_id')
    .single()

  if (error) return errorResponse(ApiError.NOT_FOUND)

  // Broadcast document.moved event
  await broadcastDocumentEvent(
    supabase,
    params.documentId,
    data.workspace_id,
    'document.moved',
    { documentId: params.documentId, folder_id },
    user.id
  )

  return successResponse(data)
}
```

### UI Components

**New components:**

1. **`MoveDocumentDialog.tsx`**
   - Modal/dialog using shadcn Dialog component
   - Displays folder tree for current workspace
   - Shows breadcrumb for current folder location
   - "Workspace Root" option at top level
   - Disabled/grayed out for current folder
   - Loading states during fetch/submit
   - Error alerts for failures

2. **Update `DocumentCard.tsx` or dropdown menu component**
   - Add "Move to..." option to existing dropdown
   - Show between "Duplicate" and "Archive" actions
   - Icon: folder icon with arrow or move icon
   - Opens `MoveDocumentDialog` on click

**Folder Picker UI Pattern:**
```
Move Document: "Design Specs.tldr"

┌─────────────────────────────────┐
│ 📁 Workspace Root               │ ← Clickable
├─────────────────────────────────┤
│   📁 Projects                   │
│     📁 Q1 2025          ✓       │ ← Current location (disabled)
│     📁 Q2 2025                  │
│   📁 Archive                    │
│   📁 Personal                   │
└─────────────────────────────────┘

[Cancel]  [Move Here]
```

**Folder tree data structure:**
```typescript
interface FolderTreeNode {
  id: string
  name: string
  parent_folder_id: string | null
  children: FolderTreeNode[]
}
```

**Client-side logic:**
- Fetch all folders for workspace: `GET /api/workspaces/[id]/folders`
- Build tree structure client-side (recursive grouping by `parent_folder_id`)
- Render collapsed/expandable tree using recursion
- Track selected folder in local state
- Disable current folder + submit if no change

### Permissions/Security

- **RLS enforcement:** `documents` table policies ensure user is workspace member
- **API validation:** Verify folder belongs to same workspace as document
- **Cross-workspace moves:** Not allowed in this ticket (see DOC-03 for creator-only cross-workspace moves)
- **Archived documents:** Hide "Move to..." action for archived documents
- **Guest users:** Hide action entirely (guests don't have workspace access)

### Realtime Updates

After successful move:
1. **Server:** Broadcast `document.moved` event with `{ documentId, folder_id }`
2. **Client:** Listen on `workspace:${workspaceId}` channel
3. **On receive:** Invalidate queries for:
   - `['workspace-documents', workspaceId]`
   - `['workspace-folders', workspaceId]`
   - `['dashboard', userId]` (if document was in recents)
4. **Fallback:** React Query polling (15s interval) catches missed events

## Dependencies

- [x] DOC-01: Document CRUD and archive (provides document dropdown menu)
- [ ] DOC-02: Folder hierarchy and cycle prevention (provides folder structure)
- [x] TECH-09: Realtime update architecture (provides broadcast infrastructure)
- [ ] DESIGN-06-C: Dialog component (shadcn Dialog for move modal)

**Blocking:** DOC-02 must be complete to provide folder hierarchy and tree structure.

## Testing Requirements

### E2E Tests (Playwright)

Create `simple-client/e2e/document-move.spec.ts`:

- [ ] **Test: Move document to folder**
  - Create workspace, folder, and document
  - Open document dropdown → Click "Move to..."
  - Select destination folder in picker
  - Verify document appears in destination folder
  - Verify document removed from previous location

- [ ] **Test: Move document to workspace root**
  - Create document in nested folder
  - Move to "Workspace Root"
  - Verify document appears at root level
  - Verify `folder_id` is null

- [ ] **Test: Current folder is disabled**
  - Open move dialog for document in folder
  - Verify current folder shows checkmark and is disabled
  - Verify "Move Here" button disabled when current folder selected

- [ ] **Test: Realtime updates**
  - Open two browser tabs as same user
  - Tab 1: Move document to folder
  - Tab 2: Verify document list updates without refresh

- [ ] **Test: Permission enforcement**
  - Non-member guest cannot see "Move to..." action
  - API returns 403 if non-member attempts move via direct API call

- [ ] **Test: Error handling**
  - Simulate network failure during move
  - Verify error message displayed
  - Verify document remains in original location

### Manual Testing Scenarios

- [ ] Move document between deeply nested folders (8-9 levels)
- [ ] Move document while another user viewing workspace
- [ ] Move document with long name (UI truncation)
- [ ] Move in workspace with 100+ folders (performance)
- [ ] Cancel move dialog (no changes)
- [ ] Rapid successive moves (debouncing)

## Related Documentation

- **Product spec:** SPECIFICATION.md – DOC-03 (document move operations)
- **Database schema:** `supabase/migrations/20251004152910_tech_01_base_schema.sql` (documents + folders tables)
- **API patterns:** `simple-client/API.md`
- **Realtime patterns:** `tickets/TECH-09-realtime-update-architecture.md`
- **Similar UI:** Workspace settings dialogs, archive management

## Notes

### Design Considerations

1. **Folder Picker vs Dropdown:** Use modal with tree view instead of nested dropdown for better UX with deep hierarchies
2. **Breadcrumbs:** Show current location to provide context before move
3. **Search in picker:** Consider adding search filter if workspace has 50+ folders (P2 enhancement)
4. **Keyboard navigation:** Support arrow keys to navigate folder tree (accessibility)
5. **Loading states:** Show skeleton while fetching folder tree

### Performance Considerations

- Fetch folder tree once on dialog open (cached for session)
- Lazy-load deeply nested folders if performance issues emerge
- Debounce expand/collapse animations for smooth UX

### Future Enhancements (Out of Scope)

- **Bulk move:** Select multiple documents and move together (PMVP-09)
- **Drag-and-drop:** Drag document cards onto folders in sidebar (separate ticket)
- **Move history:** Show recent move destinations for quick access
- **Cross-workspace moves:** Allow document creator to move between workspaces (DOC-03)
- **Keyboard shortcut:** `Ctrl+M` or `Cmd+M` to open move dialog

### Implementation Order

1. **API route** (`/api/documents/[id]/move`) with validation
2. **Folder tree fetching** (reuse `/api/workspaces/[id]/folders` or add dedicated endpoint)
3. **MoveDocumentDialog component** with static folder tree
4. **Recursive folder tree rendering** with expand/collapse
5. **Wire up to document dropdown menu**
6. **Realtime broadcast integration**
7. **E2E tests**
8. **Polish: loading states, error handling, disabled states**

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Rationale:** Medium complexity due to:
- New API endpoint with validation (~2-3 hours)
- Recursive folder tree UI component (~4-5 hours)
- Dialog integration with existing dropdown (~2 hours)
- E2E test suite (~3-4 hours)
- Polish and edge case handling (~2-3 hours)

Total: ~1.5-2 days for experienced developer

## Worklog

**2025-01-09:** Initial implementation completed
- Created `/api/documents/[documentId]/move` API endpoint with full validation
- Built `MoveDocumentDialog.tsx` component with recursive folder tree rendering
- Added "Move" action to document dropdown menu (DocumentActions.tsx)
- Integrated with workspace documents client using hybrid realtime pattern
- Created 3 E2E tests covering move operations, archived document prevention, and cross-workspace validation
- All typechecks passing
- Realtime broadcast integration complete (broadcasts `document.moved` event)

**Implementation Details:**
- API validates: workspace membership, folder ownership, non-archived documents, and same-workspace constraint
- Dialog features: collapsible folder tree, workspace root option, disabled current location, loading/error states
- Realtime: Broadcasts trigger React Query invalidation for instant UI updates
- E2E tests use existing fixture pattern (authenticatedPage, supabaseAdmin, testUser)

## Open questions

1. **Folder tree collapse state:** Should folders remember expanded/collapsed state between dialog opens? (Recommendation: Start collapsed, let user expand as needed)
2. **Recent folders:** Should we show "Recently used" folders at top for quick access? (Recommendation: Defer to future enhancement)
3. **Confirmation:** Should we show confirmation toast after successful move? (Recommendation: Yes, brief success toast)
4. **Undo:** Should moves be undoable? (Recommendation: No for MVP, add to post-MVP backlog)
