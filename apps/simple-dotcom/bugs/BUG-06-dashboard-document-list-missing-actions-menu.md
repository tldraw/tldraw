# [BUG-06]: Dashboard Document List Missing Actions Menu

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
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
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

Document list items in the dashboard sidebar lack a three-dot menu (kebab menu) for accessing document actions like rename, duplicate, and archive. The workspace documents view has this functionality via `DocumentActions` component, but the dashboard sidebar documents are simply links without any action menu.

## Steps to Reproduce

1. Log in and navigate to dashboard
2. Expand a workspace in the sidebar that contains documents
3. Hover over a document in the list
4. Observe: No three-dot menu or action buttons appear
5. Compare to: Navigate to workspace view → Documents tab → Hover over document → Three-dot menu appears

## Expected Behavior

Document list items in the dashboard sidebar should display a three-dot menu (similar to workspace document view) that provides quick access to document actions:
- Rename
- Duplicate
- Archive (for active documents)
- Restore (for archived documents)
- Delete permanently (for owners only)

The menu should appear on hover, similar to how it works in `DocumentListItem`.

## Actual Behavior

Documents in the dashboard sidebar are rendered as plain links without any action menu. Users cannot perform document operations from the dashboard and must navigate to the workspace or document first.

## Screenshots/Videos

N/A

## Error Messages/Logs

N/A

## Related Files/Components

- `simple-client/src/app/dashboard/dashboard-client.tsx:560-569` - Document rendering in sidebar (simple Link components)
- `simple-client/src/components/documents/DocumentListItem.tsx:116-128` - Reference implementation with DocumentActions
- `simple-client/src/components/documents/DocumentActions.tsx` - Reusable actions menu component

## Possible Cause

Dashboard was implemented with a minimalist approach for quick workspace/document navigation. The action menu functionality exists but wasn't integrated into the dashboard sidebar view.

## Proposed Solution

1. Create a simplified `DashboardDocumentItem` component or adapt `DocumentListItem` for sidebar use
2. Add `DocumentActions` menu to dashboard document items
3. Implement document operation handlers in dashboard-client (similar to workspace-documents-client)
4. Ensure proper permission handling based on workspace role
5. Maintain existing realtime update behavior for seamless state sync

## Related Issues

- Similar to workspace browser functionality added in previous milestones
- Document CRUD operations already implemented via API routes
- Realtime updates already handle document changes in dashboard

## Worklog

## Resolution