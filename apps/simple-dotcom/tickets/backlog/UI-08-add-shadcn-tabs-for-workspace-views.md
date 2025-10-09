# UI-08: Add shadcn/ui Tabs Component for Workspace Views

Date created: 2025-10-08
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
- [x] Workspaces
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

Add shadcn/ui's Tabs component to consolidate workspace views (Documents, Members, Settings, Archive) into a tabbed interface instead of separate routes. This improves navigation and reduces cognitive load.

## Acceptance Criteria

- [ ] shadcn Tabs component installed (`npx shadcn@latest add tabs`)
- [ ] Workspace page refactored to use tabs for different views
- [ ] Tabs show: Documents, Members, Settings, Archive
- [ ] Tab state syncs with URL (using query params or hash)
- [ ] Active tab is highlighted
- [ ] Tabs are keyboard navigable
- [ ] Tabs support deep linking (bookmark specific tab)
- [ ] Component supports mobile responsive design

## Technical Details

### UI Components

**Install shadcn Tabs:**
```bash
npx shadcn@latest add tabs
```

**Refactor workspace layout:**

Currently separate routes:
- `/workspace/[id]` - Documents
- `/workspace/[id]/members` - Members
- `/workspace/[id]/settings` - Settings
- `/workspace/[id]/archive` - Archive

**Option 1: Query param tabs** (Recommended)
```typescript
// /workspace/[id]?tab=documents|members|settings|archive

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WorkspacePage({ params, searchParams }) {
  const tab = searchParams.tab || 'documents'

  return (
    <Tabs value={tab} onValueChange={(value) => router.push(`?tab=${value}`)}>
      <TabsList>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="archive">Archive</TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <WorkspaceDocumentsClient {...props} />
      </TabsContent>

      <TabsContent value="members">
        <WorkspaceMembersClient {...props} />
      </TabsContent>

      <TabsContent value="settings">
        <WorkspaceSettingsClient {...props} />
      </TabsContent>

      <TabsContent value="archive">
        <WorkspaceArchiveClient {...props} />
      </TabsContent>
    </Tabs>
  )
}
```

**Option 2: Keep separate routes, add tab navigation**
- Keep existing routes for deep linking
- Add tabs UI that navigates between routes
- Maintains current behavior, improves navigation

### Permissions/Security

No security implications. Existing RLS policies and access checks remain in place.

## Dependencies

- shadcn Tabs component (to be installed)

## Testing Requirements

- [ ] Manual testing: Verify tab switching works
- [ ] Manual testing: Verify URL updates when switching tabs
- [ ] Manual testing: Verify deep linking to specific tabs
- [ ] Manual testing: Verify keyboard navigation between tabs
- [ ] E2E tests: Update workspace navigation tests for new tab structure

## Related Documentation

- Current routes: `src/app/workspace/[workspaceId]/`
- shadcn Tabs: https://ui.shadcn.com/docs/components/tabs

## Notes

- Consider keeping separate routes for deep linking and SEO
- Tab state should persist in URL for bookmarking
- Mobile: Tabs may need to scroll horizontally or collapse to dropdown
- Archive tab might need owner-only access indication
- Settings tab already has owner-only restriction

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds.]

## Open questions

- Should we use query params or keep separate routes?
- How should tabs behave on mobile (scroll, dropdown, stack)?
- Should the Archive tab be hidden from non-owners?
- Should we add count badges (e.g., "Members (5)", "Archive (2)")?
