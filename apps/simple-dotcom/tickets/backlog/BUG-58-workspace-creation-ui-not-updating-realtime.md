# [BUG-58]: Workspace Creation/Rename/Delete UI Not Updating in Real-time

Date reported: 2025-10-09
Date last updated: 2025-10-09
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

- [x] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Priority

**P0 (Critical) - Fix Immediately**

**Rationale:**
- **Blocks 14 E2E tests** across 3 test files (document-crud, workspace, dashboard)
- **Blocks BUG-60** (13 additional tests)
- **Core functionality**: Workspace operations are fundamental to the entire app
- **Systemic issue**: Affects workspace create, rename, and delete operations
- **Realtime validation**: Blocks validation of the hybrid realtime strategy (critical architectural pattern)
- **High visibility**: Users cannot see workspaces they create - catastrophic UX failure

**Impact Cascade:**
- Directly breaks: 14 tests
- Indirectly blocks: 13 tests (via BUG-60)
- **Total impact: 27 failing/blocked tests**

**Suggested Fix Order:**
1. Verify broadcasts are firing from API routes
2. Check dashboard realtime subscription setup
3. Validate React Query configuration
4. Test with proper polling fallback

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: Chromium (Playwright E2E tests)
- OS: macOS
- Environment: local
- Affected version/commit: current (2025-10-09)

## Description

Workspace operations (create, rename, delete) complete successfully on the backend but the UI does not update within the expected 10-second timeout. This affects 14 E2E tests across multiple test files, indicating a systemic issue with workspace realtime synchronization.

The backend operations succeed (verified by cleanup showing workspaces exist in DB), but the UI doesn't reflect the changes, suggesting:
1. Broadcast events are not firing
2. React Query is not invalidating/refetching
3. Realtime subscriptions are not properly configured
4. There's a race condition between database writes and UI updates

## Steps to Reproduce

1. Create a new shared workspace via dashboard or workspace modal
2. Wait for the workspace name to appear in the workspace list
3. The workspace name does not appear within 10 seconds (test timeout)

**OR**

1. Rename an existing workspace
2. Wait for the updated name to appear in the UI
3. The updated name does not appear within 10 seconds

**OR**

1. Delete a workspace
2. Wait for it to disappear from the workspace list
3. The workspace remains visible in the UI

## Expected Behavior

- After creating a workspace, it should appear in the workspace list within 1-2 seconds
- After renaming a workspace, the new name should update in the UI immediately
- After deleting a workspace, it should disappear from the UI immediately
- All operations should trigger proper realtime updates via broadcast + React Query polling

## Actual Behavior

- Workspace operations complete on the backend
- UI does not update within 10 seconds
- Tests timeout waiting for UI changes
- 14 E2E tests fail across 3 test files

## Affected E2E Tests

### document-crud.spec.ts (4 failures):
1. "can create, rename, duplicate and archive documents" - fails on workspace creation
2. "can duplicate document metadata" - fails on workspace creation
3. "respects document limit of 1000 per workspace" - fails on workspace creation
4. "archived documents do not appear in active lists" - fails on workspace creation

### workspace.spec.ts (6 failures):
1. "should create a new shared workspace from dashboard" - fails on workspace creation
2. "should add owner as workspace member on creation" - fails on workspace creation
3. "should rename a shared workspace" - fails on workspace rename
4. "should persist rename across page reload" - fails on workspace rename
5. "should soft delete a shared workspace" - timeout/crash on delete
6. "should remove workspace from listings after soft delete" - timeout/crash on delete

### dashboard.spec.ts (4 failures):
1. "should create new workspace and see it in dashboard" - fails on workspace creation
2. "should rename workspace from dashboard" - fails on workspace rename
3. "should delete workspace from dashboard and it disappears immediately" - fails on delete
4. "should allow renaming document from dashboard" - timeout/crash

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Test Workspace 1760014467798')
Expected: visible
Received: <element(s) not found>
Timeout: 10000ms
```

```
Test timeout of 30000ms exceeded.
Error: page.click: Target page, context or browser has been closed
```

## Related Files/Components

**Workspace Creation:**
- `src/app/api/workspaces/route.ts` - POST endpoint for workspace creation
- `src/components/workspace/CreateWorkspaceDialog.tsx` - creation UI
- `src/app/dashboard/dashboard-client.tsx` - dashboard with workspace list

**Workspace Rename:**
- `src/app/api/workspaces/[workspaceId]/route.ts` - PATCH endpoint
- `src/components/workspace/RenameWorkspaceDialog.tsx` - rename UI

**Workspace Delete:**
- `src/app/api/workspaces/[workspaceId]/route.ts` - DELETE endpoint

**Realtime Hooks:**
- `src/hooks/useMultiWorkspaceRealtime.ts` - broadcast subscription hook
- `src/hooks/useWorkspaceRealtimeUpdates.ts` - workspace-level realtime
- `src/lib/realtime/broadcast.ts` - broadcast helper functions

**React Query Usage:**
- `src/app/dashboard/dashboard-client.tsx` - useQuery configuration
- `src/app/workspace/[workspaceId]/page.tsx` - workspace data fetching

## Possible Cause

Based on the pattern of failures, likely causes:

1. **Missing broadcast events**: API routes may not be calling `broadcastWorkspaceEvent` after mutations
2. **Incorrect channel subscription**: Dashboard may be subscribing to wrong channel or not subscribing at all
3. **Query invalidation not triggering**: React Query may not be invalidating the correct query keys
4. **Timing issue**: Broadcast might fire before UI subscribes, with no polling fallback catching it
5. **Modal state issue**: Workspace modal may close before waiting for server confirmation

## Proposed Solution

### Investigation Priority:

1. **Check if broadcasts are firing** (highest priority):
   - Add logging to `src/app/api/workspaces/route.ts` POST handler
   - Verify `broadcastWorkspaceEvent` is being called with correct parameters
   - Check if broadcasts reach the client (add console.log to realtime hook)

2. **Verify dashboard realtime subscription**:
   - Check if `useMultiWorkspaceRealtime` is properly invoked in dashboard
   - Verify channel pattern matches what server broadcasts to
   - Ensure subscription happens before any mutations

3. **Check React Query configuration**:
   - Verify `refetchInterval: 1000 * 15` is set (polling fallback)
   - Ensure `refetchOnMount: true` for immediate updates on navigation
   - Check if query keys match between fetch and invalidation

4. **Fix workspace modal timing**:
   - Modal should not close until server confirms operation
   - Wait for React Query to refetch before closing
   - Add optimistic updates if needed

### Recommended Implementation:

```typescript
// In POST /api/workspaces route (after workspace creation):
await broadcastWorkspaceEvent(
  supabase,
  newWorkspace.id,
  'workspace.created',
  { workspaceId: newWorkspace.id, name: newWorkspace.name },
  user.id
)

// In PATCH /api/workspaces/[workspaceId] route (after rename):
await broadcastWorkspaceEvent(
  supabase,
  workspaceId,
  'workspace.updated',
  { workspaceId, name: updatedWorkspace.name },
  user.id
)

// In DELETE /api/workspaces/[workspaceId] route (after deletion):
await broadcastWorkspaceEvent(
  supabase,
  workspaceId,
  'workspace.archived',
  { workspaceId },
  user.id
)
```

## Related Issues

- Related to: BUG-54, BUG-55 (realtime pattern violations - resolved)
- Related to: TECH-10 (migrate-supabase-realtime-to-react-query)
- Blocks: 14 E2E tests across 3 test files
- May be related to: BUG-59 (workspace deletion crashes)

## Worklog

**2025-10-09 (Initial Investigation):**
- Identified 14 test failures during E2E test review
- Pattern indicates systemic workspace realtime sync issue
- All failures follow same pattern: backend succeeds, UI doesn't update
- Created bug ticket for investigation

**2025-10-09 (Root Cause Analysis & Fix):**
- **Root Cause 1:** POST `/api/workspaces` was missing broadcast event after workspace creation
  - Added `broadcastWorkspaceEvent()` call after successful workspace creation
  - Made broadcast fire-and-forget to avoid blocking response
- **Root Cause 2:** Dashboard had no realtime subscription for workspace-level events
  - Created `useDashboardRealtimeUpdates` hook to subscribe to workspace broadcasts
  - Integrated into dashboard-client.tsx
- **Root Cause 3:** Mixed realtime strategies (Postgres Changes + Broadcast) causing confusion
  - Consolidated to single hybrid approach: Broadcast + React Query polling
  - Updated `useWorkspaceRealtimeUpdates` to use Broadcast instead of Postgres Changes
  - Created `REALTIME_STRATEGY.md` documentation
- **Root Cause 4:** Modal closing race condition in workspace creation flow
  - Fixed timing issue where `setActionLoading(false)` was called in finally block
  - Moved to success/error branches so PromptDialog can close properly
- **Testing:** E2E tests still fail due to browser crash (BUG-59), preventing full verification
  - Need to fix BUG-59 before fully validating workspace realtime fixes

## Resolution

(To be filled when resolved)
