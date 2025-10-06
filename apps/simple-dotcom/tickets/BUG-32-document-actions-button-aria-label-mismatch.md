# [BUG-32]: Document Actions button aria-label mismatch causes E2E test failures

Date reported: 2025-10-06
Date last updated: 2025-10-06
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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All (E2E test failure)
- OS: All
- Environment: local/CI
- Affected version/commit: Current main branch

## Description

The Document Actions menu button in the dashboard sidebar has an aria-label mismatch that causes all three related E2E tests to fail. The tests are looking for a button with `aria-label="Actions"`, but the actual button rendered by the ActionMenu component uses `aria-label="Open menu"`. This prevents the E2E tests from finding and interacting with the document actions menu, blocking test automation for document management features.

## Steps to Reproduce

1. Run the E2E test suite: `cd simple-client && npm run test:e2e -- --grep "Document Actions Menu"`
2. Observe that all three tests in the "Document Actions Menu (BUG-06)" test suite fail:
   - "should show document actions menu on hover in dashboard sidebar" (line 628)
   - "should allow renaming document from dashboard" (line 659)
   - "should allow archiving document from dashboard" (line 700)
3. All tests fail at the same point when trying to find the Actions button

## Expected Behavior

What should happen:
- When hovering over a document item in the dashboard sidebar, an Actions button should appear
- The Actions button should have `aria-label="Actions"` to match the test expectations
- Clicking the Actions button should open a dropdown menu with options like Rename, Duplicate, Archive, and Delete
- The E2E tests should be able to locate the button using the selector `button[aria-label="Actions"]`

## Actual Behavior

What actually happens:
- The document items do render with a DocumentActions component
- The ActionMenu component renders a button with `aria-label="Open menu"` instead of `aria-label="Actions"`
- The E2E tests fail with a timeout error because they cannot find `button[aria-label="Actions"]`
- All document management E2E tests are blocked due to this mismatch

## Screenshots/Videos

N/A - E2E test failure

## Error Messages/Logs

```
Test: should allow archiving document from dashboard
Location: simple-client/e2e/dashboard.spec.ts:700

Error pattern (from all three failing tests):
- Timeout waiting for selector: button[aria-label="Actions"]
- The test attempts to: await actionsButton.click()
- But actionsButton is not found within the document item
```

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx` (line 77) - Contains the incorrect aria-label
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/documents/DocumentActions.tsx` - Uses ActionMenu component
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 686-699) - Renders DocumentActions in document items
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/dashboard.spec.ts` (lines 628-732) - Failing E2E tests

## Possible Cause

The root cause is a simple mismatch between the aria-label used in the ActionMenu component and what the E2E tests expect:

1. **ActionMenu.tsx (line 77)**: Uses `aria-label="Open menu"`
2. **E2E tests**: Look for `button[aria-label="Actions"]`

This appears to be either:
- A regression where the aria-label was changed without updating the tests
- Or tests that were written against a different implementation

The fix is straightforward but needs to be coordinated between the component and tests.

## Proposed Solution

There are two possible approaches to fix this issue:

### Option 1: Update the ActionMenu component (Recommended)
Change line 77 in `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx`:
```tsx
// From:
aria-label="Open menu"
// To:
aria-label="Actions"
```

This is preferred because:
- "Actions" is more semantic for a document actions menu
- It fixes all three tests without modification
- It's a minimal change to the codebase

### Option 2: Update the E2E tests
Update all three tests to look for `button[aria-label="Open menu"]` instead of `button[aria-label="Actions"]`

This is less preferred because:
- Requires updating multiple test files
- "Open menu" is less semantic than "Actions" for this specific use case
- More changes required

### Additional Considerations
- Consider making the aria-label configurable via props in ActionMenu to support different use cases
- Add a data-testid attribute as a more stable selector for E2E tests
- Consider adding unit tests for the ActionMenu component to catch such regressions

## Related Issues

- Related to: BUG-06 (original bug tracking in test suite name)
- Duplicates: None identified
- Blocks: All document management E2E tests

## Worklog

**2025-10-06:**
- Initial investigation of failing E2E tests
- Identified aria-label mismatch between component and tests
- Located exact source of issue in ActionMenu.tsx line 77
- Confirmed all three Document Actions Menu tests fail with same root cause
- Created comprehensive bug report with proposed solutions

## Resolution

(To be completed when resolved)