# [NAV-06]: Document Search

Date created: 2025-10-04
Date last updated: 2025-10-04
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
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Implement **simple document search by name** across all workspaces a user can access, presenting results with workspace context as described in the MVP requirements.

## Acceptance Criteria

- [ ] Search input accessible from dashboard and workspace views, returning results when users submit queries (no advanced filters for MVP).
- [ ] `/api/search/documents` endpoint performs case-insensitive match on document **name only** (per MVP scope), respects permissions, and returns workspace/folder context.
- [ ] Empty states and loading indicators provide feedback when no results are found or request pending.

## Technical Details

### Database Schema Changes

- Add indexes on `documents.name` (case-insensitive) and potentially trigram index for performance.

### API Endpoints

- Build search endpoint with pagination; ensure RLS ensures only accessible documents returned.

### UI Components

- Create search results panel with quick navigation to documents/workspaces; support keyboard navigation.

### Permissions/Security

- Respect sharing modes and workspace membership filters.

## Dependencies

- PERM-01 for access enforcement.
- NAV-02 dashboard layout for search input placement.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: NAV-06.
- Product spec: product.md > Navigation, Discovery & UI Structure > Document search.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Document search (simple name search).

## Notes

Consider future enhancements like fuzzy search or filters; structure API to allow expansion without breaking changes.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
