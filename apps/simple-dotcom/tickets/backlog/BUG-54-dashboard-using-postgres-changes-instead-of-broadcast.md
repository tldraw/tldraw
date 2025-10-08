# [BUG-54]: Dashboard using Postgres Changes instead of Broadcast

Date reported: 2025-10-08
Date last updated: 2025-10-08
Date resolved: 2025-10-08

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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
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

The `useDashboardRealtime` hook is using Supabase's `postgres_changes` feature instead of the documented `broadcast` pattern. This violates the documented realtime data architecture in README.md which explicitly states: "We use Supabase's **Broadcast** feature (not Postgres Changes) for reliability".

## Steps to Reproduce

1. Review `apps/simple-dotcom/simple-client/src/hooks/useDashboardRealtime.ts`
2. Observe subscriptions use `.on('postgres_changes', ...)` 
3. Compare to documented pattern in README.md under "Realtime Data" section
4. Compare to correct implementations in `useWorkspaceRealtimeUpdates.ts` and `useDocumentRealtimeUpdates.ts`

## Expected Behavior

The dashboard should:
1. Use Broadcast feature with channel pattern `workspace:${workspaceId}`
2. Listen for `broadcast` events with event type `workspace_event`
3. Server-side mutations should broadcast events using `broadcastDocumentEvent` helper
4. Follow the documented pattern from README.md lines 125-131

## Actual Behavior

The dashboard currently:
1. Subscribes to `postgres_changes` on documents, workspaces, folders, and document_access_log tables
2. Uses direct database change notifications instead of broadcast messages
3. Violates the documented architecture pattern

## Error Messages/Logs

No runtime errors, but architectural pattern violation.

## Related Files/Components

- `apps/simple-dotcom/simple-client/src/hooks/useDashboardRealtime.ts` (lines 24-87)
- `apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (line 60) - usage site
- `apps/simple-dotcom/README.md` (lines 81-250) - documented pattern
- `apps/simple-dotcom/simple-client/src/hooks/useWorkspaceRealtimeUpdates.ts` - correct example
- `apps/simple-dotcom/simple-client/src/hooks/useDocumentRealtimeUpdates.ts` - correct example

## Possible Cause

The hook was implemented before the broadcast pattern was established, or during migration from the old pattern to the new hybrid approach (see TECH-10 ticket).

## Proposed Solution

1. Refactor `useDashboardRealtime` to use Broadcast pattern:
   - Change from `postgres_changes` to `broadcast` events
   - Listen for `workspace_event` on channel `workspace:${workspaceId}`
   - Parse event payload to route to appropriate invalidation logic

2. Alternative: Replace `useDashboardRealtime` with `useWorkspaceRealtimeUpdates` hook which already implements the correct pattern

3. Ensure server-side mutations broadcast appropriate events for:
   - `workspace.updated`
   - `workspace.archived`
   - `workspace.restored`
   - `member.added`
   - `member.removed`
   - `document.created`
   - `document.updated`
   - `document.archived`
   - `folder.created`
   - `folder.updated`
   - `folder.deleted`

## Related Issues

- Related to: TECH-10 (migrate-supabase-realtime-to-react-query)
- Blocks: Consistent realtime architecture across application
- See also: BUG-55, BUG-56, BUG-57 (other realtime pattern violations)

## Worklog

**2025-10-08:**
- Identified pattern violation during codebase review
- Compared against documented architecture in README.md
- Verified correct pattern exists in useWorkspaceRealtimeUpdates and useDocumentRealtimeUpdates
- Implemented fix using ultrathink-debugger agent
- Created new `useMultiWorkspaceRealtime` hook with correct broadcast pattern
- Updated dashboard to use new hook
- Enhanced server-side broadcasting for workspace operations
- Removed old `useDashboardRealtime` implementation

## Resolution

**Fixed** by implementing the correct broadcast pattern:

1. **Created new hook** `useMultiWorkspaceRealtime` that:
   - Uses broadcast channel pattern `workspace:${workspaceId}`
   - Listens for `workspace_event` broadcast events
   - Manages multiple workspace subscriptions efficiently
   - Includes proper cleanup and visibility handling

2. **Updated dashboard client** to use `useMultiWorkspaceRealtime` instead of `useDashboardRealtime`

3. **Enhanced server-side broadcasting**:
   - Added `broadcastWorkspaceEvent` to PATCH /api/workspaces/[workspaceId] (workspace.updated)
   - Added `broadcastWorkspaceEvent` to DELETE /api/workspaces/[workspaceId] (workspace.archived)

4. **Removed old implementation** that used postgres_changes pattern

The dashboard now follows the documented hybrid realtime strategy (broadcast + polling fallback), ensuring reliable data synchronization across all clients.
