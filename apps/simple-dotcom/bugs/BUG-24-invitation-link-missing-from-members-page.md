# [BUG-24]: Invitation Link Missing from Members Page

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

The workspace members page displays an "Invitation Link" section, but the invitation link itself is not being shown to users. The UI is present with controls (Copy, Enable/Disable, Regenerate), but the link does not exist for newly created workspaces.

## Steps to Reproduce

1. Create a new workspace
2. Navigate to the workspace members page (`/workspace/[workspaceId]/members`)
3. Look for the "Invitation Link" section
4. Observe that no invitation link is present

## Expected Behavior

When a user accesses the workspace members page, an invitation link should be displayed in the "Invitation Link" section, allowing them to:
- Copy the link
- Enable/disable the link
- Regenerate the link

## Actual Behavior

The "Invitation Link" section is visible but empty. The conditional check `{inviteLink && (...)}` in the UI means that if `inviteLink` is `null`, the link controls are not rendered at all.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- **Server Component**: `simple-client/src/app/workspace/[workspaceId]/members/page.tsx:87-91` - Fetches invitation link (can return null)
- **Client Component**: `simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:240-286` - Renders invitation link UI (conditional on inviteLink existence)
- **Database Schema**: `supabase/migrations/20251004152910_tech_01_base_schema.sql` - Defines invitation_links table
- **Provisioning Function**: `supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:77-103` - Creates workspace but not invitation link

## Possible Cause

The issue stems from the database schema design and workspace provisioning flow:

1. **Database Schema**: The `invitation_links` table is defined with a `UNIQUE` constraint on `workspace_id` (line 20251004152910_tech_01_base_schema.sql:3):
   ```sql
   workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE
   ```

2. **Missing Provisioning**: The `provision_user_workspace()` function (20251005000000_auth_02_sync_supabase_auth.sql:77-103) creates a workspace and adds the owner as a member, but **does not create an invitation link**.

3. **UI Expectation Mismatch**: The members page (workspace-members-client.tsx:240) expects an `inviteLink` to exist:
   ```typescript
   {inviteLink && (
     // Link controls rendered here
   )}
   ```

4. **Data Fetching**: The server component (page.tsx:87-91) queries for an invitation link:
   ```typescript
   const { data: inviteLink } = await supabase
     .from('invitation_links')
     .select('*')
     .eq('workspace_id', workspaceId)
     .single()
   ```
   This returns `null` for workspaces without an invitation link record.

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
