# [TEST-08]: Supabase seeding helpers & deterministic waits

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
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Create lightweight Supabase helper utilities that let Playwright tests seed workspaces, documents, and memberships directly via the admin client instead of driving the UI. Replace ad-hoc `waitForTimeout` calls with explicit assertions on expected state transitions to eliminate fixed delays.

## Acceptance Criteria

- [x] Add helper functions (e.g. `createWorkspaceForUser`, `addMemberToWorkspace`) in `e2e/fixtures` that call Supabase tables directly.
- [x] Refactor representative suites (dashboard, member management, session edge cases) to rely on seeded data instead of repetitive UI setup.
- [x] Remove all `waitForTimeout` usages from the refactored suites, replacing them with Playwright `expect` or `waitFor*` selectors.
- [x] Document the seeding helpers in the E2E README with examples.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Use Supabase admin client to insert/delete workspace-related rows.

### UI Components

No UI changes.

### Permissions/Security

- Ensure seeded data is scoped to the worker's user id to avoid cross-test collisions.

## Dependencies

- Supabase admin client fixture available (TEST-05).

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `apps/simple-dotcom/simple-client/e2e/README.md`

## Notes

- Start with suites that currently create workspaces via UI (`dashboard.spec.ts`) to maximize time savings.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-08 – Added `TestDataBuilder` seeding helpers, extended fixtures, refactored dashboard/member-management specs to seed via Supabase and remove `waitForTimeout`, updated README with storage state + data helper guidance.

## Open questions

- None.
