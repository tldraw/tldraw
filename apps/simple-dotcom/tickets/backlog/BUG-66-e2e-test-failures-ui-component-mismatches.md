# BUG-66: E2E Test Failures - UI Component Mismatches

## Summary
Multiple E2E tests are failing due to mismatches between test expectations and actual UI component behavior. Tests are looking for elements with test IDs that don't exist or have incorrect text content.

## Metadata
- **Date reported**: 2025-10-09
- **Status**: New
- **Severity**: High
- **Category**: Testing/UI Components
- **Affected tests**: workspace-modal-ux.spec.ts (3 tests), profile.spec.ts (1 test)
- **E2E baseline**: 194 total tests, 4 failing

## Description
Four E2E tests are consistently failing after recent bug fixes. The failures indicate that UI components are not properly exposing test IDs or displaying expected content, preventing automated testing from validating functionality.

## Test Failures

### 1. workspace-modal-ux.spec.ts: "should show validation errors inline"
- **Error**: Cannot find element with `[data-testid="validation-error"]`
- **Expected**: Validation error should be visible when submitting empty workspace name
- **Actual**: Element not found after 5000ms timeout
- **Impact**: Cannot verify validation error display

### 2. workspace-modal-ux.spec.ts: "should prevent duplicate workspace names"
- **Error**: Cannot find element with `[data-testid="validation-error"]`
- **Expected**: Error message should display when creating duplicate workspace
- **Actual**: Element not found after 5000ms timeout
- **Impact**: Cannot verify duplicate name prevention

### 3. workspace-modal-ux.spec.ts: "should keep modal open during request and handle errors"
- **Error**: Button shows "Processing..." instead of "Creating..."
- **Expected**: Button text should be "Creating..." during request
- **Actual**: Button text is "Processing..."
- **Impact**: Test cannot verify correct loading state

### 4. profile.spec.ts: "should hide unsaved changes indicator after successful save"
- **Error**: Cannot find element with `[data-testid="success-message"]`
- **Expected**: Success message should be visible after saving profile
- **Actual**: Element not found after 5000ms timeout
- **Impact**: Cannot verify successful save indication

## Steps to Reproduce
1. Run E2E tests: `yarn workspace simple-client test:e2e`
2. Observe failures in workspace-modal-ux.spec.ts (3 tests)
3. Observe failure in profile.spec.ts (1 test)

## Expected vs Actual Behavior

**Expected**:
- Validation errors should display with proper test IDs
- Button should show "Creating..." during workspace creation
- Success messages should display with proper test IDs

**Actual**:
- Test IDs for validation-error and success-message are missing
- Button shows "Processing..." instead of "Creating..."

## Error Logs
```
[chromium] › e2e/workspace-modal-ux.spec.ts:39:6
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="validation-error"]')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms

[chromium] › e2e/workspace-modal-ux.spec.ts:95:6
Error: expect(locator).toContainText(expected) failed
Locator: locator('[data-testid="confirm-create-workspace"]')
Expected string: "Creating..."
Received: "Processing..."

[chromium] › e2e/profile.spec.ts:259:6
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="success-message"]')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms
```

## Affected Components
- `/app/dashboard/page.tsx` - Dashboard workspace modal
- `/components/ui/prompt-dialog.tsx` - PromptDialog component (likely missing validation error display)
- `/app/profile/page.tsx` - Profile page (missing success message)

## Root Cause Analysis

### Issue 1-2: Missing validation-error test ID
The workspace creation modal is not displaying validation errors with the expected test ID. The PromptDialog component accepts a `validationError` prop but may not be rendering it with the correct test ID.

### Issue 3: Incorrect button text
The button loading state shows "Processing..." but tests expect "Creating...". This is a simple text content mismatch.

### Issue 4: Missing success message
The profile page doesn't display a success message with the expected test ID after saving.

## Possible Solution

1. **Update PromptDialog component**: Ensure validation errors are rendered with `data-testid="validation-error"`
2. **Fix button loading text**: Change "Processing..." to "Creating..." for consistency
3. **Add success message to profile page**: Display success message with `data-testid="success-message"` after successful save
4. **Review dashboard workspace modal**: Ensure it properly passes validation errors to PromptDialog

## Priority
High - These test failures prevent verification of critical UI flows and block the CI/CD pipeline. While the functionality may work, we cannot automatically verify it.

## Related Issues
- BUG-63: PromptDialog auto-close issue (recently fixed)
- BUG-64: PromptDialog hardcoded test IDs (recently fixed)
- BUG-65: Workspace modal state management (partially fixed)

## Notes
- Tests were working previously, indicating a regression
- The PromptDialog component was recently modified as part of BUG-63/64 fixes
- Need to ensure test IDs are consistently applied across all UI components

## Resolution
_To be filled when resolved_

## Date resolved
_To be filled when resolved_