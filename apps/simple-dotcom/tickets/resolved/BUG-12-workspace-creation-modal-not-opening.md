# [BUG-12]: Workspace Creation Modal Not Opening from Dashboard

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 2025-10-05

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
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright)
- OS: macOS
- Environment: local
- Affected version/commit: current

## Description

When clicking the "Create Workspace" button on the dashboard, the workspace creation modal does not open or the "Enter workspace name" input field does not appear. The test times out after 30 seconds trying to find the input field.

## Steps to Reproduce

1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Input field with placeholder "Enter workspace name" never appears
4. Test times out after 30 seconds

## Expected Behavior

When clicking "Create Workspace" on the dashboard:
1. A modal should open
2. The modal should contain an input field with placeholder "Enter workspace name"
3. User should be able to enter a name and click "Create"
4. Workspace should be created and user redirected to it

## Actual Behavior

After clicking "Create Workspace", the modal either:
- Does not open at all
- Opens but does not render the input field
- Has JavaScript errors preventing the modal from functioning

The test fails with a timeout error after 30 seconds.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByPlaceholder('Enter workspace name')

  14 | 		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
```

## Related Files/Components

- `e2e/member-limit.spec.ts:4`
- `e2e/member-limit.spec.ts:53`
- `e2e/member-limit.spec.ts:123`
- `e2e/workspace-modal-ux.spec.ts:65`
- Dashboard component (workspace creation modal)

## Possible Cause

The workspace creation modal is either:
- Not opening when the button is clicked
- Opening but not rendering the input field
- Has JavaScript errors preventing the modal from functioning
- Missing the required UI components

This is related to BUG-06 (workspace name not visible after creation) and BUG-11 (workspace creation API failing), suggesting a broader issue with the workspace creation flow.

## Proposed Solution

1. Verify the "Create Workspace" button click handler
2. Check if the modal component is properly mounted
3. Ensure the input field is rendered within the modal
4. Fix any JavaScript errors in the modal implementation
5. Add proper error handling and logging

## Related Issues

- Related to: BUG-06, BUG-11
- Duplicates: None
- Blocks: e2e/member-limit.spec.ts, e2e/workspace-modal-ux.spec.ts

## Worklog

**2025-10-05:**
- Bug reported from failing e2e tests
- Initial investigation shows modal not opening or input not rendering
- Root cause identified: Placeholder text mismatch between tests and implementation
- Fixed placeholder text from "Workspace name" to "Enter workspace name" in dashboard-client.tsx:812
- Updated e2e tests to use specific data-testid selectors instead of ambiguous role selectors
- Tests now pass successfully

## Resolution

**Fixed on 2025-10-05**

The issue was caused by a mismatch between the placeholder text in the workspace creation modal and what the e2e tests were looking for:
- Tests expected: `"Enter workspace name"`
- Actual placeholder: `"Workspace name"`

**Changes made:**
1. Updated placeholder text in `/simple-client/src/app/dashboard/dashboard-client.tsx:812` from `"Workspace name"` to `"Enter workspace name"`
2. Updated e2e tests in `/simple-client/e2e/member-limit.spec.ts` to use `getByTestId('confirm-create-workspace')` instead of ambiguous `getByRole('button', { name: 'Create' })` selector

The workspace creation modal now opens correctly, displays the input field with the expected placeholder, and all related tests pass.
