# [BUG-13]: Duplicate Member Names in Member List

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

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [x] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The workspace members page displays the workspace owner twice in the member list, showing duplicate entries for the same user.

## Steps to Reproduce

1. Navigate to any workspace as the owner
2. Go to the Members page (`/workspace/[workspaceId]/members`)
3. Observe that the owner appears twice in the member list

## Expected Behavior

Each member should appear exactly once in the member list, with the workspace owner appearing only once with the "Owner" badge.

## Actual Behavior

The workspace owner appears twice in the member list with duplicate "Owner" badges and identical display information (name and email).

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- `simple-client/src/app/workspace/[workspaceId]/members/page.tsx:16-99` - Server-side data fetching logic
- `simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx:314` - Client-side rendering

## Possible Cause

**File**: `simple-client/src/app/workspace/[workspaceId]/members/page.tsx:64-83`

The `getWorkspaceMembers` function has flawed logic:

1. Lines 40-44: Fetches the owner user directly from the `users` table
2. Lines 64-72: Manually adds the owner to the `members` array with role 'owner'
3. Lines 47-84: Fetches ALL members from the `workspace_members` table (which includes the owner)
4. Lines 76-83: Adds each member from `workspace_members` to the array, including the owner again

The issue is that the owner exists in both:
- The `workspaces.owner_id` field (used to fetch owner separately)
- The `workspace_members` table (included in the general member query)

This causes the owner to be added twice to the members array.

## Proposed Solution

**Option 1: Filter out the owner from workspace_members query**

Add a filter to exclude the owner when fetching from `workspace_members`:

```typescript
// Fetch all members EXCEPT the owner (we add owner separately)
const { data: membersData } = await supabase
  .from('workspace_members')
  .select(`
    user_id,
    role,
    users!inner (
      id,
      email,
      display_name
    )
  `)
  .eq('workspace_id', workspaceId)
  .neq('user_id', workspace.owner_id)  // Exclude owner
```

**Option 2: Don't fetch owner separately, rely on workspace_members**

Remove the separate owner fetch and ensure the owner is in `workspace_members` with role='owner':

```typescript
// Fetch all members including owner
const { data: membersData } = await supabase
  .from('workspace_members')
  .select(`
    user_id,
    role,
    users!inner (
      id,
      email,
      display_name
    )
  `)
  .eq('workspace_id', workspaceId)

const members: Member[] = []

// Add all members from workspace_members
if (membersData) {
  membersData.forEach((item) => {
    members.push({
      id: item.users.id,
      email: item.users.email,
      display_name: item.users.display_name,
      role: item.role,
    })
  })
}
```

**Recommendation**: Use Option 1 to maintain the current architecture where owner is fetched separately.

## Related Issues

- Related to workspace member management implementation

## Worklog

**2025-10-05:**
- Bug identified during member list review
- Owner appears twice due to fetching from both `workspaces.owner_id` and `workspace_members` table
- Fixed by adding filter to exclude owner from workspace_members query

## Resolution

Fixed by implementing Option 1: Added `.neq('user_id', workspace.owner_id)` filter to the workspace_members query in `simple-client/src/app/workspace/[workspaceId]/members/page.tsx:61` to exclude the owner from the general member fetch, since the owner is added separately.
