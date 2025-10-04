# [INV-01]: Auth-Gated Invite Acceptance

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
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Ensure invite acceptance flow requires authentication, redirecting unauthenticated users to login/signup while preserving the invitation token to resume the join flow post-login.

## Acceptance Criteria

- [ ] Visiting `/invite/[token]` while unauthenticated sends users to `/login` or `/signup` with state preservation to continue join after authentication.
- [ ] After successful login, users are automatically redirected back to the invite flow without needing to re-open the link.
- [ ] Expired or invalid tokens encountered during redirect show informative failure messaging.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Update invite validation endpoint to accept unauthenticated state but require auth before completing membership creation.

### UI Components

- Enhance auth pages to detect invite context and display messaging (“You’re joining workspace X”).

### Permissions/Security

- Prevent token leakage by storing state in encrypted cookies/session storage rather than query strings.

## Dependencies

- MEM-04 join-by-link flow.
- AUTH-01 authentication flows.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: INV-01.
- Product spec: product.md > Workspace Invitations > Join-by-link.

## Notes

Ensure sign-in with invite context works across multiple tabs to avoid confusion if users log in elsewhere.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
