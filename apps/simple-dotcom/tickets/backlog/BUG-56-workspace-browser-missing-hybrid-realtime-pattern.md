# [BUG-56]: Workspace Browser page missing hybrid realtime pattern

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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [x] Folders
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

The Workspace Browser page (`workspace-browser-client.tsx`) violates the documented hybrid realtime strategy in two ways:

1. Uses `postgres_changes` instead of `broadcast` for realtime updates
2. Does not implement React Query with polling fallback

This is the main workspace view showing documents and folders. Missing the hybrid pattern means users may experience inconsistent UI state, especially when switching tabs or during network issues.

## Steps to Reproduce

1. Navigate to workspace browser page at `/workspace/[workspaceId]`
2. Review code in `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx`
3. Observe direct `postgres_changes` subscriptions (lines 35-131)
4. Notice absence of React Query `useQuery` with polling configuration
5. Compare to documented pattern in README.md Implementation Pattern section

## Expected Behavior

The workspace browser page should:
1. Use React Query with `useQuery` for fetching documents and folders
2. Configure polling fallback: `refetchInterval: 1000 * 15` (15 seconds)
3. Set `refetchOnMount: true` and `refetchOnReconnect: true`
4. Subscribe to broadcast events on channel `workspace:${workspaceId}`
5. Invalidate queries when broadcast events are received
6. Include cleanup function to remove subscriptions on unmount

## Actual Behavior

The workspace browser page currently:
1. Subscribes directly to `postgres_changes` for documents and folders
2. No React Query implementation at all
3. Manages state with direct `useState` calls for documents and folders
4. Vulnerable to missed updates during tab backgrounding, connection drops, and navigation
5. Console logs show realtime subscription setup but no fallback mechanism

## Error Messages/Logs

Console shows realtime subscription logs:
```
[Realtime] Setting up subscriptions for workspace: <workspace-id>
[Realtime] Document INSERT: <payload>
[Realtime] Folder UPDATE: <payload>
```

But no fallback polling to catch missed events.

## Related Files/Components

- `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx` (lines 35-131)
- `apps/simple-dotcom/README.md` (lines 104-157) - documented hybrid pattern
- `apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 47-60) - correct React Query implementation example

## Possible Cause

Page was implemented before the hybrid realtime strategy was documented, or was missed during the TECH-10 migration. The presence of console.log statements suggests this code was written during early development/debugging.

## Proposed Solution

1. Implement React Query data fetching for both documents and folders:
```typescript
const { data: documents } = useQuery({
  queryKey: ['workspace-documents', workspace.id],
  queryFn: async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}/documents`)
    return response.json()
  },
  initialData: initialDocuments,
  staleTime: 1000 * 10,
  refetchInterval: 1000 * 15,
  refetchOnMount: true,
  refetchOnReconnect: true,
})

const { data: folders } = useQuery({
  queryKey: ['workspace-folders', workspace.id],
  queryFn: async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}/folders`)
    return response.json()
  },
  initialData: initialFolders,
  staleTime: 1000 * 10,
  refetchInterval: 1000 * 15,
  refetchOnMount: true,
  refetchOnReconnect: true,
})
```

2. Replace `postgres_changes` with Broadcast pattern using `useWorkspaceRealtimeUpdates` hook:
```typescript
useWorkspaceRealtimeUpdates(workspace.id, {
  onDocumentChange: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
  },
  onFolderChange: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-folders', workspace.id] })
  },
})
```

3. Remove console.log statements once pattern is working

4. Follow the Implementation Checklist in README.md (lines 186-195)

## Related Issues

- Related to: BUG-54, BUG-55, BUG-57 (other realtime pattern violations)
- Related to: TECH-10 (migrate-supabase-realtime-to-react-query)

## Worklog

**2025-10-08:**
- Identified missing hybrid pattern during codebase review
- Verified against documented architecture
- Noted this is the main workspace view, making reliability especially important

## Resolution

