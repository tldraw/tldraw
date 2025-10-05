# BUG-11: Workspace Creation API Endpoint Failing

**Status:** Open
**Priority:** High
**Estimate:** 3 hours
**Related Tests:** e2e/invite.spec.ts:187 (and likely others)

## Problem

The workspace creation API endpoint (`POST /api/workspaces`) is returning an error response (not ok/200). This prevents tests from creating workspaces programmatically via the API.

## Error Details

```
Error: expect(received).toBeTruthy()

Received: false

  30 | 	expect(response.ok()).toBeTruthy()
```

The test is making a POST request to `/api/workspaces` with `{ name: workspaceName }` and expecting a successful response, but receiving a failed response instead.

## Test Flow

1. Make POST request to `/api/workspaces` with workspace name
2. **FAILS**: Response is not ok (likely 4xx or 5xx status code)

## Root Cause

The workspace creation API endpoint is either:
- Not properly implemented or configured
- Missing required authentication/authorization checks
- Has validation errors with the request payload
- Has a server-side error

This may be related to BUG-06 (workspace name not visible after creation), but that bug is about UI display, while this is about the API endpoint itself failing.

## Expected Behavior

A POST request to `/api/workspaces` with valid authentication and a workspace name should:
1. Create a new workspace in the database
2. Add the authenticated user as the owner
3. Return a 200/201 response with the workspace data
4. Include the workspace ID in the response

## Affected Tests

- `e2e/invite.spec.ts:187` - should show already member message
- `e2e/invite.spec.ts:245` - should show error for regenerated token
- Likely affects any test that uses the `createWorkspaceWithInvite` helper function

## Acceptance Criteria

- [ ] POST /api/workspaces endpoint returns successful response
- [ ] Workspace is created in database
- [ ] User is added as owner
- [ ] Response includes workspace ID
- [ ] Tests using this endpoint pass
