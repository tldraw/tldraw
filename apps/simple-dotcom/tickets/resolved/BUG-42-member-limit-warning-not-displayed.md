# [BUG-42]: Member Limit Warning Banner Not Displayed

Date created: 2025-10-07
Date last updated: 2025-10-08
Date completed: 2025-10-08

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (Critical - Blocking)
- [x] P1 (High - Should Fix Soon)
- [ ] P2 (Medium - Normal Priority)
- [ ] P3 (Low - Nice to Have)

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
- [ ] Testing
- [ ] Infrastructure

## Description

When a workspace approaches its member limit (90% capacity, e.g., 90 of 100 members), a warning banner should be displayed to inform the owner. This warning banner is not visible on the workspace members page.

This affects the E2E test:
- `member-limit.spec.ts` > "Workspace Member Limits" > "shows warning when approaching member limit"

## Steps to Reproduce

1. Create a workspace with the owner as a member (1 member)
2. Add 89 additional members via API to reach 90 members total
3. Navigate to the workspace members page as the owner
4. Look for the warning banner

## Expected Behavior

- Warning banner should be visible with text "Approaching member limit:"
- Banner should display the current member count (e.g., "This workspace has 90 of 100 members")
- Member count display should show "90 / 100 members"
- Warning should be prominent and noticeable

## Actual Behavior

- "Approaching member limit:" text is NOT visible (element not found)
- No warning banner is displayed
- Page loads but without the warning

## Error Message

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Approaching member limit:')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Potential Causes

1. **Warning banner not implemented**: The UI component for the warning may not exist
2. **Threshold calculation issue**: The code may not be calculating when to show the warning (90% threshold)
3. **Data not passed to UI**: The member count might not be passed from backend to frontend
4. **Conditional rendering issue**: The warning might have a bug in its conditional display logic
5. **Wrong page**: The warning might be expected on a different page (settings vs members)

## Acceptance Criteria

- [x] Warning banner is visible when workspace reaches 90% capacity (90+ members for limit of 100)
- [x] Banner displays current member count accurately
- [x] Banner text includes "Approaching member limit:" or similar
- [x] Warning is displayed prominently (top of page or prominent location)
- [x] Warning is only visible to workspace owners (not regular members)
- [x] E2E test passes

## Related Files

- `e2e/member-limit.spec.ts:4-51` - Failing test
- Workspace members page component
- Member count calculation logic
- Warning banner component

## Testing Requirements

- [x] E2E test exists and is failing
- [x] Manual testing required
- [x] Fix verification needed

## Implementation Notes

The warning should trigger when:
- `memberCount / memberLimit >= 0.9` (90% threshold)
- For standard workspaces: 90+ members out of 100

The warning should include:
- Clear heading: "Approaching member limit"
- Specific count: "This workspace has X of Y members"
- Visual prominence: Warning/alert styling (yellow/orange background)
- Action guidance: "Consider upgrading your plan" or similar

## Notes

This is a UX feature to warn workspace owners before they hit the hard limit, allowing them to take action (upgrade plan, remove inactive members, etc.) before new members are blocked from joining.

Screenshots available in test results:
- `test-results/member-limit-Workspace-Mem-6e00c-en-approaching-member-limit-chromium/test-failed-1.png`
- `test-results/member-limit-Workspace-Mem-6e00c-en-approaching-member-limit-chromium/test-failed-2.png`

## Resolution

**Fixed by:** Claude Code
**Date:** 2025-10-08

**Root Cause:**
The warning banner was already implemented in the UI, but the E2E test was failing due to two issues:

1. **Test Setup Issue:** The test was trying to extract the workspace ID from the URL after clicking the workspace name, which caused a redirect error. The proper pattern is to use `testData.createWorkspace()` helper.

2. **Test Data Issue:** The test was inserting members with the wrong column name (`workspace_role` instead of `role`), causing members to not be added correctly. The proper pattern is to use `testData.addWorkspaceMember()` helper.

**Changes Made:**

1. **UI Component Fix** (`simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx`):
   - Updated the warning banner structure to separate the heading from the description
   - Changed from inline text with `<strong>` to separate `<h3>` heading
   - This ensures the test's `getByText('Approaching member limit:')` can find the exact text match

2. **Test Fixes** (`simple-client/e2e/member-limit.spec.ts`):
   - Updated all three tests to use `testData.createWorkspace()` instead of UI navigation
   - Changed member insertion to use `testData.addWorkspaceMember()` with correct column names
   - This ensures members are properly added and counted

**Test Results:**
- E2E test `"shows warning when approaching member limit"` now passes ✅
- Warning banner correctly displays when workspace reaches 90+ members
- Member count shows "Members (90/100)" format
- Banner text matches test expectations
