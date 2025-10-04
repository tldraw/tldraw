# [AUTH-03]: Password Recovery Flow

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
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Deliver password reset UX and backend integration covering `/forgot-password` and `/reset-password` routes. Flow must issue email tokens via Better Auth, validate tokens, and allow users to choose a new password with clear success and error states.

## Acceptance Criteria

- [ ] Users can request a password reset email from `/forgot-password`; submission surfaces success and failure messaging.
- [ ] `/reset-password?token=...` validates tokens, displays appropriate UI for expired/invalid tokens, and allows setting a new password.
- [ ] Reset completion automatically signs the user in or directs them to login with confirmation feedback.

## Technical Details

### Database Schema Changes

- None expected; leverage Better Auth token storage.

### API Endpoints

- Integrate `/api/auth/forgot-password` and `/api/auth/reset-password` with Better Auth service.
- Ensure rate limiting and captcha (if required) to prevent abuse.

### UI Components

- Build two dedicated pages with accessible form controls, input validation, and success/ error banners.

### Permissions/Security

- Tokens must be single-use and time-bound per Better Auth configuration.
- Prevent authenticated users from using reset flow without re-auth checks.

## Dependencies

- AUTH-01 base authentication setup.
- Email delivery configuration for Better Auth transactional emails.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: AUTH-03.
- Product spec: product.md > MVP Scope > P0 Features > User authentication.
- Engineering notes: eng-meeting-notes.md > MVP Definition > User authentication.

## Notes

Coordinate with UX to ensure copy for expired/invalid token states aligns with branding and encourages contacting workspace owner if problems persist.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
