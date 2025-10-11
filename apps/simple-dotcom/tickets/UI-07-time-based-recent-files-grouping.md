# UI-07: Time-Based Recent Files Grouping with Snapshot Preservation

Date created: 2025-10-11
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
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Implement time-based grouping for recent files in the sidebar, separating documents into sections (Today, Yesterday, This Week, This Month, Older) using the snapshot preservation pattern from the main tldraw.com app.

The key innovation is the **snapshot preservation algorithm**: when the component first renders, it captures a snapshot of each file's timestamp. This snapshot is preserved across re-renders, preventing files from "jumping" between sections as time advances (e.g., a file shown in "Today" yesterday won't suddenly jump to "Yesterday" today unless the user explicitly interacts with it).

## Acceptance Criteria

- [ ] Recent files are grouped into time-based sections: Pinned, Today, Yesterday, This Week, This Month, Older
- [ ] Section headers are displayed only when that section has files
- [ ] Files remain in their original section during a session (snapshot preservation)
- [ ] Snapshots are invalidated when:
  - User edits a document (updates `updated_at` in recent_documents)
  - User pins/unpins a document
  - User navigates away and returns (new session)
  - Page is reloaded
- [ ] New documents visited for the first time appear in the appropriate section based on current time
- [ ] Pinned files appear at the top in a dedicated "Pinned" section
- [ ] Files within "Older" section are sorted by date (most recent first)
- [ ] Empty state shows when no recent documents exist

## Technical Details

### Snapshot Preservation Algorithm

**Core Pattern (from apps/dotcom/client/src/tla/app/TldrawApp.ts:309-361):**

```typescript
// 1. Store snapshot in component state or React ref
const lastRecentFileOrdering = useRef<Array<{
  documentId: string
  isPinned: boolean
  date: number  // Snapshot timestamp
}> | null>(null)

// 2. On each render, check if document already has a snapshot
const existing = lastRecentFileOrdering.current?.find(f => f.documentId === documentId)

if (existing && existing.isPinned === currentIsPinned) {
  // Preserve snapshot - use old date!
  nextOrdering.push(existing)
} else {
  // Create new snapshot with current date
  nextOrdering.push({
    documentId,
    isPinned: currentIsPinned,
    date: document.updated_at || document.created_at
  })
}

// 3. Sort by date and save snapshot for next render
nextOrdering.sort((a, b) => b.date - a.date)
lastRecentFileOrdering.current = nextOrdering
```

**Key Insight:** The snapshot is **per-session**. It's stored in React state/ref, so it resets when:
- User navigates away from the page
- User reloads the browser
- Component unmounts and remounts

### Date Boundary Calculation

**Utility function (from apps/dotcom/client/src/tla/utils/dates.ts):**

```typescript
function getRelevantDates() {
  const now = new Date()
  return {
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime(),
    thisWeek: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime(),
    thisMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
  }
}
```

### UI Components

**Modified Components:**

1. **`RecentView.tsx`** - Apply snapshot preservation and time-based grouping
   - Replace flat list with sectioned display
   - Implement snapshot preservation logic with useRef
   - Add section headers with conditional rendering

2. **`Sidebar.tsx`** - Ensure realtime updates work correctly
   - Verify React Query invalidation triggers re-render
   - Ensure snapshot persists across realtime updates

**New Component:**

3. **`SidebarFileSection.tsx`** - Reusable section header component
   ```tsx
   interface SidebarFileSectionProps {
     title: string
     iconLeft?: string  // Optional icon (e.g., "pin" for Pinned section)
     children: React.ReactNode
   }
   ```

### Permissions/Security

No security changes required. Uses existing `recent_documents` table and access patterns.

## Dependencies

- Existing `recent_documents` table with `updated_at` tracking
- Current RecentView component implementation
- React Query setup for realtime updates

## Testing Requirements

- [x] Unit tests - Not applicable (UI presentation logic)
- [ ] Integration tests - Test snapshot preservation logic:
  - Files stay in sections across re-renders
  - Files move sections only when updated_at changes
  - Pin/unpin invalidates snapshot
- [ ] E2E tests (Playwright):
  - Test files appear in correct sections based on timestamps
  - Test editing a document moves it to "Today"
  - Test pinning/unpinning updates section
  - Test page reload resets snapshot
- [ ] Manual testing scenarios:
  - Create documents across different time periods
  - Wait for time boundaries to pass (e.g., midnight)
  - Verify files don't jump sections unexpectedly
  - Edit a document and verify it moves to "Today"
  - Pin/unpin and verify section changes

## Related Documentation

- Reference implementation: `apps/dotcom/client/src/tla/app/TldrawApp.ts:309-361`
- Reference UI: `apps/dotcom/client/src/tla/components/TlaSidebar/components/TlaSidebarRecentFiles.tsx`
- Date utilities: `apps/dotcom/client/src/tla/utils/dates.ts`

## Notes

### Why Snapshot Preservation Matters

**Problem:** Without snapshot preservation, files would constantly move between sections as time advances:
- A file edited "Today" yesterday would jump to "Yesterday" today
- That same file would jump to "This Week" later
- Then to "This Month" eventually
- This creates a chaotic, unpredictable UI

**Solution:** The snapshot freezes the categorization at session start. Files only move when:
1. User explicitly edits them (updates `updated_at`)
2. User pins/unpins them (invalidates snapshot)
3. User reloads the page (new snapshot created)

This creates stable, predictable UI where files stay in their sections until meaningful user interaction occurs.

### Implementation Strategy

1. **Phase 1: Core Logic**
   - Extract snapshot preservation logic into utility function
   - Implement date boundary calculation
   - Add useRef to track snapshot in RecentView

2. **Phase 2: UI Structure**
   - Create SidebarFileSection component
   - Update RecentView to render sections
   - Add conditional rendering for empty sections

3. **Phase 3: Polish**
   - Add icons to section headers (pin icon for Pinned)
   - Ensure proper spacing and visual hierarchy
   - Test edge cases (empty sections, single file, etc.)

### Edge Cases to Handle

- **Empty sections:** Don't render section header if no files
- **Single section:** Still show section header for context
- **No recent files:** Show empty state (already implemented)
- **Pinned files:** Always at top, separate from time-based sections
- **Same timestamp:** Maintain stable sort order (use document ID as tiebreaker)

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-11:** Ticket created after analyzing main tldraw.com app implementation. Documented snapshot preservation pattern and time-based grouping algorithm.

## Open questions

- **Q:** Should we add animation when files move between sections after edit?
  - **A:** Out of scope for this ticket. Keep it simple initially, add polish later if needed.

- **Q:** Should "Older" be further subdivided by month/year?
  - **A:** Follow main app pattern: single "Older" section with date sorting. Can enhance later based on user feedback.

- **Q:** How should we handle documents with no `updated_at` timestamp?
  - **A:** Fall back to `created_at` timestamp (same pattern as main app).

- **Q:** Should pinning update the `updated_at` timestamp?
  - **A:** No, pinning only invalidates the snapshot. The file should stay in its current time section but move to "Pinned" group.
