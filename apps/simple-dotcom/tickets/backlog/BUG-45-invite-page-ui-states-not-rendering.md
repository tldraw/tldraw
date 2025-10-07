# [BUG-45]: Invite Page UI States Not Rendering Correctly

Date created: 2025-10-07
Date last updated: -
Date completed: -

**Consolidates:** BUG-38, BUG-39, BUG-41

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (Critical - Blocking)
- [ ] P1 (High - Should Fix Soon)
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
