# [BUG-15]: Archive Button Appearing on Workspace Members Page

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
- [ ] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [x] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
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
The workspace members page (`/workspace/[workspaceId]/members`) displays an "Archive" button in the header that navigates to the workspace archive page. This button should not be present on the members management page as it's unrelated to member management functionality and creates navigation confusion.

## Steps to Reproduce
1. Navigate to any workspace
2. Go to the workspace members page (`/workspace/[workspaceId]/members`)
3. Observe the header section

## Expected Behavior
The members page header should only show:
- Page title ("Workspace Members")
- "Back to Workspace" button

The Archive button should only appear on pages where viewing/managing archived documents is relevant (e.g., main workspace browser page, workspace settings).

## Actual Behavior
The members page displays both:
- "Archive" button (incorrect)
- "Back to Workspace" button (correct)

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No errors in logs - this is a UI/navigation issue, not a functional error.
```

## Related Files/Components

- `simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:198-203`

## Possible Cause

In `simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx`, lines 198-203, the Archive button is hardcoded in the header:

```tsx
<Link
  href={`/workspace/${workspace.id}/archive`}
  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
>
  Archive
</Link>
```

This appears to be leftover navigation from copying the header structure from another page.

## Proposed Solution

Remove the Archive link from the workspace members page header. The button serves no purpose on this page since member management is unrelated to document archiving.

**Proposed change:**
```tsx
<div className="flex gap-2">
  <Link
    href={`/workspace/${workspace.id}`}
    className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
  >
    Back to Workspace
  </Link>
</div>
```

## Related Issues

- None

## Worklog

**2025-10-05:**
- Bug identified during UI review
- Archive button is contextually inappropriate on members page

## Resolution

Pending fix.
