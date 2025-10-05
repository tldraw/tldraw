# [M15-04]: Harden Route Middleware Session Validation

Date created: 2025-10-05
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
- [x] Testing
- [x] Infrastructure

## Description

Our Next.js middleware currently treats any `better-auth.session_token` cookie as a valid login (`apps/simple-dotcom/simple-client/src/middleware.ts:6-35`). When a session expires or is revoked, the cookie remains and the middleware continually redirects the user from `/login` back to `/dashboard`, while the server component immediately bounces back to `/login`, trapping the user in a redirect loop. With the move to Supabase Auth we need middleware that validates the Supabase session (and clears stale cookies) so protected routes align with actual session state.

## Acceptance Criteria

- [ ] Middleware verifies session state via Supabase Auth (e.g., by calling `supabase.auth.getSession()` or a lightweight `/api/auth/session` check) before marking a request authenticated.
- [ ] Expired or invalid cookies allow navigation to `/login` and other public routes without redirect loops.
- [ ] Automated tests cover valid session, expired session, and no-session paths to prevent regression.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Introduce a middleware helper that reuses Supabase Auth session validation (server-side) and clears stale cookies when invalid.

### UI Components

- Confirm auth pages render correctly when session is invalidated (no infinite redirects).

### Permissions/Security

- Ensure middleware aligns with server route guards so access checks are consistent across navigation methods.

## Dependencies

- Builds on `M15-01` (Supabase Auth migration).

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: `product.md` > Authentication > Session management

## Notes

- Consider short-circuiting middleware for routes that are always public to reduce load on the auth service.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

-

## Open questions

- Should we also guard API routes with the same helper to avoid duplicate session parsing logic?
