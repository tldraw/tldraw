# BUG-12: Workspace Creation Modal Not Opening from Dashboard

**Status:** Open
**Priority:** High
**Estimate:** 3 hours
**Related Tests:** e2e/member-limit.spec.ts:4
**Related Bugs:** BUG-06, BUG-11

## Problem

When clicking the "Create Workspace" button on the dashboard, the workspace creation modal does not open or the "Enter workspace name" input field does not appear. The test times out after 30 seconds trying to find the input field.

## Error Details

```
Test timeout of 30000ms exceeded.

Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByPlaceholder('Enter workspace name')

  14 | 		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
```

## Test Flow

1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. **FAILS**: Input field with placeholder "Enter workspace name" never appears
4. Test times out after 30 seconds

## Root Cause

The workspace creation modal is either:
- Not opening when the button is clicked
- Opening but not rendering the input field
- Has JavaScript errors preventing the modal from functioning
- Missing the required UI components

This is related to BUG-06 (workspace name not visible after creation) and BUG-11 (workspace creation API failing), suggesting a broader issue with the workspace creation flow.

## Expected Behavior

When clicking "Create Workspace" on the dashboard:
1. A modal should open
2. The modal should contain an input field with placeholder "Enter workspace name"
3. User should be able to enter a name and click "Create"
4. Workspace should be created and user redirected to it

## Affected Tests

- `e2e/member-limit.spec.ts:4` - shows warning when approaching member limit
- `e2e/member-limit.spec.ts:53` - prevents joining workspace when at member limit
- `e2e/member-limit.spec.ts:123` - shows warning in API response when near limit
- `e2e/workspace-modal-ux.spec.ts:65` - should prevent duplicate workspace names

## Acceptance Criteria

- [ ] "Create Workspace" button opens the modal
- [ ] Modal contains the workspace name input field
- [ ] Input field is accessible and functional
- [ ] Test can proceed past the workspace creation step
