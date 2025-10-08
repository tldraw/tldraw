# [BUG-55]: Workspace Documents page missing hybrid realtime pattern

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
- [ ] Workspaces
- [x] Documents
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

The Workspace Documents page (`workspace-documents-client.tsx`) violates the documented hybrid realtime strategy in two ways:

1. Uses `postgres_changes` instead of `broadcast` for realtime updates
2. Does not implement React Query with polling fallback

Per README.md: "The application uses a **hybrid realtime strategy** that combines Supabase Realtime with React Query polling for reliable data synchronization."

## Steps to Reproduce

1. Navigate to workspace documents page at `/workspace/[workspaceId]` (documents tab)
2. Review code in `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx`
3. Observe direct `postgres_changes` subscriptions (lines 25-93)
4. Notice absence of React Query `useQuery` with polling configuration
5. Compare to documented pattern in README.md Implementation Pattern section

## Expected Behavior

The workspace documents page should:
1. Use React Query with `useQuery` for data fetching
2. Configure polling fallback: `refetchInterval: 1000 * 15` (15 seconds)
3. Set `refetchOnMount: true` and `refetchOnReconnect: true`
4. Subscribe to broadcast events on channel `workspace:${workspaceId}`
5. Invalidate queries when broadcast events are received
6. Include cleanup function to remove subscriptions on unmount

## Actual Behavior

The workspace documents page currently:
1. Relies solely on WebSocket `postgres_changes` subscriptions
2. No React Query implementation at all
3. Manages state with direct `useState` calls
4. Vulnerable to missed updates during tab backgrounding, connection drops, and navigation

## Error Messages/Logs

No runtime errors, but reliability issues in real-world usage:
- Updates may be missed when tab is backgrounded (browser throttles WebSocket)
- Updates may be lost during network transitions
- No fallback mechanism to catch missed events

## Related Files/Components

- `apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-documents-client.tsx` (lines 25-93)
- `apps/simple-dotcom/README.md` (lines 104-157) - documented hybrid pattern
- `apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (lines 47-60) - correct React Query implementation example

## Possible Cause

Page was implemented before the hybrid realtime strategy was documented, or was missed during the TECH-10 migration.

## Proposed Solution

1. Implement React Query data fetching:
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
```

2. Replace `postgres_changes` with Broadcast pattern:
```typescript
const { isSubscribed } = useWorkspaceRealtimeUpdates(workspace.id, {
  onDocumentChange: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
  },
})
```

3. Follow the Implementation Checklist in README.md (lines 186-195)

## Related Issues

- Related to: BUG-54, BUG-56, BUG-57 (other realtime pattern violations)
- Related to: TECH-10 (migrate-supabase-realtime-to-react-query)

## Worklog

**2025-10-08:**
- Identified missing hybrid pattern during codebase review
- Verified against documented architecture
- Noted correct implementation exists in dashboard-client.tsx for reference

## Resolution

