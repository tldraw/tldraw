# TECH-12: Refactor Dashboard to Use Workspace Section Components

Date created: 2025-01-08
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Refactor the dashboard to follow the server/client component pattern used in workspace pages. Currently, `dashboard-client.tsx` is a single large client component that manages all workspaces using `useMultiWorkspaceRealtime`. This should be broken down into individual `WorkspaceSection` client components that each use `useWorkspaceRealtimeUpdates` for their specific workspace.

This follows the pattern demonstrated in the Supabase + Next.js realtime video: server components fetch initial data, client components subscribe to postgres_changes for realtime updates.

## Acceptance Criteria

- [ ] Create `WorkspaceSection` client component that receives workspace data as props
- [ ] Each `WorkspaceSection` uses `useWorkspaceRealtimeUpdates` for realtime subscriptions
- [ ] Dashboard server component (`page.tsx`) fetches and passes data to workspace sections
- [ ] Remove `useMultiWorkspaceRealtime` hook (no longer needed)
- [ ] Realtime updates work independently per workspace (no re-render of entire dashboard)
- [ ] Console logs removed or behind debug flag
- [ ] Existing E2E tests still pass

## Technical Details

### Current Architecture (To Change)

```tsx
// dashboard-client.tsx (single large client component)
'use client'

export default function DashboardClient({ initialData }) {
  // Single React Query for all workspaces
  const { data } = useQuery(['dashboard', userId], ...)

  // Single hook subscribing to all workspaces
  useMultiWorkspaceRealtime({ workspaceIds, userId })

  // Renders all workspaces in one component
  return (
    <div>
      {workspaces.map(workspace => (
        <WorkspaceCard workspace={workspace} documents={...} />
      ))}
    </div>
  )
}
```

### Target Architecture

```tsx
// dashboard/page.tsx (server component)
export default async function DashboardPage() {
  const user = await getCurrentUser()
  const dashboardData = await getDashboardData(user.id)

  return (
    <DashboardLayout>
      {dashboardData.workspaces.map(workspace => (
        <WorkspaceSection
          key={workspace.id}
          workspace={workspace}
          initialDocuments={workspace.documents}
          initialFolders={workspace.folders}
          userRole={workspace.userRole}
        />
      ))}
    </DashboardLayout>
  )
}

// WorkspaceSection.tsx (client component)
'use client'

export function WorkspaceSection({ workspace, initialDocuments, initialFolders, userRole }) {
  // Independent React Query per workspace
  const { data: documents } = useQuery(['workspace-documents', workspace.id], ...)
  const { data: folders } = useQuery(['workspace-folders', workspace.id], ...)

  // Independent realtime subscription per workspace
  useWorkspaceRealtimeUpdates(workspace.id, {
    onChange: () => {
      queryClient.invalidateQueries(['workspace-documents', workspace.id])
      queryClient.invalidateQueries(['workspace-folders', workspace.id])
    }
  })

  return (
    <div>
      <h3>{workspace.name}</h3>
      {documents.map(doc => <DocumentCard {...doc} />)}
    </div>
  )
}
```

### UI Components

New components to create:
- `/app/dashboard/workspace-section.tsx` - Client component for individual workspace
- `/app/dashboard/dashboard-layout.tsx` - Client wrapper for dashboard UI state

Components to modify:
- `/app/dashboard/page.tsx` - Keep as server component, pass data to sections
- `/app/dashboard/dashboard-client.tsx` - Simplify to just layout/UI state (or remove entirely)

### Permissions/Security

No changes - RLS policies remain the same. Each workspace section still respects existing permissions.

## Dependencies

- ✅ `useWorkspaceRealtimeUpdates` already implemented and working
- ✅ postgres_changes pattern already proven on workspace pages
- No blocking dependencies

## Testing Requirements

- [x] E2E tests already exist for dashboard
- [ ] Verify existing E2E tests pass after refactor
- [ ] Manual testing: Create document in one workspace, verify only that section updates
- [ ] Manual testing: Multiple tabs open, verify cross-tab updates work per-workspace

## Related Documentation

- See Supabase video: "Realtime with Next.js" (server + client component pattern)
- See `/hooks/useWorkspaceRealtimeUpdates.ts` for postgres_changes implementation
- See `/app/workspace/[workspaceId]/workspace-browser-client.tsx` for reference pattern

## Notes

**Benefits of this refactor:**

1. **Better performance** - Only the affected workspace re-renders, not entire dashboard
2. **Simpler code** - Each workspace section is self-contained
3. **Follows established patterns** - Matches workspace pages architecture
4. **Better debugging** - Console logs are per-workspace, easier to trace
5. **Less complex state** - No need for single query managing all workspaces

**Migration strategy:**

1. Create `WorkspaceSection` component first (can coexist with current code)
2. Update `page.tsx` to render sections instead of passing to `dashboard-client`
3. Remove `useMultiWorkspaceRealtime` hook
4. Simplify or remove `dashboard-client.tsx`
5. Clean up console.logs

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-01-08**: Ticket created after discovering dashboard uses different pattern than workspace pages. Postgres_changes realtime now working, good time to align architectures.

## Open questions

- Should `dashboard-client.tsx` be removed entirely or kept for layout state management?
- Do we need a dashboard-level query for "Recent Documents" or should that stay separate?
- Should workspace sections be collapsible/expandable? (Current UI supports this)
