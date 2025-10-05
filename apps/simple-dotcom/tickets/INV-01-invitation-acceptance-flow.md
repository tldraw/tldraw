# [INV-01]: Invitation Acceptance Flow with Auth Gating and Error Handling

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement the complete invitation acceptance flow at `/invite/[token]`, including authentication gating, error handling for invalid/disabled/regenerated tokens, and seamless workspace membership creation upon successful join. Combines auth redirection logic with comprehensive error state handling.

## Acceptance Criteria

### Authentication Gating
- [x] Visiting `/invite/[token]` while unauthenticated redirects to `/login` or `/signup` with state preservation to continue join after authentication.
- [x] After successful login, user automatically redirects back to invite flow without needing to re-open the link.
- [x] Auth pages detect invite context and display appropriate messaging (e.g., "You're joining [Workspace Name]").
- [x] Token state stored securely in encrypted cookies or session storage (not query strings) to prevent leakage.

### Successful Join Flow
- [x] Valid tokens add authenticated user to `workspace_members` table and redirect to workspace with success messaging (toast/banner).
- [x] Duplicate membership attempts (already a member) redirect to workspace without error.
- [x] Workspace appears immediately in user's dashboard and navigation after join.

### Error Handling
- [x] Invite validation API returns specific error codes for:
  - `INVALID_TOKEN`: Token doesn't exist
  - `DISABLED_LINK`: Workspace invitation link is disabled
  - `REGENERATED_TOKEN`: Token has been replaced by a newer one
  - `MEMBER_LIMIT`: Workspace has reached member capacity (MEM-05)
  - `WORKSPACE_NOT_FOUND`: Associated workspace was deleted
- [x] Each error type renders tailored landing page with:
  - Clear explanation of what went wrong
  - Actionable next steps (e.g., "Contact workspace owner for new link")
  - CTA to return to dashboard or login
- [x] Analytics capture error occurrences to monitor invite health and identify broken links.

## Technical Details

### Database Schema Changes

- None (leverages existing `invitation_links` and `workspace_members` tables).

### API Endpoints

**Token Validation:**
- `GET /api/invite/[token]/validate` - Returns workspace metadata and token status for unauthenticated users (preview).
- `POST /api/invite/[token]/accept` - Authenticated endpoint that creates membership and returns redirect URL.

**Auth Integration:**
- Login/signup routes must detect `invite_token` in session storage and resume flow post-authentication.

### UI Components

**Invite Landing Page (`/invite/[token]`):**
- Loading state while validating token
- Success state: "Joining [Workspace Name]..." with auto-redirect
- Already member: "You're already a member of [Workspace Name]" with link to workspace

**Error Page Variants:**
- Invalid token: "This invitation link is invalid" + generic help text
- Disabled link: "Invitations to this workspace are currently disabled" + contact owner CTA
- Regenerated token: "This invitation link has expired - A new link was generated" + request new link CTA
- Member limit: "This workspace has reached its member limit" + contact owner
- Workspace deleted: "This workspace no longer exists"

**Auth Pages with Invite Context:**
- Banner: "Sign in to join [Workspace Name]"
- Prominent messaging above login form
- Preserve invite token through entire auth flow

### Permissions/Security

- Prevent token leakage by using secure session storage (HttpOnly cookies preferred over localStorage).
- Rate limit token validation attempts to prevent enumeration attacks (coordinate with SEC-01).
- Ensure token validation doesn't expose sensitive workspace details for invalid tokens.
- Validate member capacity (MEM-05) before creating membership record.

## Dependencies

**Prerequisites:**
- MEM-03 (invitation link lifecycle) - token generation/management
- MEM-04 (join workspace logic) - membership creation
- MEM-05 (member limits) - capacity validation
- AUTH-01 (authentication system)

**Coordinate With:**
- SEC-01 (rate limiting) for validation endpoint protection

## Testing Requirements

- [x] Unit tests (error code mapping, state preservation)
- [x] Integration tests (full auth flow with token)
- [x] E2E tests (Playwright - all scenarios)
- [x] Manual testing scenarios

### Key Test Scenarios
1. Unauthenticated user clicks valid invite → redirects to login → completes signup → joins workspace
2. Authenticated user clicks valid invite → immediately joins workspace
3. User clicks disabled invite link → sees error page
4. User clicks regenerated (old) token → sees "expired" error
5. User clicks invite to full workspace → sees capacity error
6. User already member clicks invite → sees "already member" message

## Related Documentation

- Product requirements: product-requirements.md: INV-01, INV-02.
- Product spec: product.md > Workspace Invitations > Join-by-link, Error handling.
- Security considerations: SEC-01 rate limiting requirements.

## Notes

**Why Combine INV-01 + INV-02:**
- Auth gating and error handling are tightly coupled in the same flow
- Testing is more effective as one integrated user journey
- Reduces ticket overhead and handoff friction

**State Preservation Strategy:**
- Use encrypted session cookie with short TTL (15 minutes)
- Fall back to localStorage with warning for older browsers
- Clear invite state immediately after successful join or error

**Analytics Events:**
- `invite.validated` (success/error)
- `invite.accepted` (membership created)
- `invite.error.[type]` (for each error condition)

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Note:** Originally estimated as 2 small tickets (< 1 day each). Combined complexity is small-medium (1-2 days) due to integrated testing reducing overall effort.

## Worklog

2025-10-05: Combined from original INV-01 (auth gating) and INV-02 (error handling) to create cohesive invitation acceptance flow.

2025-10-05: Completed implementation
- Fixed BUG-04: Login/signup pages now preserve redirect parameter
- Added invite context messaging in auth pages
- Created validation endpoint for unauthenticated preview
- Implemented all error states with specific messages
- Added comprehensive E2E tests
- All acceptance criteria met

## Open questions

- Should we email workspace owner when someone joins via invite link?
  → Defer to post-MVP; add to backlog as notification feature.
- Do we need "invite preview" for unauthenticated users to see workspace name before signing up?
  → Yes, implement as part of validation endpoint (returns public workspace metadata).
