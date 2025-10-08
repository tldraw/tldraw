# [BUG-55]: Invite Test "regenerated token" Redirects to Dashboard Instead of Showing "Link Expired"

Date created: 2025-10-08
Date last updated: 2025-10-08
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [ ] P0 (Critical - Blocking)
- [ ] P1 (High - Should Fix Soon)
- [x] P2 (Medium - Normal Priority)
- [ ] P3 (Low - Nice to Have)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

The E2E test "should show error for regenerated token" is failing because the test user (who created and owns the workspace) is being redirected to the dashboard instead of seeing the "Link Expired" message when visiting an old/regenerated invitation token.

This is the **same root cause as BUG-54** - the check order fix from BUG-39 ensures that membership status is checked BEFORE link validity, so owners/members are redirected or shown their status regardless of whether the token is old/regenerated.

The test needs to be updated to use a **non-owner user** to properly test the "Link Expired" state for regenerated tokens.

## Test Failure

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Link Expired')
Expected: visible
Received: <element(s) not found>

Test: e2e/invite.spec.ts:275-308
Page: Shows dashboard (user redirected because they're already a member)
```

## Root Cause

**Test Design Issue:**
1. Test creates workspace as authenticatedPage user (becomes owner)
2. Test gets the initial invitation token
3. Test regenerates the invitation link (creates new token, invalidates old one)
4. Test creates a new user and signs them up
5. New user visits the OLD token (should see "Link Expired")
6. **BUT** - If the new user somehow became a member, OR if there's confusion about which workspace is being tested, they might be redirected

**More likely scenario:**
The test might be reusing a user who is already a member, or the workspace being tested has the test user as owner/member.

## Current Check Order (Working as Designed)

From `/invite/[token]/page.tsx` lines 48-120:
1. ✅ Check if user is owner → show "Already a Member" (may redirect)
2. ✅ Check if user is member → show "Already a Member" (may redirect)
3. Check if link is disabled → show "Link Disabled"
4. **Check if link is regenerated → show "Link Expired"**
5. Check member limit → show limit message
6. Otherwise → show "Join Workspace"

## Expected Behavior

The test should:
1. Create a workspace with enabled invitation link (as owner)
2. Get the original invitation token (tokenA)
3. Regenerate the invitation link (creates tokenB, invalidates tokenA)
4. Create a **new user** who is NOT a member
5. Have the new user visit tokenA (the old/regenerated token)
6. New user should see "Link Expired" message with "A new link was generated"

## Actual Behavior

Currently:
1. Test creates workspace and gets tokenA
2. Test regenerates link (creates tokenB)
3. Test creates new user or uses existing user
4. New user visits tokenA
5. **User is redirected to dashboard** (suggests they're already a member)
6. Test expects "Link Expired" and fails

## Proposed Solution

Update the test to ensure the new user is NOT a member of the workspace:

```typescript
test('should show error for regenerated token', async ({ authenticatedPage }) => {
    // Create workspace with invite (owner)
    const { workspaceId, inviteToken: oldToken } =
        await createWorkspaceWithInvite(authenticatedPage)

    // Regenerate the invite link
    const regenerateResponse = await authenticatedPage.request.post(
        `/api/workspaces/${workspaceId}/invite/regenerate`
    )
    expect(regenerateResponse.ok()).toBeTruthy()

    // Create NEW user context
    const browser = authenticatedPage.context().browser()!
    const newUserContext = await browser.newContext()
    const newUserPage = await newUserContext.newPage()

    // Sign up as new user (ensure unique email)
    const newEmail = generateTestEmail()
    await newUserPage.goto('/signup')
    await newUserPage.fill('[data-testid="name-input"]', 'New User')
    await newUserPage.fill('[data-testid="email-input"]', newEmail)
    await newUserPage.fill('[data-testid="password-input"]', 'TestPassword123!')
    await newUserPage.click('[data-testid="signup-button"]')
    await newUserPage.waitForURL('**/dashboard**')

    // Visit OLD token (regenerated/expired)
    await newUserPage.goto(`/invite/${oldToken}`)

    // Should see "Link Expired" message
    await expect(newUserPage.locator('text=Link Expired')).toBeVisible()
    await expect(newUserPage.locator('text=A new link was generated')).toBeVisible()

    await newUserContext.close()
})
```

## Alternative Investigation

If the above doesn't work, investigate:
1. Is the regenerate API actually invalidating the old token?
2. Is the database storing regeneration timestamps correctly?
3. Is the invite page logic correctly detecting regenerated tokens?

Check the regenerate logic in:
- `/api/workspaces/[workspaceId]/invite/regenerate/route.ts`
- `/invite/[token]/page.tsx` lines 86-101

## Related Files

- `simple-client/e2e/invite.spec.ts:275-308` - Test that needs updating
- `simple-client/src/app/invite/[token]/page.tsx:86-101` - Regeneration detection logic
- `simple-client/src/app/api/workspaces/[workspaceId]/invite/regenerate/route.ts` - Regenerate API

## Related Bugs

- BUG-39: ✅ Fixed - Check order now prioritizes membership status
- BUG-54: Same root cause - test uses owner instead of non-member
- BUG-45: Consolidation ticket for invite page issues

## Notes

This is likely a test design issue (same as BUG-54), not an application bug. The application correctly prioritizes membership status checks before link validity checks. The test needs to ensure it's using a non-member user to properly test the "Link Expired" functionality for regenerated tokens.

However, if the fix doesn't work, we may need to investigate whether the regeneration logic itself is working correctly.
