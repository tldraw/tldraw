# BUG-25: Signup Auto-Signin Fails Due to Unconfirmed Email

**Status:** ✅ Resolved
**Severity:** High
**Category:** Authentication
**Date reported:** 2025-10-06
**Date resolved:** 2025-10-06

## Problem Statement

Users receive the error "Account created but failed to sign in. Please try logging in." immediately after completing the signup form. The account is successfully created in Supabase Auth, but the automatic sign-in attempt fails, forcing users to manually log in.

## Steps to Reproduce

1. Navigate to `/signup` page
2. Fill in name, email, and password (8+ characters)
3. Click "Create account" button
4. Observe error message: "Account created but failed to sign in. Please try logging in."

## Expected Behavior

After successful signup, the user should be automatically signed in and redirected to:
- The dashboard (`/dashboard`) by default
- The specified redirect URL if coming from an invite flow

## Actual Behavior

1. Account is successfully created in Supabase Auth
2. Confirmation email is sent to the user
3. Auto sign-in attempt immediately fails with error
4. User sees error message and must manually navigate to login page

## Root Cause Analysis

The issue stems from a **configuration mismatch between local development and production environments**:

### Configuration Issue

In `supabase/config.toml`, line 161:
```toml
[auth.email]
enable_confirmations = false
```

However, the **production Supabase project has email confirmations enabled** by default. This causes a timing issue:

1. `signUp()` succeeds and creates user account (status: `UNCONFIRMED`)
2. Confirmation email is sent
3. Immediate `signInWithPassword()` attempt fails with `email_not_confirmed` error

### Evidence from Supabase Auth Logs

```json
// 17:42:52 - Signup succeeds
{
  "component": "api",
  "duration": 482406281,
  "method": "POST",
  "path": "/signup",
  "status": 200,
  "auth_event": {
    "action": "user_confirmation_requested",
    "actor_id": "63c0e405-e7eb-4a99-a27d-e3c16cf9e98e",
    "actor_username": "stever@tldraw.com"
  }
}

// 17:42:52 - Confirmation email sent
{
  "event": "mail.send",
  "mail_to": "stever@tldraw.com",
  "mail_type": "confirm"
}

// 17:42:53 - Auto sign-in fails (1 second later)
{
  "component": "api",
  "error_code": "email_not_confirmed",
  "grant_type": "password",
  "method": "POST",
  "path": "/token",
  "status": 400
}

// 17:42:53 - Error details
{
  "error": "400: Email not confirmed",
  "grant_type": "password",
  "method": "POST",
  "path": "/token"
}
```

## Affected Files

- `src/app/signup/page.tsx:57-60` - Auto sign-in logic
- `src/app/signup/page.tsx:62-65` - Error handling
- `supabase/config.toml:161` - Local email confirmation setting

## Code Analysis

In `src/app/signup/page.tsx`, lines 56-65:

```typescript
// Auto sign in after signup
const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
})

if (signInError) {
    setError('Account created but failed to sign in. Please try logging in.')
    return
}
```

This approach assumes that users can sign in immediately after signup, which is only true when email confirmations are disabled.

## Impact Assessment

**User Experience:**
- Confusing workflow: users successfully create account but see an error
- Extra friction: requires manual navigation to login page
- Potential trust issues: error message may make users think something went wrong

**Severity Justification (High):**
- Affects all new user registrations
- Degrades first-time user experience
- Creates unnecessary friction in onboarding flow
- Could lead to user drop-off

## Possible Solutions

### Option 1: Disable Email Confirmations (Production)
**Pros:**
- Simplest fix
- Matches current signup flow expectations
- Immediate sign-in works as coded

**Cons:**
- Less secure (no email verification)
- Potential spam/fake accounts
- Not recommended for production

### Option 2: Handle Confirmation Flow Properly (Recommended)
**Pros:**
- Secure email verification
- Better user experience
- Industry standard approach

**Implementation:**
1. Remove auto sign-in attempt after signup
2. Show success message: "Account created! Please check your email to confirm your account."
3. Implement email confirmation callback at `/auth/callback`
4. Auto sign-in user after email confirmation
5. Redirect to original destination

### Option 3: Conditional Auto Sign-In
**Pros:**
- Works in both environments
- Gracefully handles both scenarios

**Implementation:**
1. Attempt auto sign-in after signup
2. If it fails with `email_not_confirmed`, show confirmation message
3. Otherwise, proceed with redirect

## Recommended Solution

**Option 2** is recommended for production applications. Proper email confirmation flow provides:
- Account security and ownership verification
- Better user trust and legitimacy
- Standard industry practice

## Related Issues

- Consider checking if email confirmations are consistently configured across all environments
- Auth callback route may need enhancement to handle post-confirmation redirects
- Invite flow should preserve redirect URL through confirmation process

## Test Coverage

This issue should be covered by e2e tests:
- Signup with email confirmation enabled
- Email confirmation callback handling
- Post-confirmation redirect logic

## Notes

- Local development has `enable_confirmations = false` but production has it enabled
- This creates environment-specific behavior that's hard to debug
- Configuration should be aligned across all environments

## Resolution

**Date:** 2025-10-06

**Changes Implemented:**

1. **Updated signup flow** (`src/app/signup/page.tsx`):
   - Removed auto sign-in attempt after signup
   - Added success state to display email confirmation message
   - Configured `emailRedirectTo` option to redirect users after email confirmation
   - Preserved redirect URLs through the confirmation flow via query parameters
   - Updated UI to show success message with user's email address

2. **Updated local Supabase configuration** (`supabase/config.toml`):
   - Changed `enable_confirmations = false` to `enable_confirmations = true`
   - Aligned local development environment with production settings
   - Prevents environment-specific behavior differences

3. **Updated e2e test** (`e2e/auth.spec.ts`):
   - Modified signup test to expect success message instead of redirect
   - Added assertions for email confirmation message visibility
   - Test now validates proper email confirmation flow

**How it works:**

1. User fills out signup form and submits
2. Account is created in Supabase Auth with UNCONFIRMED status
3. Success message is displayed: "Check your email to confirm your account"
4. User receives confirmation email with link to `/auth/callback?code=...&next=/dashboard`
5. User clicks link, which triggers the auth callback route
6. Callback route exchanges code for session (auto-signs in user)
7. User is redirected to their intended destination (dashboard or invite link)

**Testing:**

- E2e test updated to validate new flow
- Auth callback route already handles email confirmation properly
- Redirect URLs are preserved through the confirmation process
- Invite flow redirect URLs work correctly

**Benefits:**

- Secure email verification for all new accounts
- Consistent behavior across development and production environments
- Better user experience with clear instructions
- Industry-standard authentication flow
- Eliminates confusing error messages
