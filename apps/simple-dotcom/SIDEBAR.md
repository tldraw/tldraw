# Sidebar Design

This document describes the sidebar navigation component for Simple tldraw.

## Overview

The sidebar provides contextual navigation for workspaces and documents with a **two-tier header system**. The design emphasizes context-aware content display, showing a flat document list for the active workspace while other workspaces remain collapsed for quick switching.

**Implementation Status:** 🔄 In Progress (see [NAV-08](tickets/NAV-08-enhanced-sidebar-navigation.md))

## Architecture

### Component Hierarchy

```
<Sidebar>                                    # Main container
├── <SidebarGlobalHeader>                   # Tier 1: Branding, menu, global search
│   ├── tldraw logo/branding
│   ├── Menu button (global actions)
│   └── Global search button (⌘K)
│
├── <SidebarContextHeader>                  # Tier 2: Context switcher
│   ├── Context dropdown (Workspaces/Recent/Shared)
│   └── Context-specific search
│
├── <SidebarContent>                        # Scrollable content area
│   │
│   ├── [Context: Workspaces]
│   │   └── <WorkspacesView>
│   │       └── <WorkspaceItem>[]          # Collapsible workspace sections
│   │           ├── Workspace header (expand/collapse)
│   │           └── <WorkspaceContent>
│   │               ├── <FolderItem>[]     # Nested, recursive
│   │               │   └── <DocumentItem>[]
│   │               └── <DocumentItem>[]   # Root-level documents
│   │
│   ├── [Context: Recent]
│   │   └── <RecentView>
│   │       └── <DocumentItem>[]           # Flat list, time-ordered
│   │
│   └── [Context: Shared with me]          # Future implementation
│       └── <SharedWithMeView>
│
└── <SidebarFooter>                         # Fixed bottom section
    ├── <UserLink>                          # Left: User profile
    └── <HelpButton>                        # Right: Help menu
```

### Component Details

#### `<Sidebar>` (Container)
- **Location:** `src/components/sidebar/Sidebar.tsx`
- **Purpose:** Root container managing overall sidebar layout and context state
- **State Management:**
  - Current context: `'workspaces' | 'recent' | 'shared-with-me'` (useState)
  - Context persisted to localStorage via `useLocalStorageState`
- **Styling:** Fixed width (320px), flex column layout, full viewport height
- **Responsibilities:**
  - Render header, content, and footer sections
  - Manage context switching
  - Provide shared state to child components

#### `<SidebarGlobalHeader>` (Tier 1)
- **Location:** `src/components/sidebar/SidebarGlobalHeader.tsx`
- **Purpose:** App-level navigation and global actions
- **Components:**
  - tldraw logo/branding (links to marketing page)
  - Menu button (dropdown for global actions: Settings, Sign Out, etc.)
  - Global search button (opens `<SearchDialog>` with scope: all workspaces)
- **Keyboard Shortcuts:**
  - `⌘K` / `Ctrl+K`: Open global search

#### `<SidebarContextHeader>` (Tier 2)
- **Location:** `src/components/sidebar/SidebarContextHeader.tsx`
- **Purpose:** Context-specific navigation
- **Components:**
  - Context dropdown (shadcn `Select` component)
    - Options: "Workspaces", "Recent", "Shared with me"
    - Current context displayed with chevron icon
  - Context-specific search button
    - Searches within current context only
    - Opens same `<SearchDialog>` but with filtered scope
- **Props:**
  - `currentContext: string`
  - `onContextChange: (context: string) => void`

#### `<SidebarContent>` (Main Content Area)
- **Location:** `src/components/sidebar/SidebarContent.tsx`
- **Purpose:** Scrollable content area rendering context-specific views
- **Styling:** Uses shadcn `ScrollArea` for smooth scrolling
- **Conditional Rendering:**
  ```tsx
  {context === 'workspaces' && <WorkspacesView />}
  {context === 'recent' && <RecentView />}
  {context === 'shared-with-me' && <SharedWithMeView />}
  ```
- **Data Source:** React Query (`useQuery` for dashboard data)
- **Realtime Updates:** `useDashboardRealtimeUpdates` hook (see [Data Flow](#data-flow))

#### `<WorkspacesView>`
- **Location:** `src/components/sidebar/WorkspacesView.tsx`
- **Purpose:** Display all workspaces with nested documents/folders
- **Data:** `DashboardData` from `/api/dashboard` (see [NAV-02](tickets/NAV-02-global-dashboard.md))
- **Child Components:**
  - `<WorkspaceItem>` for each workspace
- **Expansion State:**
  - Persisted to localStorage: `Map<workspaceId, boolean>`
  - Key: `sidebar-workspace-expanded`
  - Default: all expanded on first visit

#### `<WorkspaceItem>`
- **Location:** `src/components/dashboard-sidebar/WorkspaceItem.tsx` *(stub exists)*
- **Purpose:** Collapsible workspace section
- **Props:**
  ```tsx
  interface WorkspaceItemProps {
    workspace: Workspace
    documents: Document[]
    folders: Folder[]
    userRole: WorkspaceRole
    isExpanded: boolean
    onToggle: () => void
    onShiftToggle: () => void  // Collapse siblings
  }
  ```
- **State:** Uses `useLocalStorageState` for expand/collapse persistence
- **Interactions:**
  - **Click header:** Toggle expand/collapse
  - **Shift+Click header:** Expand this, collapse siblings
- **Existing Implementation:** See `src/app/dashboard/workspace-section.tsx:23-279` for patterns
- **Actions:**
  - Rename workspace (owner only)
  - Delete workspace (owner only, not for private workspaces)
  - Create document (members + owner)

#### `<FolderItem>`
- **Location:** `src/components/dashboard-sidebar/FolderItem.tsx` *(stub exists)*
- **Purpose:** Recursive collapsible folder component
- **Props:**
  ```tsx
  interface FolderItemProps {
    folder: Folder
    documents: Document[]
    childFolders: Folder[]  // Nested folders
    workspaceId: string
    depth: number           // For indentation
    isExpanded: boolean
    onToggle: () => void
  }
  ```
- **State:** Expansion persisted via `useLocalStorageState(`${folderId}-folder-expanded`)`
- **Rendering:**
  - Recursive: renders child `<FolderItem>` components for nested folders
  - Max depth: 10 levels (enforced at API/database layer, see [DOC-02](tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md))
  - Indentation: `paddingLeft: ${depth * 16}px`
- **Interactions:**
  - Click folder name to navigate to folder view
  - Click expand/collapse icon to toggle folder

#### `<DocumentItem>`
- **Location:** `src/components/dashboard-sidebar/DocumentItem.tsx` *(stub exists)*
- **Purpose:** Individual document link with actions
- **Props:**
  ```tsx
  interface DocumentItemProps {
    document: Document
    workspaceId: string
    depth: number           // For indentation in folders
    canEdit: boolean
    canDelete: boolean
  }
  ```
- **Rendering:**
  - Document icon (📄)
  - Document name (truncated with tooltip if long)
  - Hover: show `<DocumentActions>` menu (existing component)
- **Actions:** Reuses `src/components/documents/DocumentActions.tsx`
  - Rename, Duplicate, Archive, Restore, Delete
- **Active State:** Highlight if current route matches `/d/${document.id}`

#### `<RecentView>`
- **Location:** `src/components/sidebar/RecentView.tsx`
- **Purpose:** Display recently accessed documents in order
- **Data:** `recentDocuments` from `/api/dashboard` (see [NAV-07](tickets/NAV-07-recent-documents-tracking-and-display.md))
- **Ordering Logic:**
  - Cached in memory on page load (React Query cache)
  - New documents appear at top
  - Existing documents maintain position during session
  - On refresh: true recency list loads from database
- **Rendering:**
  - Flat list of `<DocumentItem>` components
  - Shows workspace name under document name
  - Click to navigate to `/d/${documentId}`

#### `<SidebarFooter>`
- **Location:** `src/components/sidebar/SidebarFooter.tsx`
- **Purpose:** User profile and help access
- **Layout:** Fixed to bottom, flex row with space-between
- **Components:**
  - **Left:** `<UserLink>`
    - User display name with bullet indicator (●)
    - Links to `/profile`
    - Shows active/logged-in state
  - **Right:** `<HelpButton>`
    - Question mark icon (?) in circle
    - Opens help menu or links to docs

### State Management

#### Local State (React `useState`)
- Current context: managed in `<Sidebar>`
- Search dialog open/closed
- Modal states (if any)

#### Persisted State (localStorage via `useLocalStorageState`)
- **Key:** `sidebar-context` → Current context ('workspaces' | 'recent' | 'shared-with-me')
- **Key:** `sidebar-workspace-expanded` → `Map<workspaceId, boolean>`
- **Key:** `${workspaceId}-folder-${folderId}-expanded` → `boolean` per folder
- **Hook:** `src/app/hooks/useLocalStorageState.tsx:14-42`
  - Wraps `getFromLocalStorage` / `setInLocalStorage` from `@tldraw/utils`
  - Returns `[state, updateValue, isLoaded]` tuple
  - Handles JSON serialization/deserialization
  - Avoids hydration mismatches with `isLoaded` flag

#### Server State (React Query)
- **Query Key:** `['dashboard', userId]`
- **Data Source:** `GET /api/dashboard` (see [API.md](simple-client/API.md))
- **Refetch Strategy:**
  - `staleTime: 10000` (10 seconds)
  - `refetchInterval: 15000` (poll every 15 seconds as fallback)
  - `refetchOnMount: true` (refresh when returning to dashboard)
  - `refetchOnReconnect: true` (refresh after connection restored)
- **Structure:**
  ```typescript
  interface DashboardData {
    workspaces: WorkspaceWithContent[]
    recentDocuments: RecentDocument[]
  }
  ```

### Data Flow

#### Initial Load (Server → Client)
1. **Server Component** (`src/app/dashboard/page.tsx`) fetches dashboard data
2. Passes `initialData` to **Client Component** (`dashboard-client.tsx`)
3. React Query initializes with `initialData` (no loading state)
4. Sidebar reads from React Query cache

#### Realtime Updates (Supabase Broadcast → React Query)
1. **Mutation occurs** (create/update/delete workspace, document, folder)
2. **API route** broadcasts event via `src/lib/realtime/broadcast.ts`
   - Channel: `workspace:${workspaceId}`
   - Event: `workspace_event`
   - Payload: `{ event_type, resource_type, resource_id, user_id, ... }`
3. **Hook** `useDashboardRealtimeUpdates` subscribes to all workspace channels
   - Location: `src/hooks/useDashboardRealtimeUpdates.ts:30-105`
   - Listens for `broadcast` events with type `workspace_event`
   - On event: calls `onChange()` callback
4. **Callback** invalidates React Query cache: `queryClient.invalidateQueries(['dashboard', userId])`
5. **React Query** refetches dashboard data
6. **Sidebar components** re-render with new data

#### Polling Fallback (Hybrid Strategy)
- **Purpose:** Catch missed realtime events (tab backgrounding, connection drops, navigation)
- **Implementation:** `refetchInterval: 15000` in React Query config
- **Why:** Browser throttles WebSocket messages in background tabs
- **Trade-off:** 15-second latency vs guaranteed consistency

### Search Integration

#### Global Search
- **Trigger:** Click global search button in Tier 1 header, or `⌘K` / `Ctrl+K`
- **Scope:** All workspaces user has access to
- **Component:** `<SearchDialog>` (shadcn `Command` component)
- **API Endpoint:** `GET /api/search?q={query}&context=all`
- **Results:** Group by workspace, show document name + workspace context

#### Context-Specific Search
- **Trigger:** Click search button in Tier 2 header
- **Scope:**
  - Workspaces context: current workspace only (future: could be all workspaces)
  - Recent context: recent documents only
  - Shared with me: shared documents only
- **API Endpoint:** `GET /api/search?q={query}&context={workspaceId|recent|shared}`

#### Search Dialog UX
- **Keyboard Navigation:**
  - Arrow keys: navigate results
  - Enter: open selected document
  - Escape: close dialog
- **Empty State:** "No documents found matching '{query}'"
- **Loading State:** Show skeleton loaders while fetching

## Layout Structure

### Global Header (Tier 1)

- **tldraw branding** - Application logo/name
- **Menu icon** - Global menu or hamburger for additional options
- **Search icon** - Global search across all workspaces

### Context Header (Tier 2)

The second header shows the current context with switching capabilities:

- **Display mode** - Displays current context ("workspaces" or "recent" or "shared with me")
- **Dropdown indicator** - Arrow/caret to open context switcher
- **Search icon** - Search within current context

Both headers are fixed to the top of the sidebar.

### Main Navigation Area

The content area is **context-aware**, adapting based on the selected workspace:

#### Workspaces View

When viewing workspaces, the view displays a list of all workspaces. Each item in that list is a collapsable list of the items (documents and folders) within that workspace. Each folder is also collapsable and displays the items within it.

By default, workspaces are expanded.

Multiple workspaces may be expanded or collapsed independently. The state of which items are expanded or collapsed is stored locally.

**Interaction detail**: Shift clicking a collapsable item toggle (workspace or folder) will expand the item (if not already expanded) and collapse sibling collapsables.

#### Recent view

In the recent view, all visited documents are shown in the order which they were last accessed. This access order is cached in memory when the page loads. Newly created documents are placed at the top of the list. However, existing items do not change their positions as they are accessed; their position is determined by its relative recency when the session began. On refresh, the cached data is replaced by the new "true" recency list.

### Footer Section

Fixed to the bottom of the sidebar is the footer section.

**User Link** (left side)

- User name display with bullet indicator (●)
- Opens user profile/account settings
- Visual indicator shows active/logged-in state

**Help Menu** (right side)

- Question mark icon (?) in a circle
- Quick access to help documentation or support
- Positioned in bottom-right corner

## Implementation Notes

### Dependencies
- **shadcn/ui components:**
  - `Collapsible` - Workspace/folder expand/collapse
  - `Command` - Search dialog with keyboard navigation
  - `ScrollArea` - Smooth scrolling in content area
  - `Select` - Context switcher dropdown
  - `Separator` - Visual dividers
  - `Tooltip` - Truncated text helpers
- **Icons:** `lucide-react` (Menu, Search, ChevronDown, ChevronRight, Folder, File, HelpCircle, User)
- **Utilities:** `@tldraw/utils` (localStorage helpers)

### Performance Considerations
- **Virtualized Lists:** Use if workspace/document count exceeds 50 items
- **Memoization:** `React.memo` on `<WorkspaceItem>`, `<FolderItem>`, `<DocumentItem>` to prevent unnecessary re-renders
- **Lazy Loading:** Load folder contents on expand (not on initial render)
- **Debounced Search:** 300ms debounce on search input to reduce API calls

### Accessibility
- **ARIA Roles:** `navigation`, `region`, `tree`, `treeitem`
- **ARIA States:** `aria-expanded` for collapsible sections
- **Focus Management:** Return focus to trigger after closing dialogs
- **Keyboard Navigation:** Arrow keys, Enter, Escape
- **Color Contrast:** WCAG AA minimum for all text
- **Screen Reader:** Announce context switches

### Testing
- **E2E Tests:** See `tickets/NAV-08-enhanced-sidebar-navigation.md` Testing Requirements section
- **File:** `e2e/sidebar-navigation.spec.ts` (to be created)
- **Coverage:**
  - Context switching (workspaces ↔ recent)
  - Expand/collapse persistence (localStorage)
  - Shift+click sibling collapse
  - Search functionality (global + context-specific)
  - Recent view ordering (session vs refresh)
  - Keyboard navigation

## Related Documentation

- **Implementation Ticket:** [NAV-08: Enhanced Sidebar Navigation](tickets/NAV-08-enhanced-sidebar-navigation.md)
- **Dependencies:**
  - [NAV-02: Global Dashboard](tickets/NAV-02-global-dashboard.md) ✅ Complete
  - [NAV-07: Recent Documents](tickets/NAV-07-recent-documents-tracking-and-display.md) ✅ Complete
  - [DOC-02: Folder Hierarchy](tickets/DOC-02-folder-hierarchy-and-cycle-prevention.md) 🔄 In Progress
  - [DESIGN-06: shadcn Component Integration](tickets/backlog/DESIGN-06-shadcn-component-integration.md) 🔄 In Progress
- **API Reference:** [API.md](simple-client/API.md) - `/api/dashboard`, `/api/search`
- **Frontend Guide:** [FRONTEND_GUIDE.md](simple-client/FRONTEND_GUIDE.md) - Component patterns, styling
- **Realtime Architecture:** [TECH-09](tickets/TECH-09-realtime-update-architecture.md) ✅ Complete
