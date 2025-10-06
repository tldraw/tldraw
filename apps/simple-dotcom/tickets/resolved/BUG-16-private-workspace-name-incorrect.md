# [BUG-16]: Private Workspace Name Not Based on Email Prefix

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
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [x] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/test
- Affected version/commit: simple-dotcom branch

## Description

The private workspace name is not being generated correctly. Instead of using the email prefix, it's using "Playwright Worker 0" (or similar worker name).

## Steps to Reproduce

1. Create a test user with email `test-worker-0-0-1759692596864-ojtqyn@example.com`
2. User signup creates a private workspace
3. **FAILS**: Private workspace is named "Playwright Worker 0's Workspace" instead of "test-worker-0-0-1759692596864-ojtqyn's Workspace"

## Expected Behavior

When a user signs up without a display_name:
1. Their private workspace should be named `{email_prefix}'s Workspace`
2. For email `test@example.com`, workspace should be `test's Workspace`
3. The name should be based on the email prefix, not any other source

## Actual Behavior

Private workspace is named "Playwright Worker 0's Workspace" instead of using the email prefix.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(received).toBe(expected)

Expected: "test-worker-0-0-1759692596864-ojtqyn's Workspace"
Received: "Playwright Worker 0's Workspace"
```

## Related Files/Components

- Workspace creation logic
- User provisioning function
- Database function that generates workspace names

## Possible Cause

The private workspace naming logic is incorrectly determining the name source. It should be using:
- The user's email prefix (part before @) when display_name is not set
- But it's using something else (possibly worker display name, a default value, or test data)

This could be:
- A bug in the workspace creation code that generates the default name
- The test fixture setting an incorrect display_name
- The signup process using wrong data source for the workspace name

## Proposed Solution

Update the workspace provisioning logic to use the email prefix when display_name is not available:
1. Extract email prefix from user email (part before @)
2. Use email prefix as fallback when display_name is null/empty
3. Generate workspace name as `{name_source}'s Workspace`

## Related Issues

- Related to: e2e/workspace.spec.ts:1123, e2e/workspace.spec.ts:1201

## Worklog

**2025-10-05:**
- Bug identified in e2e tests
- Workspace naming using incorrect data source
- Root cause: test fixture was setting `display_name` in user_metadata
- Fixed by removing `display_name` from test fixture (test-fixtures.ts:121)
- All 4 private workspace validation tests now pass

## Resolution

**Fixed**: Removed `display_name` from the test fixture in `simple-client/e2e/fixtures/test-fixtures.ts`.

The issue was that the test fixture was setting `display_name` to "Playwright Worker N" in the user_metadata, which caused the workspace provisioning function to use that display name instead of the email prefix. By removing the `display_name` field (keeping only `name`), the COALESCE in the provision_user_workspace function now correctly falls back to the email prefix, matching the test expectations.

Changed line 119-122 in test-fixtures.ts from:
```typescript
user_metadata: {
    name,
    display_name: name,
}
```
to:
```typescript
user_metadata: {
    name,
}
```

All private workspace validation tests now pass.
