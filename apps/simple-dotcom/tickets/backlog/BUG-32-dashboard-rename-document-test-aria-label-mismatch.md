# [BUG-32]: Dashboard rename document E2E test fails due to aria-label mismatch

Date reported: 2025-10-06
Date last updated: 2025-10-06
Date resolved:

## Status

- [X] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [X] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [X] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [X] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright test)
- OS: macOS Darwin 24.6.0
- Environment: local (E2E test)
- Affected version/commit: 9144bdd26 (current branch: simple-dotcom)

## Description

The E2E test "should allow renaming document from dashboard" is failing because the test is looking for a button with `aria-label="Actions"`, but the actual ActionMenu component renders a button with `aria-label="Open menu"`. This causes the test to fail with a timeout after being unable to locate the expected element.

The test failure occurs consistently on line 685 of `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/dashboard.spec.ts`.

## Steps to Reproduce

1. Run the dashboard E2E tests: `yarn e2e-dotcom dashboard.spec.ts`
2. The test "should allow renaming document from dashboard" (line 659) attempts to:
   - Create a workspace and document
   - Navigate to the dashboard
   - Hover over the document item
   - Click on a button with `aria-label="Actions"`
3. Test fails because the button cannot be found

## Expected Behavior

What should happen:
- The test should find the actions button when hovering over a document
- Clicking the button should open the action menu
- The rename option should be available
- User should be able to rename the document successfully

## Actual Behavior

What actually happens:
- Test hovers over document successfully
- Test attempts to find button with `aria-label="Actions"`
- No such button exists (actual button has `aria-label="Open menu"`)
- Test times out after 5000ms initially, then 30000ms on retry
- Error: `locator.click: Target page, context or browser has been closed`

## Screenshots/Videos

Screenshots available at:
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/test-results/dashboard-Global-Dashboard-3636a-ing-document-from-dashboard-chromium/test-failed-1.png`
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/test-results/dashboard-Global-Dashboard-3636a-ing-document-from-dashboard-chromium/test-failed-2.png`

Trace available at:
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/test-results/dashboard-Global-Dashboard-3636a-ing-document-from-dashboard-chromium-retry1/trace.zip`

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="document-{id}"]').locator('button[aria-label="Actions"]')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms

On retry:
Test timeout of 30000ms exceeded.
Error: locator.click: Target page, context or browser has been closed
```

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/dashboard.spec.ts` (lines 683-685)
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/shared/ActionMenu.tsx` (line 77)
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/components/documents/DocumentActions.tsx`
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 686-692)

## Possible Cause

The root cause is an inconsistency between the test expectations and the actual implementation:

1. The test expects a button with `aria-label="Actions"`
2. The ActionMenu component renders a button with `aria-label="Open menu"`
3. This mismatch was likely introduced in commit aad940b77 when the DocumentActions component was integrated into the dashboard

The ActionMenu is a shared component that uses a generic "Open menu" label, while the test expects a more specific "Actions" label.

## Proposed Solution

Two possible approaches:

### Option 1: Update the test to use the correct aria-label
```typescript
// In dashboard.spec.ts line 684
const actionsButton = docItem.locator('button[aria-label="Open menu"]')
```

### Option 2: Make ActionMenu accept a custom aria-label prop
```typescript
// In ActionMenu.tsx
interface ActionMenuProps {
  items: ActionMenuItem[]
  trigger?: React.ReactNode
  className?: string
  ariaLabel?: string // Add this
}

// Line 77
aria-label={ariaLabel || "Open menu"}

// In DocumentActions.tsx
return <ActionMenu items={items} ariaLabel="Actions" />
```

Option 1 is simpler but makes the test more fragile to future changes in the shared component. Option 2 provides more flexibility and semantic accuracy but requires modifying the component API.

## Related Issues

- Related to: BUG-06 (dashboard document list missing actions menu) - This was the original bug that added the DocumentActions menu
- Similar test also failing: "should show document actions menu on hover" (line 640)

## Worklog

**2025-10-06:**
- Initial investigation found aria-label mismatch between test expectations and ActionMenu implementation
- Traced issue to commit aad940b77 which integrated DocumentActions into dashboard
- Identified two potential solutions for fixing the mismatch
- Created comprehensive bug report with full context and reproduction steps

## Resolution

(To be filled when resolved)