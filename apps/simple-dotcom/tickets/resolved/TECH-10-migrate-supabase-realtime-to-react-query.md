# TECH-10: Migrate Supabase Realtime Subscriptions to React Query

Date created: 2025-10-07
Date last updated: 2025-10-07
Date completed: 2025-10-07

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

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
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Current Supabase realtime subscriptions have reliability issues in both production and tests due to:
1. **Stale closures** - Handlers capture workspace IDs at subscription time and don't see updates
2. **Frequent recreation** - Subscriptions recreate on every workspace count change, causing WebSocket churn
3. **No status tracking** - Components don't know when subscriptions are ready
4. **Flaky tests** - E2E tests race against subscription establishment

Migrate to React Query pattern where realtime events trigger cache invalidation, letting React Query handle refetching. This provides:
- Better separation of concerns (realtime = invalidation, React Query = data fetching)
- Built-in loading/error states
- Optimistic updates support
- Automatic retries and background refetching
- Better testability

## Acceptance Criteria

- [x] Dashboard realtime updates use React Query invalidation pattern
- [ ] Workspace browser realtime updates use React Query invalidation pattern (not in scope - already working)
- [ ] Document view realtime updates use React Query invalidation pattern (not in scope - already working)
- [x] Subscriptions only recreate on workspace list change, not data changes
- [x] E2E tests pass reliably without page reloads
- [x] Manual testing confirms real-time updates work smoothly

## Technical Details

### Current Problem (dashboard-client.tsx:99-250)

```typescript
useEffect(() => {
  const workspaceIds = dashboardData.workspaces.map((w) => w.workspace.id)
  // Problem: workspaceIds captured in closure, won't update

  const channel = supabase.channel('dashboard-documents')
    .on('postgres_changes', { event: 'UPDATE', ... }, (payload) => {
      // Uses stale workspaceIds
      if (workspaceIds.includes(updatedDoc.workspace_id)) { ... }
    })

  return () => supabase.removeChannel(channel)
}, [dashboardData.workspaces.length, userId]) // Recreates too often
```

### Proposed Solution

**Step 1: Install React Query** (if not already installed)
```bash
npm install @tanstack/react-query
```

**Step 2: Setup Query Client**
```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Step 3: Create Realtime Sync Hook**
```typescript
// hooks/useRealtimeSync.ts
import { useQueryClient } from '@tantml:function_calls/react-query'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useEffect } from 'react'

export function useRealtimeSync(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = getBrowserClient()

    const channel = supabase
      .channel('app-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => {
          // Let React Query refetch - it knows which queries need workspaces
          queryClient.invalidateQueries({ queryKey: ['workspaces'] })
          queryClient.invalidateQueries({ queryKey: ['documents'] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'document_access_log', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recentDocuments'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient]) // Only recreate if user changes
}
```

**Step 4: Convert Components to Use React Query**
```typescript
// app/dashboard/dashboard-client.tsx
import { useQuery } from '@tanstack/react-query'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export default function DashboardClient({ userId }: { userId: string }) {
  // Enable realtime sync
  useRealtimeSync(userId)

  // Fetch data with React Query - automatically refetches on invalidation
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      const res = await fetch('/api/workspaces')
      return res.json()
    },
  })

  const { data: recentDocs } = useQuery({
    queryKey: ['recentDocuments', userId],
    queryFn: async () => {
      const res = await fetch('/api/recent')
      return res.json()
    },
  })

  // Rest of component uses workspaces/recentDocs from queries
}
```

### API Endpoints

No new endpoints needed - uses existing REST APIs.

### UI Components

Components simplified:
- Remove manual state management for realtime updates
- Remove useEffect realtime subscription code
- Use React Query hooks instead

### Testing Improvements

Tests become more reliable because:
1. Can use `queryClient.invalidateQueries()` to trigger updates in tests
2. Can wait for `isLoading` state transitions
3. No race conditions with WebSocket subscriptions
4. Can mock React Query instead of Supabase realtime

## Dependencies

- @tanstack/react-query (npm package)
- Existing Supabase setup

## Testing Requirements

- [x] E2E tests already exist and should pass without reload workaround
- [x] Update e2e/dashboard.spec.ts to remove page reload after rename
- [x] Update e2e/workspace.spec.ts if similar patterns exist (not needed - workspace browser already works)
- [x] Manual testing: verify all realtime updates work
  - Dashboard document rename ✅
  - Dashboard document create/delete ✅
  - Workspace browser updates ✅ (already working)
  - Recent documents updates ✅

## Related Documentation

- React Query docs: https://tanstack.com/query/latest/docs/framework/react/overview
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- Current implementation:
  - simple-client/src/app/dashboard/dashboard-client.tsx:99-250
  - simple-client/src/hooks/useDocumentListRealtimeUpdates.ts
  - simple-client/src/hooks/useWorkspaceRealtimeUpdates.ts

## Notes

### Alternative: Fix Current Pattern with Refs

If React Query is too big a change, a smaller fix:

```typescript
const workspaceIdsRef = useRef<string[]>([])
workspaceIdsRef.current = dashboardData.workspaces.map((w) => w.workspace.id)

useEffect(() => {
  const channel = supabase.channel('dashboard-documents')
    .on('postgres_changes', { ... }, (payload) => {
      // Use ref to always get current IDs
      if (workspaceIdsRef.current.includes(updatedDoc.workspace_id)) { ... }
    })

  return () => supabase.removeChannel(channel)
}, [userId]) // Only recreate on user change
```

This fixes stale closures but doesn't provide React Query's other benefits.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Breakdown:**
- Day 1: Setup React Query, create useRealtimeSync hook, convert dashboard
- Day 2: Convert workspace browser, convert document view
- Day 3: Update tests, manual testing, cleanup old code

## Worklog

2025-10-07: Ticket created after discovering flaky realtime subscriptions during BUG-06 investigation. Dashboard rename test required page reload workaround due to unreliable realtime updates.

2025-10-07: **Implementation completed**
- Installed @tanstack/react-query and set up QueryProvider
- Created `useDashboardRealtime` hook that subscribes to filtered postgres_changes per workspace
- Migrated dashboard to use React Query for data fetching with `useQuery` hook
- Implemented hybrid approach: React Query + manual invalidation after mutations + realtime invalidation for other users' changes
- Removed page reload workaround from e2e/dashboard.spec.ts
- All tests pass reliably (5.4s for 3 tests without page reloads)

**Key Learnings:**
- Supabase postgres_changes requires filters for security - can't listen to all changes globally
- Per-workspace subscriptions work reliably (filter: `workspace_id=eq.${workspaceId}`)
- React Query's invalidation + refetch pattern is more reliable than manual state updates
- Manual invalidation after mutations provides immediate feedback, realtime catches changes from other users

## Open questions

- [ ] Should we use optimistic updates for mutations (rename, delete, etc.)?
- [ ] Should we keep the current manual state updates as a fallback during React Query migration?
- [ ] Do we want React Query DevTools enabled in development?
- [ ] Should recent documents use infinite query for pagination?
