# [BUG-57]: Workspace Members page incomplete realtime implementation

Date reported: 2025-10-08
Date last updated: 2025-10-08
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
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All browsers
- OS: All platforms
- Environment: local/staging/production
- Affected version/commit: 2c3c72be4

## Description

The Workspace Members page (`workspace-members-client.tsx`) has an incomplete realtime implementation that violates the documented hybrid strategy:

1. Uses `postgres_changes` instead of `broadcast` for realtime updates
2. Calls `router.refresh()` instead of using React Query invalidation
3. Does not implement React Query with polling fallback
4. Has manual state management (`useState`) without query integration

The page does update eventually via `router.refresh()` but this is inefficient and doesn't follow the documented pattern.

## Steps to Reproduce

1. Navigate to workspace members page at `/workspace/[workspaceId]/members`
2. Review code in `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx`
3. Observe `postgres_changes` subscription (lines 37-59)
4. Note the use of `router.refresh()` instead of query invalidation (line 57)
5. Notice absence of React Query `useQuery` with polling configuration
6. Compare to documented pattern in README.md

## Expected Behavior

The workspace members page should:
1. Use React Query with `useQuery` for fetching members list
2. Configure polling fallback: `refetchInterval: 1000 * 15` (15 seconds)
3. Set `refetchOnMount: true` and `refetchOnReconnect: true`
4. Subscribe to broadcast events on channel `workspace:${workspaceId}`
5. Listen for `member.added`, `member.removed`, `member.updated` events
6. Invalidate `['workspace-members', workspaceId]` query when events are received
7. Include cleanup function to remove subscriptions on unmount

## Actual Behavior

The workspace members page currently:
1. Subscribes to `postgres_changes` on workspace_members table
2. Calls `router.refresh()` on any change, which:
   - Triggers full server component re-render
   - Less efficient than query invalidation
   - Doesn't leverage React Query caching
3. Manages state with `useState` for members, search, pagination
4. Has local state updates for optimistic UI (e.g., removing members)
5. No polling fallback to catch missed events

## Error Messages/Logs

No runtime errors, but inefficient update pattern:
- Full page refresh on member changes
- Potential race conditions between optimistic updates and router.refresh()
- No fallback mechanism for missed events

## Related Files/Components

- `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/members/workspace-members-client.tsx` (lines 37-59, 167-197)
- `apps/simple-dotcom/README.md` (lines 104-157) - documented hybrid pattern
- `apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 47-60) - correct React Query implementation example

## Possible Cause

Page was implemented before the hybrid realtime strategy was documented. The comment "In a production app, we'd update state more efficiently" (line 56) suggests this was known to be suboptimal.

## Proposed Solution

1. Implement React Query data fetching:
```typescript
const { data: members } = useQuery({
  queryKey: ['workspace-members', workspace.id],
  queryFn: async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}/members`)
    return response.json()
  },
  initialData: initialMembers,
  staleTime: 1000 * 10,
  refetchInterval: 1000 * 15,
  refetchOnMount: true,
  refetchOnReconnect: true,
})
```

2. Replace `postgres_changes` with Broadcast pattern:
```typescript
useWorkspaceRealtimeUpdates(workspace.id, {
  onMemberChange: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] })
  },
})
```

3. Remove `router.refresh()` call (line 57) and replace with query invalidation

4. Remove the comment about "production app" since this IS production code

5. Ensure server-side mutations broadcast `member.added`, `member.removed`, `member.updated` events

6. Follow the Implementation Checklist in README.md (lines 186-195)

## Related Issues

- Related to: BUG-54, BUG-55, BUG-56 (other realtime pattern violations)
- Related to: TECH-10 (migrate-supabase-realtime-to-react-query)

## Worklog

**2025-10-08:**
- Identified incomplete realtime pattern during codebase review
- Verified against documented architecture
- Noted comment suggesting developer knew this was suboptimal

## Resolution

