# [BUG-45]: Invite Page UI States Not Rendering Correctly

Date created: 2025-10-07
Date last updated: 2025-10-08
Date completed: -

**Consolidates:** BUG-38, BUG-39, BUG-41

## Status

- [ ] Not Started
- [x] In Progress
- [ ] Blocked
- [ ] Done

## Priority

**P1 (High) - Fix Soon**

**Rationale:**
- **Affects 4 E2E tests** (invite.spec.ts)
- **Partially resolved**: 1 of 3 sub-issues already fixed (BUG-39)
- **Clear fix path**: Likely database migration issue, not complex code problem
- **Quick win**: Running `supabase db reset` may resolve remaining 2 issues
- **User impact**: Invitation system is important but not blocking core functionality
- **Workaround exists**: Users can still join workspaces via direct API if needed

**Why not P0:**
- Already 50% resolved (4/8 tests passing)
- Clear investigation path and likely simple fix
- Does not block other bugs
- Invitation flow is secondary to core workspace operations

**Suggested Fix:**
1. Run `supabase db reset` to apply all migrations
2. Verify migration `20251008130000_bug_26_enable_invitation_links_by_default.sql` is applied
3. Re-run invite tests
4. If still failing, investigate token regeneration logic

**Previous Priority:** P0 (Critical)
**New Priority:** P1 (High) - demoted because BUG-58 has broader impact

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
- [x] Testing
- [ ] Infrastructure

## Description

The invite page at `/invite/[token]` is not correctly displaying UI states for different invitation scenarios. The client component `invite-accept-client.tsx` has all the necessary UI implementations (valid, already_member, regenerated states), but these states are not being rendered when users visit the page.

This affects multiple E2E tests:
- `invite.spec.ts` > "Unauthenticated User Flow" > "should join workspace after signup"
- `invite.spec.ts` > "Authenticated User Flow" > "should join workspace immediately when authenticated"
- `invite.spec.ts` > "Authenticated User Flow" > "should show already member message"
- `invite.spec.ts` > "Error Scenarios" > "should show error for regenerated token"

## Consolidated Issues

### BUG-38: "Join Workspace" Button Not Visible
When an authenticated non-member visits a valid invite link, the "Join Workspace" button is not visible.
- Expected: Button visible at line 80 of `invite-accept-client.tsx`
- Actual: Element not found

### BUG-39: "Already a Member" Message Not Visible
When a user who is already a member/owner visits an invite link, the "Already a Member" message is not visible.
- Expected: Message visible at line 135 of `invite-accept-client.tsx`
- Actual: Element not found

### BUG-41: "Link Expired" Message Not Visible
When a user visits an old/regenerated invite token, the "Link Expired" message is not visible.
- Expected: Message visible at line 158 of `invite-accept-client.tsx`
- Actual: Element not found

## Root Cause Analysis

The UI components exist and are properly implemented in `invite-accept-client.tsx`:
- Line 60-88: `status === 'valid'` → Shows "Join Workspace" button
- Line 131-152: `status === 'already_member'` → Shows "Already a Member" message
- Line 154-175: `status === 'regenerated'` → Shows "Link Expired" message

Potential causes:
1. **Server-side status determination issue**: `getInviteInfo()` in `page.tsx` (lines 12-126) may not be returning the correct status
2. **Props not passed correctly**: Status/data not being passed from server component to client component
3. **Race condition**: Component rendering before props are available
4. **Incorrect redirect logic**: Page redirecting before rendering UI (line 140-143)

## Steps to Reproduce

### For "Join Workspace" (valid state):
1. Create workspace with enabled invitation link
2. As authenticated non-member, visit `/invite/[token]`
3. Look for "Join Workspace" button

### For "Already a Member" (already_member state):
1. Create workspace (user becomes owner)
2. Get invitation link for that workspace
3. As the owner, visit `/invite/[token]`
4. Look for "Already a Member" message

### For "Link Expired" (regenerated state):
1. Create workspace with invite link (token A)
2. Regenerate invite link via API (creates token B)
3. As authenticated user, visit `/invite/[tokenA]`
4. Look for "Link Expired" message

## Expected Behavior

- Page should correctly detect invitation status server-side
- Appropriate UI state should render based on status
- All messages and buttons should be visible
- Users should be able to interact with the page appropriately

## Actual Behavior

- UI states are not rendering (elements not found)
- Tests timeout waiting for expected elements
- Page may be stuck in loading state or redirecting

## Investigation Steps

1. **Check server-side logic** (`page.tsx` lines 12-126):
   - Verify `getInviteInfo()` correctly determines status
   - Add logging to see what status is returned
   - Check database queries for membership/regeneration detection

2. **Check prop passing** (`page.tsx` line 147-155):
   - Verify status is passed to `InviteAcceptClient`
   - Ensure all required props are provided
   - Check for null/undefined values

3. **Check client rendering** (`invite-accept-client.tsx`):
   - Add console.logs to see which state is rendering
   - Verify conditional rendering logic
   - Check if component is mounting properly

4. **Check redirects** (`page.tsx` line 140-143):
   - Ensure redirect only happens for `requires_auth` status
   - Verify other statuses proceed to render

## Acceptance Criteria

- [ ] Valid invite links show "Join Workspace" button
- [ ] Already-member status shows "Already a Member" message
- [ ] Regenerated tokens show "Link Expired" message
- [ ] Server correctly determines status for all scenarios
- [ ] Client component renders appropriate UI for each status
- [ ] All related E2E tests pass

## Related Files

- `simple-client/src/app/invite/[token]/page.tsx` - Server component with status logic
- `simple-client/src/app/invite/[token]/invite-accept-client.tsx` - Client UI component
- `simple-client/e2e/invite.spec.ts:89-278` - Failing tests
- `/api/invite/[token]/join` - Join API endpoint

## Testing Requirements

- [x] E2E tests exist and are failing
- [ ] Manual testing required
- [ ] Server-side logging needed
- [ ] Fix verification needed

## Notes

The UI implementation is complete and correct. The issue is likely in the server-side status determination or data flow from server to client component. Fixing the root cause should resolve all three related bugs simultaneously.

## Progress Update (2025-10-08)

**Overall Status: 1 of 3 Fixed, 2 Pending Database Reset**

### ✅ BUG-39 - RESOLVED
**Issue:** "Already a Member" message not visible
**Root Cause:** Incorrect check ordering in `page.tsx` - link validity was checked before membership status
**Fix:** Reordered checks so membership status is verified FIRST (lines 48-120)
**Result:** Test now passing ✅

### ⚠️ BUG-38 - IN PROGRESS
**Issue:** "Join Workspace" button not visible
**Status:** UI implementation is correct, but tests fail because invitation links are created with `enabled=false`
**Hypothesis:** Migration `20251008130000_bug_26_enable_invitation_links_by_default.sql` may not be applied
**Next Step:** Database reset required

### ⚠️ BUG-41 - IN PROGRESS
**Issue:** "Link Expired" message not visible for regenerated tokens
**Status:** UI implementation is correct, but test shows "Link Disabled" instead of "Link Expired"
**Hypothesis:** Same database migration issue as BUG-38
**Next Step:** Database reset required

**Failing Test:** `invite.spec.ts` > "Error Scenarios" > "should show error for regenerated token"

**Test Behavior:** The test regenerates an invitation link and tries to access the old token. Instead of showing "Link Expired", it shows "Link Disabled" message. This suggests the old token is being marked as disabled rather than expired/regenerated, OR the new invitation link is being created with `enabled=false` by default.

**Investigation Notes from BUG-41:**
- UI implementation in `invite-accept-client.tsx` is complete (line 154-174)
- Check order bug was fixed (see BUG-39)
- Root cause: Migration `20251008130000_bug_26_enable_invitation_links_by_default.sql` may not be applied in test environment
- Database may not have all migrations applied

### Key Findings
1. **UI Implementation:** All 6 invite page states are properly implemented in `invite-accept-client.tsx`
2. **Check Order Bug:** Fixed by reordering server-side status checks
3. **Database Issue:** Invitation links appear to be created with `enabled=false` despite migration setting default to `true`
4. **Test Results:** 4/8 tests passing (up from 3/8 before check order fix)

### Action Items
- [x] Fix check order bug (BUG-39 resolved)
- [ ] Run `supabase db reset` to apply all migrations
- [ ] Verify migration `20251008130000_bug_26_enable_invitation_links_by_default.sql` is applied
- [ ] Check regeneration logic to ensure old tokens are properly marked as regenerated vs disabled
- [ ] Re-run tests after database reset
- [ ] Verify all 8 invite tests pass after reset

### Screenshots Available
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-1.png`
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-2.png`
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-3.png`
