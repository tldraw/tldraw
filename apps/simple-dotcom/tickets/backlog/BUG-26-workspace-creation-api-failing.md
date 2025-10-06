# [BUG-26]: Workspace Creation API Endpoint Failing

Date reported: 2025-10-05
Date last updated: 2025-10-05
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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The workspace creation API endpoint (`POST /api/workspaces`) is returning an error response (not ok/200). This prevents tests from creating workspaces programmatically via the API.

## Steps to Reproduce

1. Make POST request to `/api/workspaces` with workspace name
2. **FAILS**: Response is not ok (likely 4xx or 5xx status code)

## Expected Behavior

A POST request to `/api/workspaces` with valid authentication and a workspace name should:
1. Create a new workspace in the database
2. Add the authenticated user as the owner
3. Return a 200/201 response with the workspace data
4. Include the workspace ID in the response

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(received).toBeTruthy()

Received: false

  30 | 	expect(response.ok()).toBeTruthy()
```

The test is making a POST request to `/api/workspaces` with `{ name: workspaceName }` and expecting a successful response, but receiving a failed response instead.

## Related Files/Components

- `e2e/invite.spec.ts:187` - should show already member message
- `e2e/invite.spec.ts:245` - should show error for regenerated token
- Likely affects any test that uses the `createWorkspaceWithInvite` helper function

## Possible Cause

The workspace creation API endpoint is either:
- Not properly implemented or configured
- Missing required authentication/authorization checks
- Has validation errors with the request payload
- Has a server-side error

This may be related to BUG-06 (workspace name not visible after creation), but that bug is about UI display, while this is about the API endpoint itself failing.

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

## Resolution

Description of how the bug was fixed, or why it was closed without fixing.
