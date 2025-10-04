# [TEST-03]: Permission and Guest Testing

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
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Create automated coverage validating permission enforcement, guest access paths, and forbidden routes, ensuring unauthorized users receive correct responses and UI states.

## Acceptance Criteria

- [ ] Tests cover attempts to access workspaces/documents without membership, verifying `/403` rendering and API 403 responses.
- [ ] Guest scenarios validate read-only vs editable public documents and confirm guests cannot change sharing settings.
- [ ] Member removal tests ensure removed users lose access immediately and receive appropriate messaging.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Use Playwright or integration tests to assert API responses for unauthorized requests.

### UI Components

- Ensure forbidden and guest views include deterministic selectors for assertions.

### Permissions/Security

- Validate tests do not rely on elevated credentials besides designated service accounts for setup.

## Dependencies

- PERM-01 to PERM-04 permission enforcement.
- MEM-02 member removal functionality.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TEST-03.
- Engineering notes: eng-meeting-notes.md > Testing > Permission enforcement.

## Notes

Track coverage metrics to ensure permission tests run on each PR and include regression cases for known issues.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
