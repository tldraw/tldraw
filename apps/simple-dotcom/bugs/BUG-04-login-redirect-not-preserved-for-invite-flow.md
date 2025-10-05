# [BUG-04]: Login Redirect Not Preserved for Invite Flow

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 2025-10-05

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All browsers
- OS: All operating systems
- Environment: local/staging/production
- Affected version/commit: Current main branch

## Description

The login and signup pages do not handle the `redirect` query parameter that is passed when unauthenticated users try to access invitation links. When the invite page redirects to `/login?redirect=/invite/[token]`, the login page ignores this parameter and always redirects to `/dashboard` after successful authentication, breaking the invitation flow.

## Steps to Reproduce

1. Obtain a valid invitation link (e.g., `/invite/abc123`)
2. Log out if currently authenticated
3. Visit the invitation link while unauthenticated
4. Observe redirection to `/login?redirect=/invite/abc123`
5. Enter valid credentials and submit
6. **Expected**: After login, redirect back to `/invite/abc123` to complete joining the workspace
7. **Actual**: After login, redirects to `/dashboard`, losing the invitation context

## Expected Behavior

1. Login page should:
   - Parse the `redirect` query parameter from the URL
   - Preserve it during the authentication process
   - Redirect to the specified URL after successful login
   - Show context messaging like "Sign in to join workspace" when redirecting from invite

2. Signup page should:
   - Similarly handle the redirect parameter
   - Allow new users to sign up and then join the workspace seamlessly

## Actual Behavior

- Login page always redirects to `/dashboard` (line 33 in login/page.tsx)
- Signup page always redirects to `/dashboard` after account creation
- The `redirect` query parameter is completely ignored
- Users must manually revisit the invitation link after authentication
- Poor user experience that may lead to abandoned invitations

## Screenshots/Videos

N/A - Flow issue

## Error Messages/Logs

No errors are logged, but the flow is broken. The redirect parameter is passed correctly:
```
/login?redirect=/invite/abc123
```

But the login page code shows hardcoded redirect:
```typescript
// Line 33 in login/page.tsx
router.push('/dashboard')
```

## Related Files/Components

- `/src/app/login/page.tsx` (Lines 33) - Hardcoded redirect to dashboard
- `/src/app/signup/page.tsx` - Similar issue with hardcoded redirect
- `/src/app/invite/[token]/page.tsx` (Line 99) - Correctly passes redirect parameter
- `/src/app/invite/[token]/invite-accept-client.tsx` - Client component for invite acceptance

## Possible Cause

1. **Missing redirect parameter handling**: The login and signup pages don't read the `redirect` query parameter
2. **No validation of redirect URL**: Should validate that redirect URLs are internal to prevent open redirect vulnerabilities
3. **No context messaging**: When redirecting from invite, the auth pages should show context about joining a workspace

## Proposed Solution

### 1. Update Login Page

```typescript
'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteContext, setInviteContext] = useState<string | null>(null)
  const supabase = getBrowserClient()

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect')

  useEffect(() => {
    // Check if coming from invite flow
    if (redirectUrl?.startsWith('/invite/')) {
      setInviteContext('Sign in to join the workspace')
    }
  }, [redirectUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Invalid email or password')
        return
      }

      // Redirect to specified URL or dashboard
      const destination = redirectUrl && isValidRedirect(redirectUrl) ? redirectUrl : '/dashboard'
      router.push(destination)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Validate redirect URL to prevent open redirect attacks
  const isValidRedirect = (url: string) => {
    // Only allow internal redirects
    return url.startsWith('/') && !url.startsWith('//')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {inviteContext && (
          <div className="rounded-lg bg-blue-50 p-4 text-blue-800">
            <p className="text-sm font-medium">{inviteContext}</p>
          </div>
        )}

        {/* Rest of the login form... */}
      </div>
    </div>
  )
}
```

### 2. Update Signup Page

Similar changes needed for the signup page to handle redirect parameter and show invite context.

### 3. Preserve Redirect in Links

Update the signup link in login page to preserve the redirect parameter:

```typescript
<Link
  href={`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
  className="font-medium hover:underline"
>
  Sign up
</Link>
```

## Related Issues

- Related to: MEM-04 (Join workspace by invite link)
- Related to: INV-01 (Invitation acceptance flow)
- Duplicates: None
- Blocks: Invitation flow completion

## Impact Assessment

**User Impact**: High

- Affects all new users trying to join workspaces via invitation links
- Affects existing users on different devices who need to log in
- Creates a broken, confusing experience for workspace invitations
- May lead to abandoned invitations and reduced workspace adoption

**Frequency**: High

- Every unauthenticated invitation link click is affected
- Common scenario for team collaboration features

**Data Loss Risk**: Low

- No data is lost, but user flow is interrupted
- Users can manually revisit the link after login (if they remember/have it)

**Workaround**: Medium effort

- Users must save/remember the invitation link
- After login, manually navigate to the invitation URL
- Not intuitive for non-technical users

**Recommended Priority**: High

- Core feature (workspace invitations) is significantly impaired
- Should be fixed before MEM-04 and INV-01 are considered complete

## Worklog

**2025-10-05:**
- Bug discovered during review of MEM-04 implementation
- Analyzed login/signup pages and found missing redirect handling
- Invite page correctly passes redirect parameter but auth pages ignore it
- Created comprehensive bug report with proposed solution

**2025-10-05 (Resolution):**
- Fixed as part of MEM-04 and INV-01 implementation
- Added useSearchParams to both login and signup pages
- Implemented redirect parameter preservation and validation
- Added invite context messaging
- Links between auth pages now preserve redirect parameter
- Comprehensive E2E tests added

## Open Questions

- Should we store the redirect URL in session storage as a fallback?
- Should we validate workspace existence when showing invite context?
- Do we need to handle redirect for password reset flow as well?