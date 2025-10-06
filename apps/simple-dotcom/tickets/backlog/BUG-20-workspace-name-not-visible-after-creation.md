# [BUG-20]: Workspace Name Not Visible After Creation

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

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When creating a new workspace via the UI, after clicking the confirm button, the workspace name is not visible on the resulting page. The test expects the workspace name to appear (likely in a header or title), but it times out waiting for it.

## Steps to Reproduce

1. Click create workspace button (`[data-testid="create-workspace-button"]`)
2. Fill workspace name input (`[data-testid="workspace-name-input"]`)
3. Click confirm (`[data-testid="confirm-create-workspace"]`)
4. **FAILS**: Expect workspace name to be visible on page

## Expected Behavior

After creating a workspace, the workspace name should be clearly visible on the workspace page (likely in a header, breadcrumb, or title area).

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Archive Test 1759691390609')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms
```

## Related Files/Components

- `e2e/document-crud.spec.ts:197` - archived documents do not appear in active lists

## Possible Cause

After successful workspace creation, the user is redirected to the workspace page, but the workspace name is not being displayed in the UI. This could be:
- Missing workspace name in the header/title component
- Incorrect routing after workspace creation
- UI component not rendering the workspace name
- Data not being passed to the component that should display the name

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
