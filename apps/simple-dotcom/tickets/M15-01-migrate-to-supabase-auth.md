# [M15-01]: Migrate to Supabase Auth

Date created: 2025-10-05
Date last updated: 2025-10-05
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
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [x] Infrastructure

## Description

Replace the current Better Auth integration with Supabase Auth so that identity, session management, and RLS operate on a single stack. This requires removing Better Auth server/client code, wiring Supabase Auth helpers through the App Router, and ensuring signup/login/reset flows, API handlers, and middleware all use Supabase sessions.

## Acceptance Criteria

- [ ] Better Auth dependencies and code (`@better-auth/*`, `src/lib/auth.ts`, `authClient`, middleware hooks) are removed and replaced with Supabase Auth equivalents.
- [ ] Signup, login, logout, forgot/reset password, and session refresh work end-to-end using Supabase Auth APIs in both server components and client components.
- [ ] API routes that currently call `auth.api.getSession` (e.g. workspaces, dashboard, profile, documents, presence) rely solely on Supabase helpers and honour existing RLS policies without service-role exceptions.
- [ ] User provisioning flow (private workspace creation) executes using Supabase database functions or triggers without Better Auth middleware.
- [ ] Playwright auth scenarios pass with the new auth stack and regression tests cover key flows.

## Technical Details

### Database Schema Changes

- Drop Better Auth-specific tables if no longer needed and clean up related migrations.
- Ensure Supabase Auth metadata (e.g. `auth.users`, `auth.identities`) is wired to our public `users` table via triggers or hooks for profile data.

### API Endpoints

- Update `/api/auth/*` routes to proxy Supabase Auth endpoints or remove if default handlers suffice.
- Refactor API route guards to use `createClient().auth.getUser()`/`getSession()` utilities rather than Better Auth middleware.

### UI Components

- Swap `/login`, `/signup`, `/forgot-password`, `/reset-password` pages to call Supabase Auth client helpers (`supabase.auth.signInWithPassword`, etc.).
- Update dashboard/workspace client components to pull session state from Supabase instead of `authClient`.

### Permissions/Security

- Confirm RLS policies continue to enforce access based on Supabase-authenticated user IDs.
- Review session cookie settings (domain, expiry, secure flags) post-migration.

## Dependencies

- Coordinate with `TECH-01` schema and `AUTH-05` validation guardrails to ensure triggers stay aligned.
- Inform QA to update auth test fixtures once Supabase Auth is live.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Product spec: `product.md` > Authentication & Identity

## Notes

- Consider introducing a thin auth client wrapper for reuse in components, mirroring current `authClient` ergonomics but backed by Supabase.
- Audit environment variables (`BETTER_AUTH_*`) and rotate secrets as part of the migration.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

-

## Open questions

- Do we need to support OAuth providers in milestone 1.5 or can we stick to email/password for now?
- Should we migrate existing Better Auth user data into Supabase Auth automatically or require fresh signups in non-prod?
