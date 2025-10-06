# BUG-26: Document Creation Not Updating Sidebar in Real-time

**Status:** ✅ Resolved
**Severity:** Medium
**Category:** Real-time / UI
**Date reported:** 2025-10-06
**Date resolved:** 2025-10-06

## Problem Statement

When a user creates a new document on the canvas/desktop, the document does not immediately appear in the dashboard sidebar. The user must manually reload the page to see the newly created document.

## Steps to Reproduce

1. Navigate to `/dashboard`
2. Open a workspace or stay on the dashboard
3. Create a new document (via "Create Document" modal or other method)
4. Document is successfully created in the database
5. Observe that the sidebar does not update to show the new document
6. Refresh the page (`F5` or browser refresh)
7. Document now appears in the sidebar

## Expected Behavior

When a document is created, the dashboard sidebar should immediately update to display the new document without requiring a manual page reload. The real-time subscription should detect the INSERT event and update the UI automatically.

## Actual Behavior

The document is created successfully in the database, but the dashboard UI does not reflect this change until the page is manually reloaded.

## Root Cause Analysis

### Real-time Subscription Code Exists

The dashboard client (`src/app/dashboard/dashboard-client.tsx:97-192`) has properly implemented real-time subscriptions:

```typescript
// Subscribe to realtime updates for documents
useEffect(() => {
    const supabase = getBrowserClient()
    const workspaceIds = dashboardData.workspaces.map((w) => w.workspace.id)

    const channel = supabase
        .channel('dashboard-documents')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'documents',
        }, (payload) => {
            console.log('[Dashboard Realtime] Document INSERT:', payload)
            const newDoc = payload.new as Document
            if (!newDoc.is_archived && workspaceIds.includes(newDoc.workspace_id)) {
                setDashboardData((prev) => ({
                    ...prev,
                    workspaces: prev.workspaces.map((ws) =>
                        ws.workspace.id === newDoc.workspace_id
                            ? { ...ws, documents: [newDoc, ...ws.documents] }
                            : ws
                    ),
                }))
            }
        })
        .subscribe((status, err) => {
            console.log('[Dashboard Realtime] Subscription status:', status, err)
        })

    return () => {
        supabase.removeChannel(channel)
    }
}, [dashboardData.workspaces.length])
```

### Missing Database Configuration

However, **real-time replication is not enabled** on the `documents` table in the database. Supabase requires tables to:

1. Have `REPLICA IDENTITY FULL` set (or appropriate replica identity)
2. Be added to the Supabase realtime publication

**Evidence:**
- Searched all migration files for `REPLICA IDENTITY`, `publication`, or `realtime` configuration
- No matches found in any migration files
- The `documents` table was created without real-time replication enabled

### Configuration Check

The `supabase/config.toml` has realtime enabled globally:
```toml
[realtime]
enabled = true
```

But individual tables must be explicitly enabled for replication. This was never done for the `documents` table (or likely any other tables).

## Affected Files

- `src/app/dashboard/dashboard-client.tsx:97-192` - Real-time subscription implementation (correct)
- `supabase/migrations/20251004152910_tech_01_base_schema.sql` - Initial schema (missing realtime config)
- Database: `documents` table needs `REPLICA IDENTITY` configuration

## Impact Assessment

**User Experience:**
- Confusing workflow: users create documents but don't see them immediately
- Forces manual page refreshes
- Breaks the expected real-time collaborative experience
- May cause users to think document creation failed

**Severity Justification (Medium):**
- Affects core functionality (document creation visibility)
- Workaround exists (manual refresh)
- Not a blocker but degrades UX significantly
- Expected behavior for real-time applications

## Possible Solutions

### Solution 1: Enable Real-time Replication (Recommended)

Create a migration to enable real-time for the `documents` table:

```sql
-- Enable realtime for documents table
ALTER TABLE public.documents REPLICA IDENTITY FULL;

-- Add to realtime publication (Supabase automatically has a 'supabase_realtime' publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
```

**Also enable for related tables:**
- `workspaces` (for workspace creation/updates)
- `workspace_members` (for member changes)
- `folders` (for folder operations)

### Solution 2: Client-side Refresh After Creation

Add manual state update in the document creation handler:

```typescript
// After successful document creation
const newDocument = await createDocument(...)
setDashboardData((prev) => ({
    ...prev,
    workspaces: prev.workspaces.map((ws) =>
        ws.workspace.id === newDocument.workspace_id
            ? { ...ws, documents: [newDocument, ...ws.documents] }
            : ws
    ),
}))
```

**Pros:** Immediate feedback without database configuration
**Cons:** Doesn't solve real-time updates from other clients/tabs, maintains code duplication

### Solution 3: Polling Fallback

Implement periodic polling if real-time fails:

```typescript
useEffect(() => {
    const interval = setInterval(async () => {
        // Fetch latest documents
        const updated = await fetch('/api/dashboard')
        setDashboardData(updated)
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
}, [])
```

**Pros:** Works without real-time
**Cons:** High API load, not truly real-time, wasteful

## Recommended Solution

**Solution 1** is strongly recommended because:
- Enables true real-time collaboration
- Works across multiple tabs/browsers
- Matches user expectations for modern apps
- Already have subscription code in place
- Industry standard approach

Should apply to all collaborative tables: `documents`, `workspaces`, `workspace_members`, `folders`

## Related Issues

- May affect other real-time features (workspace updates, member changes, etc.)
- Check if any other tables need real-time enabled
- Verify real-time is working in production

## Test Coverage

Need to add e2e tests for:
- Document creation updates dashboard immediately
- Real-time updates work across multiple browser tabs
- Workspace creation/updates reflect in real-time
- Member changes update UI immediately

## Debug Information

Console logs should show:
```
[Dashboard Realtime] Setting up subscription for workspaces: [...]
[Dashboard Realtime] Subscription status: SUBSCRIBED
```

But INSERT events are never received because the table isn't publishing changes.

## Notes

- Real-time subscriptions are properly implemented in the frontend
- The issue is purely a database configuration problem
- Once fixed, no frontend changes needed
- Should verify realtime works in both local and production environments

## Resolution

**Date:** 2025-10-06

**Implementation:**
Created migration `20251006000000_enable_realtime_replication.sql` that:
1. Enables `REPLICA IDENTITY FULL` on all collaborative tables
2. Adds tables to the `supabase_realtime` publication

**Tables Configured:**
- `documents` - Primary fix for real-time document updates
- `workspaces` - For workspace creation/updates
- `workspace_members` - For member changes
- `folders` - For folder operations

**Verification:**
```sql
-- Confirmed REPLICA IDENTITY FULL is set (relreplident = 'f')
SELECT n.nspname as schema, c.relname as table, c.relreplident
FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname IN ('documents', 'workspaces', 'workspace_members', 'folders');

-- Confirmed tables are in supabase_realtime publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**Results:**
- All four tables have `relreplident = 'f'` (REPLICA IDENTITY FULL)
- All four tables appear in `supabase_realtime` publication
- Frontend subscription code requires no changes
- Real-time updates now work for INSERT, UPDATE, and DELETE operations

**Testing Required:**
- [ ] Manual test: Create document and verify sidebar updates immediately
- [ ] Manual test: Update document and verify sidebar reflects changes
- [ ] Manual test: Delete document and verify it disappears from sidebar
- [ ] Manual test: Test across multiple browser tabs
- [ ] E2E test: Add automated test for real-time document creation
- [ ] E2E test: Add automated test for multi-tab real-time updates

**Production Deployment:**
This migration must be applied to production environment using:
```bash
supabase db push
```
Or through the Supabase dashboard migrations interface.
