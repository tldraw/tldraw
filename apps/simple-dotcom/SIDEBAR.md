# Sidebar Design

This document describes the sidebar navigation component for Simple tldraw.

## Overview

The sidebar provides contextual navigation for workspaces and documents with a **two-tier header system**. The design emphasizes context-aware content display, showing a flat document list for the active workspace while other workspaces remain collapsed for quick switching.

## Layout Structure

### Global Header (Tier 1)

The top-level header provides application-wide navigation and utilities:

- **tldraw branding** - Application logo/name
- **Menu icon** - Global menu or hamburger for additional options
- **Search icon** - Global search across all workspaces

### Context Header (Tier 2)

The second header shows the current workspace context with switching capabilities:

- **Current workspace name** - Displays active workspace (e.g., "Workspace A", "Course A")
- **Dropdown indicator** - Arrow/caret to open workspace switcher
- **Search icon** - Search within current workspace context

### Main Navigation Area

The content area is **context-aware**, adapting based on the selected workspace:

#### Active Workspace View

When viewing a specific workspace:

- **Documents displayed flat** - No nested indentation, clean vertical list
- **Direct document access** - All documents in the workspace shown at the same level
- **Other workspaces collapsed** - Shown with caret indicators (▸) for quick switching

Example structure when viewing "Workspace A":
```
[Workspace B ▸]
Document A
Document B
Document C
Document D
[Workspace C ▸]
Document E
Document F
```

#### Workspace Switching

- Click collapsed workspace names to switch context
- Use dropdown in context header for workspace selector
- Sidebar content updates to show selected workspace's documents

### Footer Section

The footer contains two distinct elements on a single row:

**User Link** (left side)
- User name display with bullet indicator (●)
- Opens user profile/account settings
- Visual indicator shows active/logged-in state

**Help Menu** (right side)
- Question mark icon (?) in a circle
- Quick access to help documentation or support
- Positioned in bottom-right corner

## Visual Design Patterns

- **Two-tier hierarchy**: Clear separation between global and contextual navigation
- **Flat document lists**: No deep nesting within workspace view
- **Context indicators**: Active workspace shown in header, others collapsed in list
- **Minimalism**: Clean, focused design without visual clutter
- **Fixed headers/footer**: Top and bottom sections remain fixed while middle scrolls

## Key Differences from Original Design

**Previous Design:**
- Single header with tldraw branding
- Nested tree structure (workspaces → documents)
- Documents always shown indented under workspaces
- Scratchpad as special top-level item

**Current Design:**
- Two-tier header (global + context)
- Context-aware flat lists
- Documents shown at same level when workspace is active
- Workspace switcher integrated into header

## Interactions

_This section will be expanded with additional wireframes showing:_

- Workspace switching flow
- Inline renaming
- Document creation within workspace
- Search functionality (global vs. contextual)
- Hover states
- Selection states
- Context menus
- Drag-and-drop behaviors
- Deletion flows
- Sharing controls

## Implementation Notes

- Aligns with workspace/document model from SPECIFICATION.md
- Workspace context maintained in UI state
- Documents filtered by active workspace via RLS
- Real-time updates for workspace/document changes (hybrid realtime strategy)
- Sidebar content re-renders on workspace context switch
