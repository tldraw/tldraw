# NAV-08: Enhanced Sidebar Navigation System

Date created: 2025-10-10
Date last updated: -
Date completed: -

## Status

- [ ] Not Started
- [x] In Progress
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

Implement a comprehensive sidebar navigation system as specified in `SIDEBAR.md`. This replaces the current basic workspace list with a sophisticated two-tier header system, context-aware navigation (workspaces/recent/shared with me), integrated search, and enhanced folder/document browsing capabilities.

The sidebar will serve as the primary navigation mechanism for the entire application, providing quick access to workspaces, documents, folders, and recently accessed content. It includes collapsible workspace sections, folder trees, and context switching between different views.

## Acceptance Criteria

### Global Header (Tier 1)
- [x] tldraw branding/logo displayed prominently at top
- [x] Global menu icon for additional options
- [x] Global search icon and functionality (searches across all workspaces)
- [x] Keyboard shortcut (⌘K / Ctrl+K) for global search

### Context Header (Tier 2)
- [x] Display current context ("Workspaces" / "Recent" / "Shared with me")
- [x] Dropdown indicator to switch contexts
- [x] Context-specific search icon (searches within current context)

### Workspaces View
- [x] Display all workspaces as collapsible sections
- [x] Each workspace shows nested documents and folders
- [x] Folders are collapsible and show items within them
- [x] Expand/collapse state persisted in localStorage
- [x] Shift+click behavior: expand target and collapse siblings
- [x] Default: all workspaces expanded on first visit

### Recent View
- [x] Display all visited documents in last-accessed order
- [x] Order cached in memory when session loads
- [x] Newly created documents appear at top
- [x] Existing items maintain position until refresh
- [x] On refresh, true recency list replaces cache

### Footer Section
- [x] User link on left side (username with bullet indicator)
- [x] Opens user profile/account settings on click
- [x] Help menu on right side (? icon in circle)
- [x] Footer fixed to bottom of sidebar

### UI/UX Requirements
- [x] Sidebar has fixed width (320px recommended)
- [x] Smooth transitions for expand/collapse animations
- [x] Keyboard navigation support (arrow keys, enter, escape)
- [x] Proper focus management for accessibility
- [x] Visual indicators for active/selected document
- [x] Hover states for all interactive elements
- [x] Responsive to window height (scrollable content area)

## Technical Details

### Database Schema Changes

No new tables required. Uses existing:
- `workspaces` table for workspace data
- `documents` table for document listings
- `folders` table for folder hierarchy
- `recent_documents` table for recent view

### API Endpoints

Reuse existing endpoints:
- `GET /api/dashboard` - Already provides all workspace/document/folder data
- `GET /api/search?q={query}&context={all|workspace|recent}` - NEW search endpoint needed
- Recent documents already tracked via `NAV-07` implementation

### UI Components

Create new components in `/src/components/sidebar/`:

```
src/components/sidebar/
├── Sidebar.tsx                    # Main sidebar container
├── SidebarGlobalHeader.tsx        # Tier 1 header (branding, menu, search)
├── SidebarContextHeader.tsx       # Tier 2 header (context switcher)
├── SidebarContent.tsx             # Main scrollable content area
├── SidebarFooter.tsx              # Footer with user link and help
├── WorkspacesView.tsx             # Workspaces context view
├── RecentView.tsx                 # Recent documents view
├── SharedWithMeView.tsx           # Shared with me view (future)
├── WorkspaceSection.tsx           # Individual workspace collapsible section
├── FolderTree.tsx                 # Recursive folder tree component
├── DocumentItem.tsx               # Individual document list item
├── SearchDialog.tsx               # Search modal with results
└── types.ts                       # Sidebar-specific types
```

Update existing components:
- `dashboard-client.tsx` - Replace current sidebar with new `<Sidebar />` component
- `workspace-section.tsx` - May reuse or refactor for new sidebar structure

### shadcn/ui Components Needed

Install and configure:
- `Collapsible` - For workspace/folder expand/collapse
- `Command` - For search dialog with keyboard navigation
- `ScrollArea` - For smooth scrolling in sidebar
- `Separator` - For visual dividers
- `Tooltip` - For truncated labels and help text
- Icons from `lucide-react`: Menu, Search, ChevronDown, ChevronRight, Folder, File, HelpCircle, User

### State Management

**Local State (useState):**
- Current context: `'workspaces' | 'recent' | 'shared-with-me'`
- Search query and results
- Search dialog open/close

**LocalStorage:**
- Expanded workspace IDs: `Set<string>`
- Expanded folder IDs: `Map<workspaceId, Set<folderId>>`
- Last selected context: `string`

**Server State (React Query):**
- Dashboard data (workspaces, documents, folders)
- Recent documents
- Search results

### Permissions/Security

No new permissions required. Sidebar displays only:
- Workspaces user owns or is a member of (already enforced by RLS)
- Documents within accessible workspaces (already enforced)
- Recent documents the user has accessed (already tracked securely)

## Dependencies

**Required (Blocking):**
- ✅ Milestone 2 Phase 1-2 complete (workspace/document/folder CRUD exists)
- ✅ NAV-02 (global dashboard) complete
- ✅ NAV-07 (recent documents) complete
- 🔄 DESIGN-06-A (Button component) - P0 for Milestone 2.5
- 🔄 DESIGN-06-B (Input component) - P0 for Milestone 2.5
- ⏳ DESIGN-06-E (shadcn components: Card, Badge, Separator) - P1/P2 for Milestone 2.5

**Recommended (Non-blocking):**
- NAV-06 (document search) - Can implement basic version first, enhance with NAV-06
- DOC-02 (folder hierarchy complete) - Sidebar can show flat folder lists initially

## Testing Requirements

### E2E Tests (Playwright)

Create `e2e/sidebar-navigation.spec.ts`:

- [ ] **Global header:**
  - [ ] Branding/logo renders
  - [ ] Global menu opens
  - [ ] Global search opens and searches across all workspaces

- [ ] **Context switching:**
  - [ ] Switch from Workspaces to Recent view
  - [ ] Switch from Recent to Workspaces
  - [ ] Context header displays correct title
  - [ ] Content area updates to match context

- [ ] **Workspaces view:**
  - [ ] All workspaces display
  - [ ] Click workspace header to expand/collapse
  - [ ] Folders within workspace are collapsible
  - [ ] Documents display under correct workspace/folder
  - [ ] Shift+click expands target and collapses siblings

- [ ] **Recent view:**
  - [ ] Recently accessed documents appear in order
  - [ ] New document creation adds to top of recent list
  - [ ] Order persists during session
  - [ ] Order refreshes after page reload

- [ ] **Persistence:**
  - [ ] Expanded workspace state saves to localStorage
  - [ ] Expanded folder state saves to localStorage
  - [ ] State restores after page refresh
  - [ ] Last selected context restores after page refresh

- [ ] **Footer:**
  - [ ] User link navigates to profile
  - [ ] Help menu icon is visible and clickable
  - [ ] Footer stays at bottom when scrolling

- [ ] **Keyboard navigation:**
  - [ ] Tab cycles through interactive elements
  - [ ] Arrow keys navigate items
  - [ ] Enter opens selected item
  - [ ] Escape closes open dialogs

### Manual Testing Scenarios

- [ ] Test with 0, 1, 5, 20 workspaces (performance and layout)
- [ ] Test with deeply nested folders (5+ levels)
- [ ] Test with long workspace/document names (truncation)
- [ ] Test search with no results
- [ ] Test search with 100+ results
- [ ] Test sidebar on small window height (<600px)
- [ ] Test dark mode styling
- [ ] Test keyboard-only navigation (no mouse)

## Related Documentation

- Design spec: `SIDEBAR.md`
- Product spec: `SPECIFICATION.md` (NAV-02: Global Dashboard)
- Milestone: `MILESTONES.md` (Milestone 2.5: UI Foundation)
- Frontend guide: `FRONTEND_GUIDE.md` (Component patterns, styling)
- shadcn inventory: `SHADCN_COMPONENT_INVENTORY.md`

## Notes

### Implementation Strategy

**Phase 1: Core Structure (Day 1-2)**
1. Install required shadcn components (Collapsible, Command, ScrollArea, Separator)
2. Create basic Sidebar component structure with two-tier headers
3. Create SidebarContent with context switching (empty states)
4. Create SidebarFooter with user link and help icon
5. Replace existing sidebar in dashboard-client.tsx

**Phase 2: Workspaces View (Day 2-3)**
1. Create WorkspaceSection component (collapsible)
2. Integrate existing workspace/document/folder data
3. Implement expand/collapse with localStorage persistence
4. Add Shift+click behavior for sibling collapse
5. Style with proper hover states and active indicators

**Phase 3: Recent View (Day 3-4)**
1. Create RecentView component
2. Use existing recent documents data from NAV-07
3. Implement cached ordering with session persistence
4. Add "new document to top" logic
5. Test ordering behavior across navigation and refresh

**Phase 4: Search Integration (Day 4-5)**
1. Create SearchDialog component with Command palette
2. Implement global search (across all workspaces)
3. Implement context-specific search
4. Add keyboard shortcuts (Cmd+K for global search)
5. Display search results with workspace context

**Phase 5: Polish & Testing (Day 5-6)**
1. Add smooth animations for expand/collapse
2. Implement keyboard navigation (arrow keys, enter, escape)
3. Add accessibility attributes (ARIA labels, roles)
4. Write Playwright E2E tests
5. Manual testing on various window sizes
6. Performance testing with large workspace counts

### Design Considerations

- **Width:** Fixed 320px (not resizable in MVP, can add later)
- **Animations:** Use Tailwind transitions for smooth expand/collapse (150-200ms)
- **Colors:** Use existing Tailwind design tokens from theme
- **Typography:** Match existing app styles (Inter for UI text)
- **Spacing:** Use consistent spacing scale (4px grid)
- **Icons:** Use lucide-react icons consistently
- **Active state:** Highlight currently open document with background color
- **Truncation:** Truncate long names with ellipsis, show full name in tooltip

### Performance Considerations

- Use virtualized lists for workspaces/documents if count exceeds 50 items
- Debounce search input (300ms) to avoid excessive API calls
- Lazy load folder contents (load on expand, not on initial render)
- Memoize workspace sections to avoid unnecessary re-renders
- Use React.memo for DocumentItem and FolderTree components

### Accessibility

- Proper ARIA roles: `navigation`, `region`, `tree`, `treeitem`
- ARIA expanded states for collapsible sections
- Focus management: return focus to trigger after closing dialogs
- Keyboard shortcuts documented in help menu
- Sufficient color contrast for all text (WCAG AA minimum)
- Screen reader announcements for context switches

### Future Enhancements (Post-MVP)

- Resizable sidebar width (drag handle on right edge)
- "Shared with me" context view
- Drag-and-drop to move documents between folders/workspaces
- Right-click context menus for documents/folders
- Pinned items (star documents to keep at top)
- Custom workspace icons/colors
- Sidebar collapse/expand (hide to maximize canvas space)
- Multiple sidebar layouts (tree view vs list view)

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [x] Extra Large (> 5 days)

**Estimate: 5-6 days** for complete implementation including:
- Component architecture and setup: 1.5 days
- Workspaces view with folders: 1.5 days
- Recent view and context switching: 1 day
- Search integration: 1 day
- Polish, testing, and accessibility: 1 day

## Worklog

_2025-10-10:_ Ticket created based on SIDEBAR.md specification. Identified as Milestone 2.5 work (UI Foundation). Marked as P1 (Post-MVP) since it's a UX enhancement on top of existing functional dashboard. Dependencies on DESIGN-06 shadcn component integration tickets noted.

_2025-10-10 (later):_ Started implementation. Built foundation components:
- Created `useDocumentActions` hook for shared document operations (rename, duplicate, archive, restore, delete)
- Implemented `SidebarDocumentItem` with active state highlighting and DocumentActions integration
- Implemented `SidebarFolderItem` with recursive rendering, localStorage persistence, chevron icons
- Implemented `SidebarWorkspaceItem` with shift-click sibling collapse, workspace actions, folder/document tree
- Refactored `workspace-section.tsx` to use shared hook
- All components in `src/components/dashboard-sidebar/` with proper TypeScript types and accessibility attributes

_2025-10-10 (continued):_ Completed sidebar container and search integration:
- Built `Sidebar.tsx` main container with context state management
- Implemented `SidebarGlobalHeader`, `SidebarContextHeader`, `SidebarContent`, `SidebarFooter`
- Created view components: `WorkspacesView.tsx`, `RecentView.tsx`
- Integrated new Sidebar into `dashboard-client.tsx`, removed old sidebar implementation
- Added cmdk package for Command palette
- Created `command.tsx` UI component (shadcn/ui pattern)
- Implemented `SearchDialog.tsx` with Command palette UI
  - Real-time search with 300ms debounce
  - Groups results by type (Documents / Folders)
  - Navigation to documents and folders
  - Empty states and loading indicators
- Enhanced search API endpoint (`/api/search/route.ts`):
  - Added folder search (in addition to existing document search)
  - Added `context` parameter ('all' | 'recent')
  - Recent context filters documents from recent_documents table
  - Intelligent result sorting (exact match → starts with → alphabetical)
  - Returns simplified format for SearchDialog
- Wired up search functionality in Sidebar:
  - Global search button (searches all workspaces)
  - Context-specific search button (searches current view)
  - Keyboard shortcut: ⌘K / Ctrl+K opens global search
  - Search dialog state managed in Sidebar component
- All search acceptance criteria now complete

_2025-10-10 (design review):_ Compared implementation against design mockups in `designs/sidebar-*.png`. Core functionality complete. Created follow-up polish tickets:
- **UI-POLISH-01** (P1): Visual refinements (logo, icons, document status indicators)
- **UI-POLISH-02** (P2): Interactive component upgrades (context dropdown, help menu, optional inline search)
- **DESIGN-01**: Marked complete (designs already exist, implementation done)

Implementation is feature-complete for MVP. Polish tickets track design alignment work for post-MVP.

## Open Questions

1. **Search scope for "Shared with me" context:**
   - Should search include only documents explicitly shared with user, or also documents in shared workspaces?
   - **Decision needed:** Define "shared with me" semantics before implementing search

2. **Folder depth limits in sidebar:**
   - SPEC defines 10-level folder depth limit
   - Should sidebar truncate deep folders or use horizontal scrolling?
   - **Recommendation:** Show first 5 levels, use "..." indicator with tooltip for deeper nesting

3. **Recent documents cache strategy:**
   - SIDEBAR.md says "cached in memory when page loads"
   - Should this use sessionStorage, React state, or React Query cache?
   - **Recommendation:** Use React Query with staleTime to match existing patterns

4. **Help menu content:**
   - Footer shows "Help menu (? icon)"
   - What should help menu contain? Link to docs? Keyboard shortcuts? Support contact?
   - **Decision needed:** Define help menu items before implementation

5. **Keyboard shortcuts:**
   - SIDEBAR.md mentions keyboard navigation but doesn't specify shortcuts
   - Should we implement Cmd+K for search? Cmd+B for sidebar toggle?
   - **Recommendation:** Start with basic arrow key navigation, add shortcuts in Phase 4
