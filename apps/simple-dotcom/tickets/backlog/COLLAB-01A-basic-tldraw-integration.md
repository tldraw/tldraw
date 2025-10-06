# [COLLAB-01A]: Basic tldraw Component Integration

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Integrate the tldraw canvas component into the document view, enabling single-user editing with local or browser-based persistence. This provides the foundation for the editing experience before adding multiplayer sync capabilities in COLLAB-01B.

## Acceptance Criteria

- [ ] Document view (`/d/[documentId]`) renders tldraw canvas component with full toolset and UI chrome.
- [ ] User can create shapes, draw, add text, and use all standard tldraw tools with changes persisting locally (IndexedDB or equivalent).
- [ ] Canvas state loads from previous session when user returns to the same document.
- [ ] Basic error handling displays user-friendly messages if canvas fails to initialize.

## Technical Details

### Database Schema Changes

- None (local/IndexedDB persistence only for this ticket).

### API Endpoints

- None required for basic integration; document metadata fetch already exists.

### UI Components

- Import and configure `<Tldraw />` component in document view.
- Add canvas wrapper with appropriate styling and responsive behavior.
- Implement local storage adapter for persistence (no multiplayer yet).

### Permissions/Security

- Validate user has document access before rendering canvas (handled by existing route guards).

## Dependencies

**Prerequisites:**
- NAV-04 document view routing must exist (basic shell is sufficient)
- Document metadata API endpoints

**Blocks:**
- COLLAB-01B (multiplayer sync worker - builds on this)
- COLLAB-02 (presence - requires canvas context)

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: product.md > Real-Time Collaboration > Multiplayer Editing.
- tldraw documentation: https://tldraw.dev/docs

## Notes

This ticket isolates the basic tldraw integration from multiplayer complexity, allowing:
1. Earlier delivery of document editing functionality
2. UI/UX refinement before adding sync complexity
3. Parallel development of sync infrastructure (COLLAB-01B)

Local persistence should use tldraw's built-in IndexedDB adapter. Server-side persistence will be added in TECH-02 + COLLAB-01B.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Split from original COLLAB-01 to separate basic integration from multiplayer sync.

## Open questions

- Should we implement read-only canvas mode for guests in this ticket, or defer to NAV-04B?
  → Defer to NAV-04B to keep this ticket focused on basic editing.
