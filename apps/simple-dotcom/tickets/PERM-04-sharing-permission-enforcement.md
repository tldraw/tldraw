# [PERM-04]: Sharing Permission Enforcement

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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Ensure only workspace members can modify document sharing settings, with guests seeing disabled controls and API rejecting unauthorized updates.

## Acceptance Criteria

- [ ] Share modal hides or disables controls when current user lacks workspace membership, showing explanatory tooltip or banner.
- [ ] `/api/documents/[id]/share` returns 403 for non-members attempting to change sharing mode.
- [ ] Logging captures unauthorized change attempts for monitoring.

## Technical Details

### Database Schema Changes

- None beyond PERM-02 fields.

### API Endpoints

- Add membership checks in share endpoint and relevant middleware.

### UI Components

- Update share modal to conditionally render state based on permission context.

### Permissions/Security

- Confirm RLS prevents direct updates from non-members even if API bypass attempted.

## Dependencies

- PERM-02 document sharing modes UI/API.
- PERM-01 workspace access control policies.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERM-04.
- Product spec: product.md > Permissions & Sharing > Document-Level Sharing.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Permission enforcement.

## Notes

Coordinate with analytics to flag repeated unauthorized attempts, which may indicate leaked links.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
