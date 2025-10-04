# [AUTH-01]: Implement Email Authentication Flows

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
- [x] Infrastructure

## Description

Implement core email/password authentication flows using Better Auth, covering signup, login, logout, and session refresh across web and API layers. Deliver intuitive auth screens with validation and link-outs between related flows while honoring security expectations for the MVP.

## Acceptance Criteria

- [x] Users can sign up, log in, and log out through Better Auth-backed endpoints (`/api/auth/*`) with secure session cookies and refresh handling.
- [x] Auth pages (`/login`, `/signup`, `/logout`) include error handling, form validation, loading states, and links between flows per design guidance.
- [x] Client-side session context persists across refreshes and expires gracefully when tokens are revoked or become invalid.

## Technical Details

### Database Schema Changes

- No new tables required; rely on Better Auth user storage with existing Supabase `users` table linkage.

### API Endpoints

- Wire `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` to Better Auth SDK following reference implementation.
- Ensure API responses normalize error objects for UI consumption (e.g., invalid credentials, email in use).

### UI Components

- Build shared auth layout with reusable input components and error banners.
- Implement password strength validation and accessible form labeling consistent with shadcn conventions.

### Permissions/Security

- Enforce HTTPS-only cookies, CSRF tokens (if required by Better Auth integration), and rate limiting on auth endpoints.
- Prevent authenticated users from accessing auth pages by redirecting them to `/dashboard`.

## Dependencies

- Better Auth SDK configuration and environment secrets.
- Shared design system components (inputs, buttons) from existing UI kit.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: See product.md: MVP Scope > P0 Features > User authentication.
- Product requirements: apps/simple-dotcom/product-requirements.md: AUTH-01.
- Engineering notes: apps/simple-dotcom/eng-meeting-notes.md: MVP Definition > User authentication.

## Notes

Coordinate with security review to confirm session storage strategy and cookie configuration before launch.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-04:**
- Installed Better Auth v1.3.0 with pg adapter
- Created server-side auth configuration at `src/lib/auth.ts` with Supabase PostgreSQL connection
- Created API route handler at `/api/auth/[...all]/route.ts` for all Better Auth endpoints
- Created client-side auth client at `src/lib/auth-client.ts` with React hooks
- Implemented signup page at `/signup` with email, password, name fields and validation
- Implemented login page at `/login` with email/password form and forgot password link
- Added session provider wrapper in root layout
- Implemented middleware for route protection - redirects auth pages if logged in, protects dashboard/workspace routes
- Created Better Auth database migration (`20251004180000_auth_01_better_auth_schema.sql`) with session, account, and verification tables
- Added password_hash and email_verified fields to existing users table
- Created basic dashboard page with sign out functionality
- Updated README.md with yarn package management instructions

**Technical decisions:**
- Used Better Auth's PostgreSQL adapter with direct Supabase connection (DATABASE_URL)
- Enabled nextCookies plugin for seamless server action cookie handling
- Session expiry: 7 days with 1-day refresh window
- Disabled email verification for MVP (can enable later)
- Password validation: minimum 8 characters client-side

## Open questions

None - all acceptance criteria met.
