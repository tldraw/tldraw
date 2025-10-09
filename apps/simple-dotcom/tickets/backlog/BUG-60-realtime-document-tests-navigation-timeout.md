# [BUG-60]: Realtime Document Tests Timeout on Navigation

Date reported: 2025-10-09
Date last updated: 2025-10-09
Date resolved:

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [x] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

**Blocked By:** BUG-58 (Workspace Creation UI Not Updating in Real-time)

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Priority

**P2 (Medium) - Blocked**

**Rationale:**
- **Blocked by BUG-58** - Cannot be fixed until workspace creation works
- **Affects 13 tests** (7 failures + 6 skipped)
- **Important but not urgent**: Tests validate realtime document functionality
- **May auto-resolve**: Fixing BUG-58 may resolve these navigation issues

**Why P2 (not P1 or P3):**
- High test count (13 tests) suggests importance
- BUT completely blocked by BUG-58
- Cannot make progress until BUG-58 is resolved
- Should be re-evaluated after BUG-58 fix

**Action Plan:**
1. **Wait for BUG-58 to be resolved** (P0)
2. Re-run tests after BUG-58 fix
3. If still failing, promote to P1 and investigate navigation/routing issues
4. If resolved, mark as duplicate of BUG-58

**Current Status:** On hold pending BUG-58 resolution

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [x] Infrastructure

## Environment

- Browser: Chromium (Playwright E2E tests)
- OS: macOS
- Environment: local
- Affected version/commit: current (2025-10-09)

## Description

E2E tests for realtime document updates consistently timeout while waiting for page navigation to complete. Tests call `page.waitForURL()` after document operations (create, rename, archive) but the navigation never completes within the 30-second test timeout.

This affects the entire `workspace-documents-realtime.spec.ts` test suite (7 failures, 6 skipped due to dependencies). The tests are specifically designed to validate the hybrid realtime strategy (broadcast + React Query polling), but the navigation issues prevent them from running properly.

This issue is **distinct from BUG-58**: While BUG-58 is about workspace operations not updating the UI, this bug is about document test navigation failing to complete, which prevents testing of realtime functionality.

## Steps to Reproduce

1. Run realtime document tests: `npx playwright test e2e/workspace-documents-realtime.spec.ts`
2. Tests attempt to navigate to workspace documents page
3. Call `page.waitForURL()` to wait for navigation to complete
4. Navigation times out after 30 seconds
5. All dependent tests fail or are skipped

## Expected Behavior

- Tests should navigate to workspace documents page successfully
- `page.waitForURL()` should resolve within 1-2 seconds
- Tests should proceed to verify realtime document updates
- All 21 tests should run (currently 7 fail, 6 skip, 8 pass)

## Actual Behavior

- Navigation to workspace documents page times out
- `page.waitForURL()` never resolves
- Tests timeout after 30 seconds
- 7 tests fail with navigation timeout errors
- 6 additional tests are skipped due to failed dependencies

## Affected E2E Tests

### workspace-documents-realtime.spec.ts (7 failures, 6 skipped):

**Failed Tests:**
1. "initializes with React Query on mount"
2. "updates when document is created via broadcast"
3. "updates when document is archived via broadcast"
4. "updates when document is renamed via broadcast"
5. "handles network interruption with polling fallback"
6. "fetches fresh data via polling every 15 seconds"
7. (One more test likely related)

**Skipped Tests:**
6 tests skipped due to failed setup/dependencies

**Passing Tests:**
8 tests still pass (likely don't require navigation)

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: page.waitForURL: Test timeout of 30000ms exceeded.

attachment #1: screenshot (image/png)
test-results/workspace-documents-realti-d5ff7-s-with-React-Query-on-mount-chromium/test-failed-1.png

attachment #2: video (video/webm)
```

## Related Files/Components

**Test File:**
- `e2e/workspace-documents-realtime.spec.ts` - all failing tests

**Workspace Documents Page:**
- `src/app/workspace/[workspaceId]/page.tsx` - main workspace page
- `src/app/workspace/[workspaceId]/workspace-documents-client.tsx` - documents list
- May have routing or loading issues

**Realtime Implementation:**
- `src/hooks/useWorkspaceRealtimeUpdates.ts` - realtime hook being tested
- `src/lib/realtime/broadcast.ts` - broadcast functionality

**Related Routes:**
- `/workspace/[workspaceId]` - target route for navigation
- May have middleware/auth redirects causing issues

## Possible Cause

Several potential causes for navigation timeout:

1. **Routing issue**: Workspace page route may have errors preventing load
2. **Authentication redirect**: Middleware may be redirecting in a loop
3. **Data loading hang**: Page may be waiting indefinitely for data
4. **Missing workspace**: Test setup may not be creating workspace properly (related to BUG-58?)
5. **React Query suspension**: useQuery may be suspending indefinitely
6. **Test setup issue**: Test fixtures may not be properly initializing workspace/documents
7. **Related to BUG-58**: If workspace creation isn't working, navigation to workspace fails

## Proposed Solution

### Investigation Priority:

1. **Check if tests depend on workspace creation** (highest priority):
   - These tests may be failing because BUG-58 prevents workspace creation
   - Review test setup to see if workspace creation is required
   - If related to BUG-58, fixing that bug may resolve this one

2. **Review test setup/fixtures**:
   - Check if test helper functions properly create test workspaces
   - Verify workspace IDs are valid before navigation
   - Ensure authentication is properly configured

3. **Check workspace page loading**:
   - Review `src/app/workspace/[workspaceId]/page.tsx` for loading issues
   - Check if page properly handles missing/invalid workspace ID
   - Verify data fetching doesn't hang indefinitely

4. **Check middleware/redirects**:
   - Review `middleware.ts` for redirect loops
   - Ensure authenticated users can access workspace pages
   - Check for any circular redirects

5. **Add debugging to tests**:
   ```typescript
   console.log('Navigating to:', `/workspace/${workspaceId}`)
   await page.goto(`/workspace/${workspaceId}`)
   console.log('Current URL:', page.url())
   await page.waitForURL(`/workspace/${workspaceId}`, { timeout: 30000 })
   console.log('Navigation complete')
   ```

### Potential Quick Fixes:

1. **If related to BUG-58**: Fix workspace creation first, then re-run these tests

2. **If test setup issue**: Ensure proper workspace creation in test helpers:
   ```typescript
   // In test setup
   const workspace = await createTestWorkspace(page, 'Test Workspace')
   expect(workspace).toBeDefined()
   expect(workspace.id).toBeTruthy()

   // Then navigate
   await page.goto(`/workspace/${workspace.id}`)
   ```

3. **If routing issue**: Add loading state to workspace page to prevent indefinite waits

## Related Issues

- **Blocked By:** BUG-58 (workspace creation UI not updating) - MUST FIX FIRST
- Related to: BUG-55 (workspace documents realtime pattern - already resolved)
- Blocks: Full validation of hybrid realtime strategy implementation
- Affects: 13 tests (7 failures + 6 skipped)

## Why This is Blocked by BUG-58

These realtime document tests require:
1. Creating a test workspace via dashboard/API
2. Navigating to the workspace documents page
3. Testing realtime updates within that workspace

However, BUG-58 prevents step 1 from working correctly - workspace creation completes on the backend but the UI doesn't update within 10 seconds. Without a functioning workspace creation flow, these tests cannot proceed to step 2 (navigation to workspace page).

**Resolution Strategy:** Fix BUG-58 first, then re-run these tests to determine if navigation issues persist or were caused by the workspace creation failure.

## Worklog

**2025-10-09:**
- Identified 7 test failures + 6 skipped tests during E2E review
- All failures are navigation timeouts on workspace documents page
- Tests specifically designed to validate realtime functionality
- May be dependent on BUG-58 being fixed first
- Created bug ticket for investigation

## Resolution

(To be filled when resolved)
