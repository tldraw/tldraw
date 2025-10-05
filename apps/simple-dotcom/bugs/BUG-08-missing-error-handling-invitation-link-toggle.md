# BUG-08: Missing Error Handling for Invitation Link Toggle

**Status:** Open
**Priority:** Medium
**Estimate:** 2 hours
**Related Tests:** e2e/invitation-links.spec.ts:334

## Problem

When toggling an invitation link (enable/disable) fails due to a network error, no error message is displayed to the user. The UI should show a clear error message indicating the operation failed.

## Error Details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText(/Failed to toggle invitation link/)
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Test Flow

1. Navigate to workspace settings page
2. Intercept API request for invitation link toggle and force it to fail
3. Click the "Disable Link" or "Enable Link" button
4. **FAILS**: No error message is displayed to the user

## Root Cause

The workspace settings page (likely in the invitation link management component) does not properly handle and display errors when the toggle operation fails. The error is either:
- Not being caught
- Being caught but not displayed in the UI
- Using a different error message format than expected

## Expected Behavior

When the invitation link toggle operation fails due to a network error or API error, the user should see a clear error message, such as "Failed to toggle invitation link" or similar.

## Affected Tests

- `e2e/invitation-links.spec.ts:334` - handles network errors gracefully

## Acceptance Criteria

- [ ] Error handling added to invitation link toggle operations
- [ ] Error message displayed to user when toggle fails
- [ ] Test passes when run individually
