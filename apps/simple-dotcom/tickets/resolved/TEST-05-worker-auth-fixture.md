# [TEST-05]: Worker-scoped Supabase auth fixture

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

- [ ] Authentication
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

Create a Playwright fixture that provisions and tears down Supabase users directly through the admin API at the worker scope so UI-driven signups are no longer required for every test. The fixture should create one test account per worker, expose its credentials to tests, and ensure cleanup uses a single Supabase admin call.

## Acceptance Criteria

- [x] Add a `workerAuth` (name TBD) fixture that calls `supabase.auth.admin.createUser` with deterministic email generation and stores the returned ids/metadata for reuse.
- [x] Replace the current per-test signup flow in `e2e/fixtures/test-fixtures.ts` with worker-scoped provisioning that shares the generated user across that worker's tests.
- [x] Implement cleanup using `supabase.auth.admin.deleteUser` (or equivalent RPC) without walking table-by-table, and verify it runs once per worker.
- [x] Update documentation in `apps/simple-dotcom/simple-client/e2e/README.md` to describe the new provisioning model and any environment variable requirements.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Use Supabase Admin API (`supabase.auth.admin.*`) for user lifecycle during tests.

### UI Components

No UI changes.

### Permissions/Security

- Ensure the service role key used for admin operations remains scoped to the dedicated test project.

## Dependencies

- Existing Supabase service role credentials available via `.env.local` for tests.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- Update `apps/simple-dotcom/simple-client/e2e/README.md` provisioning section.

## Notes

- Consider storing worker metadata in `testInfo.workerIndex` so email collisions are impossible even across sharded CI runs.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-08 – Replaced per-test signup with worker-scoped Supabase admin user, added provisioning wait + cleanup, refreshed E2E README, attempted local Playwright run (blocked by sandbox binding to port 3000).

## Open questions

- None.
