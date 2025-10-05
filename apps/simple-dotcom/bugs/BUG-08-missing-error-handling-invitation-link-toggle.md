# [BUG-08]: Missing Error Handling for Invitation Link Toggle

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved:

## Status

- [x] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When toggling an invitation link (enable/disable) fails due to a network error, no error message is displayed to the user. The UI should show a clear error message indicating the operation failed.

## Steps to Reproduce

1. Navigate to workspace settings page
2. Intercept API request for invitation link toggle and force it to fail
3. Click the "Disable Link" or "Enable Link" button
4. Observe: No error message is displayed to the user

## Expected Behavior

When the invitation link toggle operation fails due to a network error or API error, the user should see a clear error message, such as "Failed to toggle invitation link" or similar.

## Actual Behavior

No error message is displayed when the invitation link toggle operation fails. The error is either not being caught, being caught but not displayed, or using a different error message format than expected.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText(/Failed to toggle invitation link/)
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Related Files/Components

- Workspace settings page (invitation link management component)
- `e2e/invitation-links.spec.ts:334` - Test expecting error handling

## Possible Cause

The workspace settings page does not properly handle and display errors when the toggle operation fails. The error is either not being caught, being caught but not displayed in the UI, or using a different error message format than expected.

## Proposed Solution

1. Add proper error handling to invitation link toggle operations
2. Catch API errors when toggling invitation links
3. Display user-friendly error message when operation fails
4. Ensure error message matches what tests expect

## Related Issues

- Related to: E2E test failures
- Test: `e2e/invitation-links.spec.ts:334` - handles network errors gracefully

## Worklog

## Resolution