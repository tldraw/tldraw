# [DOC-04]: Document Metadata Tracking

Date created: 2025-10-04
Date last updated: -
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
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Track and expose document metadata including creator, creation timestamp, and last modified timestamp in both database and UI.

## Acceptance Criteria

- [ ] `documents` table captures `creator_id`, `created_at`, and `updated_at` automatically on insert/update.
- [ ] `/api/documents/[id]` returns metadata fields for consumption by client views.
- [ ] Document detail UI displays metadata to users in a consistent Info panel or header.

## Technical Details

### Database Schema Changes

- Ensure `documents` table includes necessary columns and triggers to auto-update `updated_at` on changes.

### API Endpoints

- Update document read endpoints to include metadata fields.

### UI Components

- Add metadata display component within document detail page (e.g., sidebar or header) and optionally in list tooltips.

### Permissions/Security

- Restrict metadata exposure to authorized users; ensure no sensitive internal fields leak to guests.

## Dependencies

- DOC-01 for base document model.
- PERM-03 guest experience to govern metadata visibility.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-04.
- Product spec: product.md > Document Management > Document Metadata.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Document versioning.

## Notes

Route metadata through presence system so collaborator badges show accurate display names and timestamps.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
