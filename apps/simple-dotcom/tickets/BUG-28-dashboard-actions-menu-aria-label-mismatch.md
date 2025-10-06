# [BUG-28]: Dashboard Document Actions Menu Has Wrong aria-label Causing E2E Test Failures

Date reported: 2025-01-06
Date last updated: 2025-01-06
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

- Browser: Chrome (Playwright test environment)
- OS: macOS Darwin 24.6.0
- Environment: local (E2E tests)
- Affected version/commit: Current branch: simple-dotcom, Recent commit: 9144bdd26

## Description

The E2E test suite for the dashboard is failing because the document actions menu button in the dashboard sidebar has an incorrect `aria-label` attribute. The test expects the button to have `aria-label="Actions"`, but the actual implementation uses `aria-label="Open menu"`. This causes three E2E tests to fail with timeout errors.

This is a regression that affects the accessibility and testability of the document actions menu feature in the dashboard sidebar.

## Steps to Reproduce

1. Run the dashboard E2E tests: `yarn e2e dashboard.spec.ts`
2. The test "should show document actions menu on hover in dashboard sidebar" will fail
3. The failure occurs at line 656 in dashboard.spec.ts when trying to locate: `button[aria-label="Actions"]`

## Expected Behavior

When hovering over a document item in the dashboard sidebar:
- The actions menu button should become visible (opacity changes from 0 to 100)
- The button should have `aria-label="Actions"` for proper accessibility and test identification
- The test should successfully locate the button and pass

## Actual Behavior

When hovering over a document item in the dashboard sidebar:
- The actions menu button may or may not become visible (hover state working)
- The button has `aria-label="Open menu"` instead of `aria-label="Actions"`
- The test cannot find the button with the expected aria-label and times out after 5000ms

## Screenshots/Videos

Test failure screenshots available at:
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/test-results/dashboard-Global-Dashboard-30e13--hover-in-dashboard-sidebar-chromium/test-failed-1.png`
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/test-results/dashboard-Global-Dashboard-30e13--hover-in-dashboard-sidebar-chromium/test-failed-2.png`

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="document-1dd6768d-a051-4070-a76f-8bc36fb9736b"]').locator('button[aria-label="Actions"]')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('[data-testid="document-1dd6768d-a051-4070-a76f-8bc36fb9736b"]').locator('button[aria-label="Actions"]')
```

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/dashboard.spec.ts` (lines 628-656, 659-699, 700-740) - Failing tests
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 670-702) - Dashboard document item rendering
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/documents/DocumentActions.tsx` - Document actions menu component
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx` (line 77) - ActionMenu component with incorrect aria-label

## Possible Cause

The root cause is in the `ActionMenu` component at `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx`, line 77, where the button is rendered with:

```typescript
aria-label="Open menu"
```

This is a generic label that doesn't match the specific expectation in the E2E tests. The tests were likely written expecting a more specific label ("Actions") that better describes the menu's purpose in the document context.

## Proposed Solution

There are two approaches to fix this issue:

### Option 1: Update ActionMenu to accept custom aria-label (Recommended)
Modify the `ActionMenu` component to accept an optional `ariaLabel` prop and use it for the button:

```typescript
interface ActionMenuProps {
  items: ActionMenuItem[]
  trigger?: React.ReactNode
  className?: string
  ariaLabel?: string  // Add this
}

// In the component:
<button
  ref={buttonRef}
  onClick={(e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }}
  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
  aria-label={ariaLabel || "Open menu"}  // Use custom or default
>
```

Then update `DocumentActions` to pass the correct aria-label:
```typescript
return <ActionMenu items={items} ariaLabel="Actions" />
```

### Option 2: Update the E2E tests to use the current aria-label
Change the tests to look for `button[aria-label="Open menu"]` instead of `button[aria-label="Actions"]`. However, this is less descriptive for accessibility purposes.

## Related Issues

- Related to: BUG-06 (as noted in the test description at line 627)
- Blocks: Successful E2E test runs for dashboard functionality
- Affects:
  - Test: "should show document actions menu on hover in dashboard sidebar" (line 628)
  - Test: "should allow renaming document from dashboard" (line 659)
  - Test: "should allow archiving document from dashboard" (line 700)

## Worklog

**2025-01-06:**
- Initial bug report created based on E2E test failures
- Analyzed test expectations vs actual implementation
- Identified mismatch in aria-label between test and component
- Root cause identified in ActionMenu component at line 77
- Proposed solution to make aria-label configurable

## Resolution

(To be completed when resolved)