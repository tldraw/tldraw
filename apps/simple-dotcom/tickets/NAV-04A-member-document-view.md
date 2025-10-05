# [NAV-04A]: Member Document View Experience

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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement the document view experience for workspace members at `/d/[documentId]`, showing document metadata, sharing controls, and workspace navigation. **M2 Scope: Canvas-agnostic** - document displays as file with metadata panel; canvas integration deferred to M2B/M3.

## Acceptance Criteria

### M2 Canvas-Agnostic Scope
- [ ] Members (owners and members of document's workspace) see document info page with metadata and controls.
- [ ] Document header displays: document name (editable inline), sharing status indicator, sharing controls button, workspace breadcrumbs.
- [ ] Main content area shows **document information panel** with:
  - Document type indicator (e.g., "Board Document")
  - File metadata (size, last modified, etc.)
  - Placeholder/message: "Canvas view coming soon" or similar
- [ ] Sharing controls modal allows toggling public/private and setting read-only/editable permissions (leveraging PERM-02).
- [ ] Document metadata section shows: creator, creation timestamp, last modified timestamp with **display names/initials** (never raw emails).
- [ ] Workspace chrome/navigation remains accessible (sidebar or nav menu).
- [ ] Document action menu provides: rename, duplicate, delete, archive, move to folder options.
- [ ] Unauthorized access (non-members to private documents) redirects to `/403` with clear messaging.

### Deferred to M2B/M3 (Canvas Integration)
- ~~Full tldraw editor with toolbars~~
- ~~Participant list with active collaborators~~
- ~~Real-time presence/cursors~~

## Technical Details

### Database Schema Changes

- None (relies on existing schema from TECH-01).

### API Endpoints

- Document detail fetch: `GET /api/documents/[documentId]` returns metadata, permissions, sharing state.
- Document operations: rename, duplicate, delete, archive (may already exist from DOC-01).

### UI Components

**Document Header:**
- Editable document name with inline edit
- Workspace breadcrumb navigation
- Share button (opens PERM-02 modal)
- Sharing status indicator (private/public badge)

**Document Info Panel (main content - M2):**
- Document type icon/badge
- Metadata display (creator, dates, size)
- File information
- Placeholder for canvas (e.g., "Canvas editor coming soon")
- Optional: Thumbnail/preview image if available

**Document Actions Menu:**
- Dropdown/context menu with all document operations
- Role-aware visibility (hide workspace-only actions appropriately)

**Metadata Section:**
- Creator info with display name
- Created/modified timestamps
- Document statistics if available

### Permissions/Security

- Route guard validates workspace membership before rendering full view.
- API calls validate permissions server-side.
- Ensure guest users cannot reach this UI (they use NAV-04B instead).

## Dependencies

**Prerequisites:**
- DOC-04 (metadata tracking) for displaying creator/timestamps
- PERM-02 (sharing modal) for sharing controls
- Workspace membership system functional
- DESIGN-07 (component library) for consistent UI elements

**Blocks:**
- NAV-04B (guest view experience - separate UI layer)

**Canvas Integration (Deferred to M2B/M3):**
- COLLAB-01A will replace info panel with tldraw component
- Document view architecture supports drop-in canvas replacement

## Testing Requirements

- [x] Unit tests (component rendering)
- [x] Integration tests (API interactions)
- [x] E2E tests (Playwright - full member workflow)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: NAV-04.
- Product spec: product.md > Navigation, Discovery & UI Structure > Document view.
- README.md: Site Map > Document Routes

## Notes

**M2 Canvas-Agnostic Approach:**
- Document view is a **metadata/info page** without canvas rendering
- This validates routing, permissions, sharing UI before canvas complexity
- Architecture designed for easy canvas integration later (M2B/M3)
- Info panel can be replaced with tldraw component without changing surrounding UI

**Design Considerations:**
- Full workspace chrome should be present (sidebar or collapsible nav)
- Consider responsive design for mobile/tablet
- Ensure keyboard accessibility for all controls
- Info panel should have clear "coming soon" or placeholder messaging

**Display Name Handling:**
- Use centralized utility for formatting user display names
- Never expose raw email addresses in metadata
- Fall back to "Anonymous User" if display name unavailable

**Performance:**
- Lightweight page load without canvas assets
- Metadata fetching can be optimized server-side

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Split from original NAV-04 to separate member experience from guest experience (NAV-04B). Updated to canvas-agnostic approach - document info panel instead of canvas for M2.

## Open questions

- What should the document info panel show without canvas?
  → Metadata (creator, dates), document type, file info, "canvas coming soon" message. Consider thumbnail preview if available.
- Should we show "Open in editor" button that's disabled with tooltip?
  → No, simpler to just show placeholder. Button implies functionality that doesn't exist yet.
- Do we need version history UI in this ticket?
  → No, defer version history to post-MVP.
