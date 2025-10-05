# BUG-07: Recent Documents List Not Reactive

**Status**: New
**Severity**: Medium
**Category**: Dashboard / Realtime Updates
**Date reported**: 2025-10-05

## Description

The recent documents list on the dashboard does not update in real-time when a user opens a document. After navigating to a document and returning to the dashboard (e.g., using the back button), the recently accessed document does not appear at the top of the recent documents list until the page is refreshed.

## Steps to Reproduce

1. Log in and navigate to the dashboard
2. Click on a document to open it (e.g., `/d/{documentId}`)
3. Press the browser back button to return to the dashboard
4. Observe the "Recent Documents" section

**Expected**: The document just accessed should appear at the top of the recent documents list immediately
**Actual**: The recent documents list remains unchanged; only after refreshing the page does the list update

## Technical Analysis

### Root Cause

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

### Affected Files

- **Primary**: `simple-client/src/app/dashboard/dashboard-client.tsx` (lines 96-190)
  - Current subscription only covers `documents` table changes
  - No subscription to `document_access_log` table

- **Related**: `simple-client/src/app/d/[documentId]/page.tsx` (lines 111-119)
  - Where document access is logged to `document_access_log`

- **Related**: `simple-client/src/app/dashboard/page.tsx` (lines 93-116)
  - Initial server-side fetch of recent documents from `document_access_log`

## Possible Solutions

### Option 1: Add Realtime Subscription to `document_access_log` (Recommended)

Add a new subscription in `dashboard-client.tsx` to listen for INSERT events on `document_access_log`:

```typescript
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'document_access_log',
    filter: `user_id=eq.${userId}` // Only listen to current user's access logs
  },
  async (payload) => {
    // Fetch the document details and update recentDocuments state
    // Move the accessed document to the top of the list
  }
)
```

**Pros**:
- Real-time updates
- Follows existing realtime pattern
- No server-side changes needed

**Cons**:
- Additional realtime subscription overhead
- Requires fetching document details on access log insert

### Option 2: Trigger Refetch via Client-Side API Call

After navigating back to the dashboard, trigger a refetch of recent documents via the `/api/recent-documents` endpoint.

**Pros**:
- Simpler implementation
- Uses existing API

**Cons**:
- Not truly real-time
- Requires detecting navigation back to dashboard
- Additional API calls

### Option 3: Use Router Events to Invalidate Cache

Use Next.js router events or navigation listeners to detect when returning to the dashboard and trigger a server component refresh.

**Pros**:
- Leverages Next.js patterns
- No additional subscriptions

**Cons**:
- More complex navigation tracking
- May cause full page re-renders

## Impact

- **User Experience**: Users don't see immediate feedback when accessing documents
- **Perceived Performance**: List appears "stale" or "broken" until manual refresh
- **Workaround**: Users can manually refresh the page to see updated recent documents

## Environment

- Browser: All browsers
- Next.js: App Router (Server Components + Client Components)
- Database: Supabase with Realtime enabled

## Related Issues

None identified

## Notes

The dashboard already has robust realtime subscriptions for document CRUD operations. This enhancement would extend that pattern to also cover document access tracking, providing a more seamless and responsive user experience.
