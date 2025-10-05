# BUG-09: Invite Page Not Redirecting Unauthenticated Users to Login

**Status:** Open
**Priority:** High
**Estimate:** 3 hours
**Related Tests:** e2e/invite.spec.ts:48

## Problem

When an unauthenticated user visits an invitation link (`/invite/[token]`), they are not being redirected to the login page with the invite URL preserved as a redirect parameter. Instead, they remain on the invite page.

## Error Details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login\?redirect=%2Finvite%2F/
Received string:  "http://localhost:3000/invite/6mx1pZgIrW50WFgkiM_J2KAI1QRpTIsw954sVFcttIw"
```

## Test Flow

1. Create an invitation link for a workspace
2. Visit the invitation URL as an unauthenticated user
3. **FAILS**: User stays on `/invite/[token]` instead of being redirected to `/login?redirect=%2Finvite%2F[token]`

## Root Cause

The invitation page is either:
- Not protected by authentication middleware
- Missing the redirect logic for unauthenticated users
- Not properly configured in the route guards

The middleware should detect unauthenticated users and redirect them to login with the current URL preserved in the redirect parameter.

## Expected Behavior

When an unauthenticated user visits `/invite/[token]`:
1. They should be redirected to `/login?redirect=%2Finvite%2F[token]`
2. After successful login, they should be redirected back to the invite page
3. The invite acceptance flow should then proceed

## Affected Tests

- `e2e/invite.spec.ts:48` - should redirect to login with preserved redirect URL
- `e2e/invite.spec.ts:89` - should join workspace after signup
- `e2e/invite.spec.ts:215` - should show error for disabled link
- `e2e/invite.spec.ts:282` - should preserve redirect when switching between login and signup

## Acceptance Criteria

- [ ] Unauthenticated users are redirected to login when visiting invite links
- [ ] Redirect parameter preserves the original invite URL
- [ ] After login, users are redirected back to complete the invitation
- [ ] Test passes when run individually
