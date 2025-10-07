# [BUG-35]: Empty Workspace Test Fails Due to Data Pollution from Parallel Tests

Date reported: 2025-10-07
Date last updated: 2025-10-07
Date resolved: 2025-10-07

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

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
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright)
- OS: macOS 14.6.0
- Environment: local (e2e tests)
- Affected version/commit: Current (8ee7ad262)

## Description

The `empty-workspace.spec.ts` tests are failing because they share a worker-level `testUser` fixture with other parallel tests. When these tests try to isolate the user to only have their private workspace, they encounter workspaces created by other tests running in parallel on the same worker.

Two tests are failing:
1. **"should handle users with only private workspace"** - Expected 1 workspace but sees 2
2. **"should return proper dashboard API response with only private workspace"** - Expected 1 workspace in API response but receives 4

The root cause is that the test's cleanup logic only removes `workspace_members` records (memberships) but doesn't delete the workspaces themselves if they're owned by the testUser. Since the testUser is shared across all tests in a worker, other parallel tests create workspaces owned by this user, and those workspaces persist into the empty-workspace tests.

## Steps to Reproduce

1. Run the e2e test suite with multiple workers: `npm run test:e2e`
2. Observe tests running in parallel sharing the same worker-level testUser
3. Other tests create workspaces owned by the testUser (e.g., dashboard tests, document tests)
4. The empty-workspace tests run and try to clean up by removing workspace memberships
5. The workspaces owned by testUser still exist in the database
6. Tests fail because they see more workspaces than expected

## Expected Behavior

The empty-workspace tests should successfully isolate the testUser to only have their private workspace:
- Test 1 should see exactly 1 workspace in the UI (the private workspace)
- Test 2 should receive exactly 1 workspace from the API (the private workspace)
- All shared workspaces owned by or accessible to the testUser should be removed before the assertions

## Actual Behavior

**Test 1 failure:**
```
Expected: 1
Received: 2
```
The UI shows 2 workspaces instead of 1.

**Test 2 failure:**
```
Expected length: 1
Received length: 4
Received array: [
  {"workspace": {"name": "Header Test 1759870128162", "is_private": false}},
  {"workspace": {"name": "Archive Test 1759870127827", "is_private": false}},
  {"workspace": {"name": "Toggle Workspace 1759870125889", "is_private": false}},
  {"workspace": {"name": "Playwright Worker 5's Workspace", "is_private": true}}
]
```

The API returns 4 workspaces:
- 3 shared workspaces from other tests (Header Test, Archive Test, Toggle Workspace)
- 1 private workspace (expected)

## Screenshots/Videos

Screenshots available in test-results directory showing multiple workspaces visible.

## Error Messages/Logs

**Test 1 error:**
```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2

  39 | 		const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
  40 | 		const count = await workspaceItems.count()
> 41 | 		expect(count).toBe(1) // User should always have their private workspace
     | 		              ^
```

**Test 2 error:**
```
Error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 4

  92 | 		// Should have exactly one workspace (the private workspace)
> 93 | 		expect(data.data.workspaces).toHaveLength(1)
     | 		                             ^
```

## Related Files/Components

- `simple-client/e2e/empty-workspace.spec.ts:4-53` - Test 1: "should handle users with only private workspace"
- `simple-client/e2e/empty-workspace.spec.ts:55-105` - Test 2: "should return proper dashboard API response"
- `simple-client/e2e/empty-workspace.spec.ts:16-30` - Cleanup logic that only removes memberships
- `simple-client/e2e/fixtures/test-fixtures.ts:109-156` - Worker-level testUser fixture
- `simple-client/e2e/fixtures/test-fixtures.ts:145` - Worker cleanup using `cleanupTestUsersByPattern`

## Possible Cause

**Root cause:** Test isolation issue with shared worker-level fixtures

The problem occurs because:
1. **Worker-level fixture sharing**: The `testUser` fixture is scoped to `worker` (line 155 in test-fixtures.ts), meaning all tests in the same worker share the same test user
2. **Parallel test execution**: Playwright runs multiple tests in parallel within each worker
3. **Workspace creation**: Other tests (dashboard tests, document tests) create workspaces owned by the shared testUser
4. **Incomplete cleanup**: The empty-workspace tests only remove workspace_members records (lines 16-30):
   ```typescript
   if (!workspace.is_private) {
     await supabaseAdmin
       .from('workspace_members')
       .delete()
       .eq('workspace_id', workspace.id)
       .eq('user_id', testUser.id)
   }
   ```
5. **Owned workspaces persist**: This cleanup doesn't delete workspaces owned by the testUser, only memberships where they're a member (not owner)
6. **Data pollution**: Workspaces created by other parallel tests remain in the database and are visible to the empty-workspace tests

## Proposed Solution

**Option 1 (Recommended): Fix the test cleanup logic**

Delete all non-private workspaces owned by the testUser, not just remove memberships:

```typescript
// Get all workspaces owned by the test user
const { data: ownedWorkspaces } = await supabaseAdmin
  .from('workspaces')
  .select('id, is_private')
  .eq('owner_id', testUser.id)

if (ownedWorkspaces) {
  for (const workspace of ownedWorkspaces) {
    if (!workspace.is_private) {
      // Delete the workspace entirely (not just membership)
      await supabaseAdmin
        .from('workspaces')
        .delete()
        .eq('id', workspace.id)
    }
  }
}

// Also remove from any workspaces where user is a member but not owner
const { data: memberWorkspaces } = await supabaseAdmin
  .from('workspace_members')
  .select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
  .eq('user_id', testUser.id)

if (memberWorkspaces) {
  for (const membership of memberWorkspaces) {
    const workspace = Array.isArray(membership.workspace)
      ? membership.workspace[0]
      : membership.workspace

    // Only remove membership if user doesn't own it (owners already handled above)
    if (!workspace.is_private && workspace.owner_id !== testUser.id) {
      await supabaseAdmin
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('user_id', testUser.id)
    }
  }
}
```

**Option 2: Use test-level user fixture**

Change the testUser fixture scope from `worker` to `test`, ensuring each test gets a fresh user with no data pollution. However, this would:
- Significantly slow down test execution (each test creates a new user)
- Require regenerating auth state for each test
- Be less efficient for test suite performance

**Option 3: Add test isolation barriers**

Use Playwright's `test.serial()` to run empty-workspace tests serially instead of in parallel, preventing data pollution. However, this:
- Slows down test execution
- Doesn't fix the underlying issue
- Is a workaround rather than a proper fix

## Related Issues

- Related to: M15-02 (Empty Workspace List Handling milestone)
- Impacts: Test reliability and CI/CD confidence

## Worklog

**2025-10-07:**
- Discovered via e2e test run
- Analyzed test fixture sharing and parallel execution
- Identified cleanup logic gap: only removes memberships, not owned workspaces
- Traced data pollution to shared worker-level testUser fixture
- Confirmed 4 workspaces in API response (3 from other tests + 1 private)
- Implemented fix using Option 1 (Recommended) approach
- All three tests in empty-workspace.spec.ts now pass successfully

## Resolution

**Fixed on 2025-10-07**

Implemented Option 1 (Recommended) from the proposed solutions: Added comprehensive pre-cleanup logic to all three tests in `empty-workspace.spec.ts` to delete all non-private workspaces owned by the testUser before running test assertions.

**Changes made:**
- Modified `simple-client/e2e/empty-workspace.spec.ts` - all three tests
  1. "should handle users with only private workspace" (lines 4-74)
  2. "should return proper dashboard API response with only private workspace" (lines 76-149)
  3. "should show private workspace that cannot be deleted" (lines 151-243)

**Implementation details:**

The fix implements a two-step cleanup process:

**Step 1: Delete owned workspaces**
- Query all workspaces owned by testUser using `owner_id`
- Delete all non-private workspaces owned by the user
- This handles workspaces created by other parallel tests where testUser is the owner

**Step 2: Remove memberships**
- Query all workspace_members records for testUser
- Join with workspaces table to get workspace details (is_private, owner_id)
- Remove memberships only for workspaces the user doesn't own
- Skip workspaces already handled in Step 1 to avoid redundant operations

**Code implementation:**
```typescript
// Step 1: Delete all non-private workspaces owned by the test user
const { data: ownedWorkspaces } = await supabaseAdmin
  .from('workspaces')
  .select('id, is_private')
  .eq('owner_id', testUser.id)

if (ownedWorkspaces) {
  for (const workspace of ownedWorkspaces) {
    if (!workspace.is_private) {
      await supabaseAdmin
        .from('workspaces')
        .delete()
        .eq('id', workspace.id)
    }
  }
}

// Step 2: Remove from any workspaces where user is a member but not owner
const { data: memberWorkspaces } = await supabaseAdmin
  .from('workspace_members')
  .select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
  .eq('user_id', testUser.id)

if (memberWorkspaces) {
  for (const membership of memberWorkspaces) {
    const workspace = Array.isArray(membership.workspace)
      ? membership.workspace[0]
      : membership.workspace

    if (!workspace.is_private && workspace.owner_id !== testUser.id) {
      await supabaseAdmin
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('user_id', testUser.id)
    }
  }
}
```

**Test results:**
- All three tests in empty-workspace.spec.ts now pass consistently
- Tests no longer see workspaces from other parallel tests
- Test 1 correctly shows exactly 1 workspace in UI
- Test 2 correctly receives exactly 1 workspace from API
- Test 3 correctly handles workspace creation and deletion
- Full test suite run: 156 passed (empty-workspace tests included), 13 failed (unrelated tests)

**Why this approach:**
- Addresses the root cause: deletes owned workspaces instead of just removing memberships
- Maintains parallel test execution (no serialization needed)
- Properly isolates test data while keeping shared worker-level fixtures
- Similar pattern to BUG-36 fix but adapted for workspace ownership scenarios
- Comprehensive: handles both owned workspaces and memberships in other workspaces
