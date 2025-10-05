# [TEST-10]: Fast database reset for Playwright global setup

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

Replace the iterative Supabase cleanup in `e2e/global-setup.ts` with a fast, deterministic reset so Playwright test runs start from a clean slate without scanning and deleting rows individually.

## Acceptance Criteria

- [x] Introduce a single-shot reset strategy (e.g. `supabase db reset`, dedicated RPC, or truncate script) that clears all `test-%` data in <5 seconds.
- [x] Update `global-setup.ts` to call the new strategy and remove per-table deletion loops.
- [x] Ensure the reset path is safe to run locally and in CI without touching non-test schemas.
- [x] Document the reset command in the E2E README and any manual recovery steps.

## Technical Details

### Database Schema Changes

None, unless new RPC/function required for faster cleanup.

### API Endpoints

- Potentially add a Supabase SQL function for truncating test data atomically.

### UI Components

None.

### Permissions/Security

- Function should require service role key to avoid accidental invocation.

## Dependencies

- Coordination with Supabase project owners if schema-level reset is required.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `apps/simple-dotcom/simple-client/e2e/global-setup.ts`
- `apps/simple-dotcom/simple-client/e2e/README.md`

## Notes

- Consider combining with nightly `supabase db reset` to keep environments clean.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-08 – Replaced manual cascade traversal with `cleanup_test_data` RPC in global setup, documented reset workflow, verified fixture compatibility.

## Open questions

- None.
