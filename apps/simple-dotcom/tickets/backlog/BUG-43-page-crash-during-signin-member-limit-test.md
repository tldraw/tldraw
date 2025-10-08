# [BUG-43]: Page Crashes During Sign-In in Member Limit API Test

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
- [ ] P1 (High - Should Fix Soon)
- [x] P2 (Medium - Normal Priority) - Test Issue
- [ ] P3 (Low - Nice to Have)

## Category

- [x] Authentication
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

**NOTE: This is a TEST ISSUE, not an application bug.** The test uses incorrect route and selectors.

When attempting to sign in as a new user during the member limit API warning test, the page/browser crashes or closes unexpectedly. The test tries to fill in the email field on the sign-in page but fails because the target page has been closed.

**Root Cause:** Test uses `/sign-in` route (which doesn't exist) instead of `/login`, and uses placeholder selectors instead of `data-testid` selectors.

This affects the E2E test:
- `member-limit.spec.ts` > "Workspace Member Limits" > "shows warning in API response when near limit"

## Steps to Reproduce

1. Create a workspace and add 89 members (approaching limit)
2. Create a new user account
3. Navigate to `/sign-in` page
4. Attempt to fill in the email placeholder field
5. Page crashes before the field can be filled

## Expected Behavior

- Sign-in page should load successfully
- Email input field should be accessible with placeholder "email@example.com"
- Password field should be accessible
- Sign-in form should be functional
- Page should remain stable

## Actual Behavior

- Test times out after 30 seconds
- Error: "Target page, context or browser has been closed"
- Cannot access the email input field
- Page crashes before sign-in can be completed

## Error Message

```
Test timeout of 30000ms exceeded.

Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByPlaceholder('email@example.com')

  175 | 		// Sign in as the new user
  176 | 		await page.goto('/sign-in')
> 177 | 		await page.getByPlaceholder('email@example.com').fill(newMemberEmail)
```

## Potential Causes

1. **Wrong sign-in route**: Test uses `/sign-in` but actual route might be `/login`
2. **JavaScript crash**: Sign-in page has an unhandled error that crashes the page
3. **Redirect loop**: Page might be redirecting infinitely
4. **Missing sign-in page**: The `/sign-in` route might not exist
5. **Auth state issue**: Pre-existing auth state causes the page to crash or redirect
6. **Different field selectors**: The email field might not use placeholder "email@example.com"

## Acceptance Criteria

- [x] Sign-in page loads successfully at the correct route
- [x] Email and password fields are accessible
- [x] Field selectors match actual implementation
- [x] Page remains stable (no crashes)
- [x] Sign-in flow completes successfully
- [x] E2E test passes without timeout

## Related Files

- `e2e/member-limit.spec.ts:123-208` - Failing test (line 177)
- Sign-in page route (verify `/sign-in` vs `/login`)
- Authentication components

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Browser console logs needed
- [ ] Fix verification needed

## Investigation Steps

1. **Verify sign-in route**: Check if the app uses `/sign-in` or `/login`
   - Look at existing passing auth tests to see which route they use
   - Update test if route is different

2. **Check field selectors**: Verify the actual placeholder text used
   - Tests might be using wrong selectors
   - Compare with working auth tests

3. **Test manually**: Navigate to sign-in page in browser
   - Check for JavaScript errors in console
   - Verify page loads correctly

4. **Review test setup**: Check if previous test steps leave auth state
   - Clear cookies/storage between contexts
   - Ensure clean browser context

## Notes

Looking at other test files:
- `auth.spec.ts` and `invite.spec.ts` likely use `/login` route
- They use selectors like `[data-testid="email-input"]` instead of placeholders
- This test may need to be updated to match actual implementation

The test appears to be using incorrect route and field selectors that don't match the actual application.

Screenshots available in test results:
- `test-results/member-limit-Workspace-Mem-9a5bf-PI-response-when-near-limit-chromium/test-failed-1.png`
- `test-results/member-limit-Workspace-Mem-9a5bf-PI-response-when-near-limit-chromium/test-failed-2.png`

## Related Bugs

Similar page crash issues seen in:
- BUG-37: Invitation page crashes
- BUG-40: Invite page disabled link crash

## Recommended Fix

Update the test to use the correct route and selectors:
```typescript
// Change from:
await page.goto('/sign-in')
await page.getByPlaceholder('email@example.com').fill(newMemberEmail)
await page.getByPlaceholder('Enter your password').fill('Password123!')
await page.getByRole('button', { name: 'Sign In' }).click()

// To:
await page.goto('/login')
await page.fill('[data-testid="email-input"]', newMemberEmail)
await page.fill('[data-testid="password-input"]', 'Password123!')
await page.click('[data-testid="login-button"]')
```

## Resolution

**Fixed on 2025-10-08**

The test has been successfully fixed with the following changes:

1. **Fixed test route and selectors** (`e2e/member-limit.spec.ts:155-158`):
   - Changed route from `/sign-in` to `/login`
   - Updated selectors to use `data-testid` attributes instead of placeholders
   - Changed button click from `getByRole` to `data-testid` selector

2. **Fixed browser context issue** (`e2e/member-limit.spec.ts:154-176`):
   - Created a new browser context for the new user to avoid auth state conflicts
   - Used `newUserContext` and `newUserPage` for login and API calls
   - Added proper cleanup of the new context

3. **Fixed API bug** (`src/app/api/invite/[token]/join/route.ts:117-121`):
   - Discovered and fixed a bug in the join API where it was using `workspace_role` instead of `role`
   - The column name in the `workspace_members` table is `role`, not `workspace_role`
   - This was causing the insert to fail with a 500 error

4. **Added user sync wait** (`e2e/member-limit.spec.ts:158-172`):
   - Added wait logic to ensure the user is synced to `public.users` table via trigger
   - Added `user_metadata` with name and display_name for consistency with other tests

**Test Result:** ✅ Test now passes successfully in 11.4s

The test correctly:
- Navigates to the login page without crashes
- Signs in the new user successfully
- Makes the API call to join the workspace
- Receives a 200 response with the expected warning message
- Verifies the member count is 91 as expected
