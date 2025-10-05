# BUG-10: Invitation Link Missing from Members Page

**Date reported:** 2025-10-05
**Reported by:** User
**Status:** New
**Severity:** High
**Category:** Workspace Members / UI

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

## Root Cause Analysis

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

## Affected Files

- **Server Component**: `simple-client/src/app/workspace/[workspaceId]/members/page.tsx:87-91` - Fetches invitation link (can return null)
- **Client Component**: `simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:240-286` - Renders invitation link UI (conditional on inviteLink existence)
- **Database Schema**: `supabase/migrations/20251004152910_tech_01_base_schema.sql` - Defines invitation_links table
- **Provisioning Function**: `supabase/migrations/20251005000000_auth_02_sync_supabase_auth.sql:77-103` - Creates workspace but not invitation link

## Possible Solutions

### Option 1: Add Invitation Link to Workspace Provisioning (Recommended)
Modify the `provision_user_workspace()` function to automatically create an invitation link when creating a new workspace:

```sql
-- Add to provision_user_workspace() function after workspace creation
INSERT INTO public.invitation_links (workspace_id, token, enabled, created_by)
VALUES (workspace_uuid, gen_random_uuid()::text, true, NEW.id);
```

**Pros:**
- Every workspace automatically gets an invitation link
- No code changes needed in the UI
- Matches user expectation that invitation links always exist

**Cons:**
- Private workspaces get invitation links they may not need

### Option 2: Create Invitation Link on Demand
Add API logic to create an invitation link the first time a user accesses the members page or tries to enable invitations:

**Pros:**
- Only creates invitation links when needed
- More efficient for private workspaces

**Cons:**
- Requires API changes
- More complex logic

### Option 3: Update UI to Handle Missing Invitation Links
Display a message and button to create an invitation link when one doesn't exist:

**Pros:**
- Gives users explicit control
- Clear UX

**Cons:**
- Additional UI complexity
- Requires both API and UI changes

## Recommended Fix

**Option 1** is recommended because:
1. The schema already enforces one invitation link per workspace (UNIQUE constraint)
2. The UI is already designed assuming invitation links exist
3. Minimal code changes required
4. Aligns with the feature expectation (MEM-03, INV-01 tickets)

## Related Tickets

- MEM-03: Invitation link lifecycle management (completed)
- INV-01: Invitation flow implementation (completed)
- AUTH-02: User provisioning with private workspace (completed)

## Notes

The logs show several "Access denied to this workspace" errors (403) but these appear unrelated to the invitation link issue - they're general authorization errors from various API endpoints.
