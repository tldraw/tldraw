# [BUG-54]: Invite Test "disabled link" Shows "Already a Member" Instead of Expected Message

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

The E2E test "should show error for disabled link" is failing because the test user (who creates and owns the workspace) sees "Already a Member" instead of "Link Disabled" when visiting the disabled invitation link.

This is actually **correct application behavior** - the check order fix from BUG-39 ensures that membership status is checked BEFORE link validity, so owners/members see their membership status regardless of link state.

The test needs to be updated to use a **non-owner user** to properly test the "Link Disabled" state.

## Test Failure

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Link Disabled')
Expected: visible
Received: <element(s) not found>

Test: e2e/invite.spec.ts:245-273
```

## Root Cause

**Test Design Issue:**
1. Test creates workspace as authenticatedPage user (becomes owner)
2. Test disables the invitation link
3. Test user (the owner) visits the disabled link
4. App correctly shows "Already a Member" because owner check happens FIRST (before disabled check)
5. Test expects "Link Disabled" but gets "Already a Member"

## Current Check Order (Working as Designed)

From `/invite/[token]/page.tsx` lines 48-120:
1. ✅ Check if user is owner → show "Already a Member"
2. ✅ Check if user is member → show "Already a Member"
3. Check if link is disabled → show "Link Disabled"
4. Check if link is regenerated → show "Link Expired"
5. Check member limit → show limit message
6. Otherwise → show "Join Workspace"

## Expected Behavior

The test should:
1. Create a workspace with enabled invitation link (as owner)
2. Disable the invitation link
3. Create a **new user** (not the owner)
4. Have the new user visit the disabled link
5. New user should see "Link Disabled" message

## Actual Behavior

Currently:
1. Test creates workspace and disables link
2. Same test user (owner) visits the disabled link
3. Sees "Already a Member" (correct behavior!)
4. Test expects "Link Disabled" and fails

## Proposed Solution

Update the test to create a second user context for testing disabled links:

```typescript
test('should show error for disabled link', async ({ authenticatedPage, testUser }) => {
    // Create workspace with invite (owner)
    const { workspaceId, inviteToken } = await createWorkspaceWithInvite(authenticatedPage)

    // Disable the invite link
    const disableResponse = await authenticatedPage.request.patch(
        `/api/workspaces/${workspaceId}/invite`,
        { data: { enabled: false } }
    )
    expect(disableResponse.ok()).toBeTruthy()

    // Create NEW user context (not the owner)
    const browser = authenticatedPage.context().browser()!
    const newUserContext = await browser.newContext()
    const newUserPage = await newUserContext.newPage()

    // Sign up as new user
    const newEmail = generateTestEmail()
    await newUserPage.goto('/signup')
    await newUserPage.fill('[data-testid="name-input"]', 'New User')
    await newUserPage.fill('[data-testid="email-input"]', newEmail)
    await newUserPage.fill('[data-testid="password-input"]', 'TestPassword123!')
    await newUserPage.click('[data-testid="signup-button"]')
    await newUserPage.waitForURL('**/dashboard**')

    // Visit disabled invite link as non-owner
    await newUserPage.goto(`/invite/${inviteToken}`)

    // Should see disabled message (not "Already a Member")
    await expect(newUserPage.locator('text=Link Disabled')).toBeVisible()

    await newUserContext.close()
})
```

## Related Files

- `simple-client/e2e/invite.spec.ts:245-273` - Test that needs updating
- `simple-client/src/app/invite/[token]/page.tsx:48-120` - Check order logic (working correctly)

## Related Bugs

- BUG-39: ✅ Fixed - Check order now prioritizes membership status
- BUG-45: Consolidation ticket for invite page issues

## Notes

This is a test design issue, not an application bug. The application is working correctly by showing owners their membership status before checking link validity. The test needs to be updated to use a non-owner user to properly test disabled link functionality.
