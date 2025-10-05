# [NAV-03A]: Document Creation UI

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Implement UI controls to create, rename, duplicate, and delete documents within a workspace. This provides the essential document management interface that leverages the DOC-01 APIs, allowing users to actually create and manage documents before the full workspace browser (NAV-03) is built.

**Scope:** This ticket focuses on the UI layer only. All backend APIs were completed in DOC-01.

## Acceptance Criteria

- [ ] Workspace view (dashboard or simple list) shows "New Document" button/control for creating documents
- [ ] Create document modal/form with name input and workspace context
- [ ] Document list/cards display existing documents with action menus
- [ ] Action menus provide: Rename, Duplicate, Archive, and Delete (hard delete for owners only)
- [ ] Confirmation dialogs for destructive actions (archive, delete)
- [ ] Real-time updates when documents are created/modified/deleted using Supabase Realtime
- [ ] Empty state UI when workspace has no documents
- [ ] Loading states during async operations

## Technical Details

### Database Schema Changes

- None required (DOC-01 complete)

### API Endpoints

All endpoints already implemented in DOC-01:

- POST `/api/workspaces/[id]/documents` - Create document
- PATCH `/api/documents/[id]` - Rename document
- POST `/api/documents/[id]/duplicate` - Duplicate document
- POST `/api/documents/[id]/archive` - Archive document (soft delete)
- POST `/api/documents/[id]/restore` - Restore from archive
- DELETE `/api/documents/[id]/delete` - Hard delete (owner only)

### UI Components

Create/extend the following components:

- `NewDocumentButton` - Trigger for document creation
- `CreateDocumentModal` - Form for new document name
- `DocumentList` or `DocumentGrid` - Display documents in workspace
- `DocumentCard` - Individual document display with action menu
- `DocumentActions` - Action menu component (rename, duplicate, archive, delete)
- `ConfirmDialog` - Reusable confirmation dialog for destructive actions

### Component Locations

Likely in:

- `apps/simple-dotcom/simple-client/src/components/documents/`
- Or integrate into existing workspace views

### Realtime Updates

- Subscribe to Supabase Realtime on `documents` table filtered by workspace_id
- Listen for INSERT, UPDATE, DELETE events
- Update local state to reflect changes without page refresh

### Permissions/Security

- Show "New Document" button only to workspace members (not guests)
- Show "Delete" action only to document creators or workspace owners
- All permission checks already enforced by APIs (DOC-01 + PERM-01)

## Dependencies

- ✅ DOC-01 (complete) - All backend APIs
- ✅ PERM-01 (complete) - Workspace access control
- ✅ TECH-09 (complete) - Realtime architecture

## Testing Requirements

- [ ] Unit tests for UI components
- [ ] Integration tests for create/update flows
- [ ] E2E tests (Playwright) for:
  - Creating new document
  - Renaming document
  - Duplicating document
  - Archiving document
  - Restoring archived document
  - Hard deleting document (owner only)
  - Real-time updates across tabs/sessions
- [ ] Manual testing scenarios

## Related Documentation

- Backend implementation: DOC-01 ticket
- Product spec: product.md > Document Management > Document Operations
- Related: NAV-03 (full workspace browser with folder tree)

## Notes

**Why split from NAV-03?**

- NAV-03 is complex (folder trees, archive access, two-pane layout)
- Users need document creation NOW before full browser is ready
- This ticket provides minimal viable document management UI
- Can be built on simple workspace view or dashboard
- Unblocks user testing and feedback on core document flows

**Canvas Integration:**

- Documents are metadata-only in M2 (canvas-agnostic)
- Creating a document creates a new record with name + metadata
- No canvas content yet - that comes in M2.5 (COLLAB tickets)

**UI Placement Options:**

1. Add to existing workspace page/route
2. Add to dashboard with workspace selector
3. Simple "/workspace/[id]/documents" route
4. Decision: coordinate with existing routes and components

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Created ticket to address missing UI layer for DOC-01 APIs. Split from NAV-03 to unblock document creation before full workspace browser is implemented.

## Open questions

- Where should the "New Document" UI live? Dashboard? Dedicated workspace documents route?
- Should we show archived documents in this view or defer to WS-04/NAV-03?
  → Suggest: show active documents only, defer archive view to WS-04
- Do we need folder selection at creation time?
  → Suggest: No, documents start at workspace root. Folder moves come in DOC-03/NAV-03

## Notes from engineering lead

[To be filled in during implementation]
