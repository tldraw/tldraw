# Custom Sign-In/Sign-Up Dialog

This document describes the custom authentication dialog implementation using Clerk Elements.

## Overview

Previously, the app used Clerk's out-of-the-box `<SignInButton mode="modal">` component, which opened Clerk's pre-built modal dialog. This has been replaced with a custom implementation using **Clerk Elements** - modular building blocks provided by Clerk that give full control over the UI while Clerk handles all the authentication logic.

## What Was Changed

### New Components

1. **`TlaSignInDialog.tsx`** - Main dialog component that manages the authentication flow
   - Supports both sign-in and sign-up flows with ability to switch between them
   - Implements a legal consent step before sign-up
   - Handles Google OAuth and email/password authentication
   - Includes email verification flow with OTP input

2. **`auth.module.css`** - Styling for the authentication dialog
   - Matches the tldraw design system
   - Responsive and accessible

### Modified Components

1. **`TlaEditorTopLeftPanel.tsx`**
   - Removed `SignInButton` import from `@clerk/clerk-react`
   - Updated `SignInMenuItem` to use custom dialog via `useDialogs()` hook

2. **`TlaEditorTopRightPanel.tsx`**
   - Removed `SignInButton` wrapper
   - Updated anonymous user CTA button to open custom dialog

3. **`TlaFileError.tsx`**
   - Removed `SignInButton` wrapper for "Not Authenticated" error state
   - Uses custom dialog instead

## Features

### Authentication Flows

#### Sign-Up Flow
1. **Email Collection** - User enters email address (with Google OAuth option)
2. **Password Creation & Legal Consent** - User creates password and agrees to Terms of Service and Privacy Policy
3. **Email Verification** - User enters verification code sent to email (if using email/password)

#### Sign-In Flow
1. **Email & Password Entry** - User enters credentials (with Google OAuth option)
2. **Email Verification** - If required, user enters verification code

### Clerk Elements Used

- `<SignUp.Root>` / `<SignIn.Root>` - Manages auth state and flow
- `<SignUp.Step>` / `<SignIn.Step>` - Represents different stages (start, continue, verifications)
- `<Clerk.Field>` - Input fields with built-in validation
- `<Clerk.Label>` - Accessible labels for inputs
- `<Clerk.Input>` - Form inputs with error handling
- `<Clerk.FieldError>` - Error message display
- `<Clerk.Connection>` - OAuth provider buttons (Google)
- `<SignUp.Action>` / `<SignIn.Action>` - Form submission and navigation actions
- `<SignUp.Strategy>` / `<SignIn.Strategy>` - Conditional rendering based on auth strategy
- `<SignUp.Captcha>` - CAPTCHA integration (if needed)

## Benefits of This Approach

1. **Full UI Control** - Complete control over styling, layout, and UX
2. **Clerk Handles Logic** - All authentication logic, validation, security, and state management handled by Clerk
3. **Maintainable** - Clerk Elements are stable and maintained by Clerk
4. **Consistent Design** - Matches tldraw's existing design system
5. **Accessible** - Built-in accessibility features from Clerk
6. **Flexible** - Easy to add/remove authentication methods or modify flows

## Testing

The existing e2e tests should continue to work because the custom dialog uses the same:
- Test IDs (`tla-sign-in-button`, `tla-sign-up`)
- Accessible labels and roles that the tests query
- Same authentication flow and verification process

## Dependencies

- `@clerk/elements` - Added to `package.json` for Clerk Elements components
- `@clerk/clerk-react` - Still used for `useAuth()` hook in other parts of the app

## Future Enhancements

Possible improvements:
- Add "Forgot Password" link
- Add social auth providers beyond Google
- Customize the verification code input (e.g., separate boxes for each digit)
- Add loading states and animations
- Add "Remember me" checkbox
- Implement magic link authentication

