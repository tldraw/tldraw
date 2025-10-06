# [TEST-06]: Persisted auth storage state for Playwright

Date created: 2025-10-08
Date last updated: 2025-10-08
Date completed: 2025-10-08

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [x] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Eliminate repeated UI logins by generating an authenticated storage state once per worker and sharing it across tests. Use Playwright's `storageState` to bootstrap sessions after user creation so protected routes are instantly accessible.

## Acceptance Criteria

- [x] Introduce a worker-scoped setup that signs in the provisioned user (via API request or headless page) and saves `storageState` to memory/disk.
- [x] Update the `authenticatedPage` fixture (or replacement) to rely on the saved storage state instead of performing the login form flow each time.
- [x] Ensure tests that require unauthenticated flows can opt out by requesting a fresh context without the shared state.
- [x] Document how to regenerate the storage state locally and in CI in `apps/simple-dotcom/simple-client/e2e/README.md`.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Reuse existing `/login` flow through Playwright `APIRequestContext` or UI once at setup time.

### UI Components

None.

### Permissions/Security

- Do not persist credentials to repo; keep storage state ephemeral per run.

## Dependencies

- [TEST-05] Worker-scoped Supabase auth fixture (optional but recommended to land first).

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `apps/simple-dotcom/simple-client/e2e/README.md`
- Playwright docs: https://playwright.dev/docs/auth

## Notes

- Consider storing storage state in memory instead of disk to avoid cross-worker contention on CI.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-08 – Added worker-scoped storage state fixture, updated authenticated page usage, documented opt-out instructions, attempted targeted Playwright run (blocked by sandbox port binding).

## Open questions

- None.
