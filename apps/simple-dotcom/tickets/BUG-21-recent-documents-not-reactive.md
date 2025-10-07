# [BUG-21]: Recent Documents List Not Reactive

Date reported: 2025-10-05
Date last updated: 2025-10-07
Date resolved: 2025-10-07

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
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The recent documents list on the dashboard does not update in real-time when a user opens a document. After navigating to a document and returning to the dashboard (e.g., using the back button), the recently accessed document does not appear at the top of the recent documents list until the page is refreshed.

## Steps to Reproduce

1. Log in and navigate to the dashboard
2. Click on a document to open it (e.g., `/d/{documentId}`)
3. Press the browser back button to return to the dashboard
4. Observe the "Recent Documents" section

**Expected**: The document just accessed should appear at the top of the recent documents list immediately
**Actual**: The recent documents list remains unchanged; only after refreshing the page does the list update

## Expected Behavior

What should happen:

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- **Primary**: `simple-client/src/app/dashboard/dashboard-client.tsx` (lines 96-190)
  - Current subscription only covers `documents` table changes
  - No subscription to `document_access_log` table

- **Related**: `simple-client/src/app/d/[documentId]/page.tsx` (lines 111-119)
  - Where document access is logged to `document_access_log`

- **Related**: `simple-client/src/app/dashboard/page.tsx` (lines 93-116)
  - Initial server-side fetch of recent documents from `document_access_log`

## Possible Cause

The dashboard client component (`simple-client/src/app/dashboard/dashboard-client.tsx`) subscribes to realtime changes on the `documents` table (INSERT, UPDATE, DELETE events) but has **no subscription** to the `document_access_log` table.

When a user accesses a document:
1. Server-side code logs the access in `/d/[documentId]/page.tsx:113-118`:
```typescript
await supabase.from('document_access_log').insert({
  user_id: userId,
  document_id: documentId,
  workspace_id: accessData.document.workspace_id,
  accessed_at: new Date().toISOString(),
})
```

2. The dashboard's realtime subscription never receives this change because it only listens to the `documents` table (lines 96-190 in `dashboard-client.tsx`)

3. The initial `recentDocuments` data is fetched server-side during page load (from `/dashboard/page.tsx:74-116`), so it's only updated on full page refresh

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Added realtime subscription to `document_access_log` table in dashboard client
- Created migration to enable realtime replication for `document_access_log` table
- Implemented handler that fetches document and workspace details when access log entries are inserted
- Recent documents list now updates immediately when documents are accessed (no page refresh required)
- Subscription filters by `user_id` to only receive current user's access logs
- Recent documents are limited to 10 most recent items with automatic de-duplication

## Resolution

**Fixed** by adding realtime subscription to the `document_access_log` table.

**Changes made:**
1. **Database Migration** (`20251007183714_enable_realtime_for_document_access_log.sql`):
   - Enabled `REPLICA IDENTITY FULL` for `document_access_log` table
   - Added table to `supabase_realtime` publication

2. **Dashboard Client** (`dashboard-client.tsx` lines 185-237):
   - Added new subscription handler for `document_access_log` INSERT events
   - Filtered by current user's ID to only receive relevant updates
   - Fetches document and workspace details when access is logged
   - Updates recent documents list in state, maintaining sort order and limiting to 10 items
   - Handles de-duplication by removing existing entries before re-adding to top

**Testing:**
- User can access a document via `/d/{documentId}`
- Pressing back button returns to dashboard
- Recent documents section immediately shows the accessed document at the top
- Works across multiple tabs and browser sessions for the same user
