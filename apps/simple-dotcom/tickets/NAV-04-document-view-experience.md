# [NAV-04]: Document View Experience

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
- [x] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Implement `/d/[id]` document view tailored to user roles, embedding tldraw editor for members and streamlined experience for guests, while surfacing sharing controls, presence, and metadata.

## Acceptance Criteria

- [ ] Members see full editor chrome including toolbars, sharing controls, presence indicators, and document metadata.
- [ ] Guests access public view with limited chrome per PERM-03 and appropriate editing rights based on share mode.
- [ ] Participant list, presence avatars, and comments display **display names/initials only**, never raw email addresses.
- [ ] Route handles unauthorized access by redirecting to `/403` or share error page; loading state appears while fetching document info.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Document detail fetch endpoint returns required data (metadata, permissions, sharing state) for initial render.

### UI Components

- Compose document header, presence panel, share button, and tldraw canvas component.
- Add skeletons while loading document data and sync token.

### Permissions/Security

- Validate access before initializing sync session; ensure guests cannot reach owner-only controls.

## Dependencies

- COLLAB-01 real-time editing integration.
- PERM-02 sharing modal.
- DOC-04 metadata display.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: NAV-04.
- Product spec: product.md > Navigation, Discovery & UI Structure > Document view.

## Notes

Plan for feature flags to toggle future advanced document types without reworking routing.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)
