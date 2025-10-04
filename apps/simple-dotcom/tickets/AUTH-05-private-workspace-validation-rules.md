# [AUTH-05]: Private Workspace Validation Rules

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

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Enforce system-level validation so private workspaces created at signup remain non-deletable and non-renamable across all APIs and background jobs, preventing accidental mutation or removal outside the signup flow.

## Acceptance Criteria

- [ ] Database constraints or triggers prevent updates to `name` or deletion of private workspaces (`is_private = true`).
- [ ] API layer rejects rename/delete requests for private workspaces with standardized 403 responses and reason codes.
- [ ] Background jobs and admin scripts respect the same guardrails, logging any denied attempts for monitoring.
- [ ] Unit/integration tests cover attempts to rename/delete private workspaces, ensuring failures occur consistently.

## Technical Details

### Database Schema Changes

- Add database-level constraint (e.g., trigger) blocking UPDATE/DELETE for rows where `is_private = true`, except when executed by dedicated service role (e.g., account deletion).
- Ensure `immutable_name` flag is enforced through constraint or check.

### API Endpoints

- Update workspace mutation endpoints to short-circuit when `is_private = true`, returning descriptive error payload.

### UI Components

- N/A (UI covered by AUTH-02), but include integration tests validating UI cannot circumvent rules.

### Permissions/Security

- Log blocked attempts for security auditing; alert if repeated violations occur.

## Dependencies

- AUTH-02 private workspace provisioning.
- TECH-01 schema foundation.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- Product spec: product.md lines 48-52.
- Engineering notes: eng-meeting-notes.md lines 246-252.

## Notes

Document exception pathway for account deletion flow so private workspace removal happens only when user account is fully removed.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
