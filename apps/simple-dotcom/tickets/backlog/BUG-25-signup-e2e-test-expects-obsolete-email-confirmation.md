# [BUG-25]: Signup E2E Test Expects Obsolete Email Confirmation Message

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
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [x] Testing/E2E
- [ ] Infrastructure

## Environment

- Browser: All (E2E test issue)
- OS: All (CI/CD test environment)
- Environment: Test environment
- Affected version/commit: Current main branch (post AUTH-02 implementation)

## Description

The E2E test "should successfully sign up a new user and show confirmation message" in `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/auth.spec.ts` is failing because it expects to see an email confirmation success message after signup. However, the actual signup flow has changed due to AUTH-02 implementation, which now auto-provisions private workspaces and may redirect directly to the dashboard in development/test environments where email confirmation is disabled.

The test is looking for a `[data-testid="success-message"]` element that should contain "Check your email", but this element is not displayed when users are auto-confirmed (as happens in test environments using `email_confirm: true` in the test fixtures).

## Steps to Reproduce

1. Run the E2E tests: `yarn e2e` or run specifically the auth.spec.ts test
2. The test "should successfully sign up a new user and show confirmation message" attempts to:
   - Navigate to `/signup`
   - Fill in the signup form
   - Click signup button
   - Wait for success message element
3. Test fails with timeout waiting for `[data-testid="success-message"]`

## Expected Behavior

According to the test expectations (lines 23-26 of auth.spec.ts):
- After signup, a success message should be visible
- The message should contain "Check your email"
- The message should contain the user's email address
- User should remain on the signup page showing this message

## Actual Behavior

Based on the signup page implementation (signup/page.tsx lines 60-69):
- When `data.user && data.session` exist (user is auto-confirmed), the code immediately redirects to the destination URL (typically `/dashboard`)
- The success message is only shown when email confirmation is required (`!data.session`)
- In test environments, users are created with `email_confirm: true` (test-fixtures.ts line 118), which means they're auto-confirmed
- This causes immediate redirect to dashboard, bypassing the success message display

## Screenshots/Videos

N/A - E2E test failure

## Error Messages/Logs

```
Locator: locator('[data-testid="success-message"]')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms
```

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/auth.spec.ts` (lines 6-34) - Failing test
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/signup/page.tsx` (lines 60-69) - Signup redirect logic
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/fixtures/test-fixtures.ts` (line 118) - Test user creation with auto-confirm
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/tickets/resolved/AUTH-02-provision-private-workspace-on-signup.md` - Related feature that changed signup flow

## Possible Cause

The test was written before AUTH-02 implementation, which introduced:
1. Auto-provisioning of private workspaces during signup
2. Immediate redirect to dashboard when session exists (auto-confirmed users)
3. Test fixtures create users with `email_confirm: true` to avoid dealing with email verification in tests

The combination of these factors means the success message is never shown in the test environment, causing the test to fail.

## Proposed Solution

**Option 1 (Recommended): Update test to match new behavior**
- Modify the test to expect redirect to dashboard after signup in test environment
- Check that user lands on dashboard and has access to their private workspace
- This aligns with the actual user experience in development/test environments

**Option 2: Test both flows**
- Keep existing test but skip when auto-confirm is enabled
- Add new test case for auto-confirmed signup flow
- This provides coverage for both scenarios but adds complexity

**Option 3: Mock email confirmation requirement**
- Configure test to disable auto-confirmation for this specific test
- This would allow testing the email confirmation message flow
- However, this doesn't reflect the actual test environment configuration

Example fix for Option 1:
```typescript
test('should successfully sign up a new user and redirect to dashboard', async ({
  page,
  supabaseAdmin,
}) => {
  const email = `test-signup-${Date.now()}@example.com`
  const password = 'TestPassword123!'
  const name = 'Test User'

  await page.goto('/signup')

  // Fill in signup form
  await page.fill('[data-testid="name-input"]', name)
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="signup-button"]')

  // Should redirect to dashboard (auto-confirmed in test environment)
  await page.waitForURL('**/dashboard**', { timeout: 10000 })
  expect(page.url()).toContain('/dashboard')

  // Verify user has access to their private workspace
  await expect(page.locator('text=My Private Workspace')).toBeVisible()

  // Cleanup: delete the created user and all related data
  const { data } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
  if (data) {
    const cleanupResult = await cleanupUserData(supabaseAdmin, data.id)
    assertCleanupSuccess(cleanupResult, `signup test user ${email}`)
  }
})
```

## Related Issues

- Related to: AUTH-02 (auto-provisioning private workspaces on signup)
- Related to: Test infrastructure setup using auto-confirmed users
- Blocks: CI/CD pipeline (failing E2E tests)

## Worklog

**2025-10-06:**
- Initial investigation of test failure
- Analyzed signup page implementation and test fixtures
- Identified root cause as mismatch between test expectations and actual behavior with auto-confirmed users
- Proposed solutions for updating test to match new authentication flow

## Resolution

[To be completed when fixed]