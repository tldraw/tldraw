# [TEST-04]: Playwright Data Isolation & Cleanup Hardening

Date created: 2025-02-14
Date last updated: 2025-10-05
Date completed: 2025-10-05

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
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Improve the Playwright E2E suite so each run starts from a deterministic state and leaves the database clean. Current fixtures only delete Supabase auth users, letting related rows in `workspaces`, `workspace_members`, and session tables accumulate. This causes flaky tests that pass in isolation but fail when suites run together. We need robust setup/teardown to satisfy the spec’s testing guidance.

## Acceptance Criteria

- [x] Playwright fixtures delete all records created for a test user across auth, workspace, document, session, and membership tables before the next test begins. Failures in cleanup must fail the test with actionable logging.
- [x] Global test setup (or a Supabase RPC/script) truncates relevant tables before a Playwright run so suites never inherit dirty state from previous executions.
- [x] Workspace tests wrap Supabase admin mutations in helpers that assert success, preventing silent cleanup failures.
- [x] Documentation in `e2e/README.md` (or equivalent) explains the isolation strategy and how to run the reset utilities locally and in CI.

## Technical Details

### Database Schema Changes

- None expected; use existing tables. If truncation requires additional permissions, add a service-role RPC for tests.

### API Endpoints

- Optional: add `/api/test/reset` (guarded by non-production env checks) or a Supabase function invoked from Playwright global setup.

### UI Components

- No UI impact.

### Permissions/Security

- Ensure cleanup utilities use service-role keys and are only callable in test environments. Guard any new endpoints behind `NODE_ENV === 'test'` checks.

## Dependencies

- TEST-01 Playwright E2E suite (baseline infrastructure).
- AUTH-02 Provision private workspace on signup (fixture relies on this behavior).
- AUTH-05 Private workspace validation rules (cleanup touches those rows).

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [ ] Manual testing scenarios

## Related Documentation

- `SPECIFICATION.md` > **Testing Strategy** (Playwright suite expectations, dedicated test data seeding/cleanup).
- `SPECIFICATION.md` > **Technical Architecture & Implementation** > Supabase setup (service role usage).

## Notes

- Consider toggling `playwright.config.ts` to record traces from run start (`trace: 'on'`) and `preserveOutput: 'always'` so trace directories remain stable during retries.
- Evaluate whether current Supabase project should be dedicated to automated tests to avoid cross-env interference.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-05 - Implementation Complete

**Created comprehensive cleanup infrastructure:**

1. **Cleanup Helpers** (`e2e/fixtures/cleanup-helpers.ts`)
   - `cleanupUserData()` - Cascading deletion of all user-related data across 8 tables
   - `cleanupTestUsersByPattern()` - Bulk cleanup with RPC function fallback
   - `assertCleanupSuccess()` - Validation with detailed error logging
   - Proper deletion order respecting foreign key constraints

2. **Global Test Setup** (`e2e/global-setup.ts`)
   - Runs before all tests to clean leftover data from previous runs
   - Uses pattern matching (`test-%`) to find all test users
   - Logs detailed cleanup results for visibility

3. **Supabase RPC Function** (migration `add_test_cleanup_rpc`)
   - `cleanup_test_data(email_pattern)` for efficient bulk deletion
   - Service role only, with proper error handling
   - Returns detailed success/error information and deletion counts

4. **Updated Test Fixtures** (`e2e/fixtures/test-fixtures.ts`)
   - Integrated comprehensive cleanup into `testUser` fixture
   - Cleanup failures now fail tests with actionable logging
   - Each test gets unique user with automatic cascading cleanup

5. **Enhanced Playwright Config** (`playwright.config.ts`)
   - Added global setup reference
   - Enhanced trace/screenshot/video settings for debugging
   - Better reporter configuration

6. **Comprehensive Documentation** (`e2e/README.md`)
   - Data isolation strategy explained
   - Cleanup lifecycle documented
   - Manual reset procedures provided
   - Best practices and troubleshooting guide

**Test Results:**
- All 12 auth tests pass (1 skipped)
- Cleanup successful for all test users
- Each test isolated with unique user data
- No orphaned records after test runs

## Open questions

- ~~Should we add a reusable Supabase SQL script or rely on a Next.js API endpoint for database resets?~~ **Resolved:** Implemented Supabase RPC function with TypeScript fallback
- ~~Do we need to snapshot specific seed data (e.g., marketing content) after truncation, or can the app boot from an empty state?~~ **Resolved:** App boots from empty state successfully
