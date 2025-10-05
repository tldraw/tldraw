# [M15-06]: Fix E2E Tests for Auto-Provisioning Behavior

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
- [ ] Infrastructure

## Description

After implementing BUG-01 fix (auth.users sync with auto-provisioning), 6 E2E tests are failing because they expect the old behavior where users could have zero workspaces. Per SPECIFICATION.md AUTH-02, every user MUST receive a private workspace on signup. The tests need to be updated to reflect this correct behavior.

## Acceptance Criteria

- [ ] All empty workspace tests updated or removed (tests should not expect zero workspaces)
- [ ] Private workspace name expectations corrected (implementation uses "{display_name}'s Workspace")
- [ ] Owner transfer tests account for auto-provisioned private workspace
- [ ] All E2E tests passing (94/94)
- [ ] No regression in actual application functionality

## Technical Details

### Test Files to Update

1. **e2e/empty-workspace.spec.ts** (3 failures):
   - `should handle users with no accessible workspaces without errors`
   - `should return proper empty response from dashboard API with no workspaces`
   - `should recover gracefully when workspace is restored`

   These tests are testing a scenario that CANNOT exist per AUTH-02. Options:
   - Remove these tests entirely (recommended - scenario is impossible)
   - Update to test "user with only private workspace" scenario instead

2. **e2e/workspace.spec.ts** (3 failures):
   - `should allow owner to leave after transferring ownership` (line 723)
   - `should prevent renaming private workspace via API` (line 1117)
   - `should verify private workspace created on signup` (line 1193)

   Issues:
   - Tests expect workspace name "My Private Workspace"
   - Implementation creates "{display_name}'s Workspace"
   - Need to update expectations or standardize the naming

### Database Schema Changes

None.

### API Endpoints

None - this is purely test fixture updates.

### UI Components

None.

### Permissions/Security

None.

## Dependencies

- Completes BUG-01 resolution (auth sync and auto-provisioning)
- Blocks M2 progress (need clean test suite before RLS implementation)

## Testing Requirements

- [ ] Unit tests - N/A
- [ ] Integration tests - N/A
- [x] E2E tests (Playwright) - All 94 tests must pass
- [ ] Manual testing scenarios

## Related Documentation

- SPECIFICATION.md: AUTH-02 "Automatically create a non-deletable, non-renamable private workspace for each new user"
- BUG-01: Workspace creation foreign key constraint (resolved)
- Migration: 20251005000000_auth_02_sync_supabase_auth.sql

## Notes

**Design Decision Needed:**
Should the auto-provisioned private workspace be named:
- Option A: "My Private Workspace" (what tests expect)
- Option B: "{display_name}'s Workspace" (current implementation)
- Option C: Something else?

Per SPECIFICATION.md design notes: "Surface private workspace in dashboard alongside shared workspaces with explanatory copy." No specific naming convention is mandated.

**Recommendation:** Keep current implementation ("{display_name}'s Workspace") and update tests, as it's more personalized and distinguishes the workspace owner.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

-

## Open questions

- Should we keep "empty workspace" tests at all, or remove them since the scenario is impossible per spec?
- Confirm workspace naming convention preference
