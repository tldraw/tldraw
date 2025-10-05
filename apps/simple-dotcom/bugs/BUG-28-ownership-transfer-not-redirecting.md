# BUG-15: Ownership Transfer Not Redirecting to Workspace Page

**Status:** Open
**Priority:** Medium
**Estimate:** 2 hours
**Related Tests:** e2e/ownership-transfer.spec.ts:4

## Problem

After transferring workspace ownership to another member, the page does not redirect back to the workspace page. The test times out waiting for the redirect after 30 seconds.

## Error Details

```
Test timeout of 30000ms exceeded.

Error: page.waitForURL: Test timeout of 30000ms exceeded.
waiting for navigation to "**/workspace/7b995540-caa3-4348-9a3b-a1e537925cd3" until "load"

  68 | 			await page.waitForURL(`**/workspace/${workspace.id}`)
```

## Test Flow

1. Create workspace with owner and member
2. Navigate to workspace settings
3. Perform ownership transfer operation
4. **FAILS**: Page does not redirect to workspace page

## Root Cause

After completing the ownership transfer:
- The API operation may be completing successfully
- But the redirect logic is missing or not executing
- User remains on the settings page instead of being redirected
- Or there may be an error preventing the operation from completing

## Expected Behavior

After transferring workspace ownership:
1. The transfer should complete successfully in the database
2. The page should redirect to the workspace page
3. The UI should reflect the new ownership

## Affected Tests

- `e2e/ownership-transfer.spec.ts:4` - owner can transfer ownership to another member

## Acceptance Criteria

- [ ] Ownership transfer completes successfully
- [ ] Page redirects to workspace after transfer
- [ ] UI updates to reflect new ownership
- [ ] Test passes when run individually
