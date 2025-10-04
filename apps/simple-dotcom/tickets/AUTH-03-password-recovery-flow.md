# [AUTH-03]: Password Recovery Flow

Date created: 2025-10-04
Date last updated: 2025-10-04
Date completed: 2025-10-04

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

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

- [x] Users can request a password reset email from `/forgot-password`; submission surfaces success and failure messaging.
- [x] `/reset-password?token=...` validates tokens, displays appropriate UI for expired/invalid tokens, and allows setting a new password.
- [x] Reset completion automatically signs the user in or directs them to login with confirmation feedback.

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
- [ ] Integration tests
- [ ] E2E tests (Playwright) — extend TEST-01 suite with the flows below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Request password reset from `/forgot-password`, assert success messaging and email stub delivery without leaking account existence.
- Follow reset email link, submit new password, and confirm automatic sign-in or directed login succeeds with new credentials.
- Attempt reset with expired or malformed token and verify inline error state plus redirect guidance.
- Open reset link while already authenticated and ensure guardrails redirect to profile/dashboard instead of rendering the reset form.

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

**2025-10-04**: Implemented complete password recovery flow:
- Configured Better Auth with `sendResetPassword` callback in `src/lib/auth.ts`
  - Set token expiration to 1 hour
  - Added console logging for MVP (to be replaced with email service in production)
- Created `/forgot-password` page:
  - Form to request password reset
  - Success/error states with appropriate messaging
  - Security-conscious messaging (doesn't reveal if email exists)
- Created `/reset-password` page:
  - Token validation from URL query parameters
  - Error states for invalid/expired tokens
  - Password validation (minimum 8 characters)
  - Confirm password matching
  - Success state with auto-redirect to dashboard
- Exported `forgetPassword` and `resetPassword` methods from `auth-client.ts`
- All TypeScript and lint checks passing
- E2E and integration tests deferred to TEST-01 (no test framework currently exists)

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
