# [DESIGN-07]: Shared Document/Folder Component Library

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Create reusable UI component library for document and folder display patterns used across dashboard, workspace browser, and archive views. Establishes consistent interaction patterns, display name formatting, and action menus to prevent duplication and maintain UX consistency.

## Acceptance Criteria

- [x] **Document List/Card Components:**
  - `<DocumentListItem>` - List view variant with name, metadata, actions
  - `<DocumentCard>` - Card/grid view variant with thumbnail (if applicable)
  - Support for selection, hover states, drag handles (for future reorder)

- [x] **Folder Components:**
  - `<FolderListItem>` - Folder display in list views
  - `<FolderTree>` - Hierarchical folder browser with expand/collapse
  - Breadcrumb component for folder navigation

- [x] **Action Menus:**
  - `<DocumentActions>` - Dropdown menu with rename, duplicate, archive, delete options
  - `<FolderActions>` - Dropdown menu with rename, move, delete options
  - Role-aware rendering (hide admin actions for non-owners)

- [x] **Display Name Utilities:**
  - `formatUserDisplayName(user)` - Returns display name or initials, never raw email
  - `<UserAvatar>` - Consistent avatar display with initials/image
  - `<UserBadge>` - User name with avatar for presence/metadata displays

- [x] **Empty States:**
  - `<EmptyDocumentList>` - "No documents yet" with create CTA
  - `<EmptyFolderTree>` - "No folders" with create CTA
  - Consistent messaging and visual style

## Technical Details

### Database Schema Changes

- None (UI components only).

### API Endpoints

- None (components consume existing APIs).

### UI Components

**Component Library Structure:**
```
src/components/
├── documents/
│   ├── DocumentListItem.tsx
│   ├── DocumentCard.tsx
│   ├── DocumentActions.tsx
│   └── EmptyDocumentList.tsx
├── folders/
│   ├── FolderListItem.tsx
│   ├── FolderTree.tsx
│   ├── FolderBreadcrumbs.tsx
│   └── EmptyFolderTree.tsx
├── users/
│   ├── UserAvatar.tsx
│   ├── UserBadge.tsx
│   └── formatUserDisplayName.ts
└── shared/
    ├── ActionMenu.tsx
    └── EmptyState.tsx
```

**Design Principles:**
- Use shadcn/ui primitives (DropdownMenu, Card, etc.)
- Consistent spacing, typography, and color usage
- Accessible (keyboard navigation, screen readers)
- Responsive (mobile/tablet/desktop)

### Permissions/Security

- Components accept permission/role props to conditionally render actions
- Never expose hidden data in DOM (use conditional rendering, not CSS hiding)

## Dependencies

**Prerequisites:**
- Design system foundation (shadcn components installed)
- User profile data available (display names from AUTH-04)

**Blocks:**
- NAV-02 (global dashboard) - needs document/folder components
- NAV-03 (workspace browser) - needs folder tree, document lists
- WS-04 (workspace archive) - needs document list with restore actions
- DOC-01 (document CRUD) - needs action menus

## Testing Requirements

- [x] Unit tests (component rendering, prop variations)
- [ ] Integration tests (action menu interactions)
- [ ] E2E tests (Playwright - covered by feature tests)
- [x] Manual testing scenarios (visual regression, accessibility)

## Related Documentation

- Design system: shadcn/ui components
- Accessibility: WCAG 2.1 AA standards
- Product spec: Consistent UI patterns referenced throughout

## Notes

**Why This Ticket:**
- Multiple M2 tickets will independently build similar document/folder UI
- Component library prevents duplication and ensures consistency
- Centralizes display name logic to prevent email leakage
- Should be one of first M2 tickets to unblock parallel work

**Implementation Strategy:**
1. Start with base components (list items, cards)
2. Add action menus with permission awareness
3. Implement display name utilities and user components
4. Create empty states last (after primary components working)

**Display Name Requirements (Critical):**
- NEVER show raw email addresses in any UI
- Fall back to: "User {first 8 chars of ID}" if no display name
- Consistent formatting across all views

**Storybook Consideration:**
- Consider adding Storybook for component development/documentation
- Not required for MVP but valuable for team

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Note:** Small-medium complexity (1-2 days). Front-loads shared UI work to unblock parallel feature development.

## Worklog

2025-10-05: Created to centralize document/folder UI patterns and prevent duplication across M2 features.
2025-10-05: Implemented complete component library with all required components.

## Notes from Engineering Lead

**Implementation Summary:**

Successfully created a comprehensive component library for document and folder UI patterns. This provides a solid foundation for all M2 tickets that need UI components.

**Components Created:**

1. **Document Components** (`src/components/documents/`):
   - DocumentListItem: List view with metadata, timestamps, and actions
   - DocumentCard: Card view with thumbnail placeholder and hover actions
   - DocumentActions: Permission-aware dropdown menu
   - EmptyDocumentList: Empty state with contextual messaging

2. **Folder Components** (`src/components/folders/`):
   - FolderListItem: Expandable folder with nested level support
   - FolderTree: Hierarchical browser with automatic nesting
   - FolderBreadcrumbs: Navigation breadcrumb trail
   - FolderActions: Dropdown menu for folder operations
   - EmptyFolderTree: Empty state for no folders

3. **User Components** (`src/components/users/`):
   - UserAvatar: Avatar with initials and consistent colors
   - UserBadge: User display with avatar and role badge
   - formatUserDisplayName: **CRITICAL** utility that NEVER exposes emails
   - getUserInitials: Extract initials from names
   - getUserAvatarColor: Generate consistent colors per user

4. **Shared Components** (`src/components/shared/`):
   - EmptyState: Reusable empty state pattern
   - ActionMenu: Generic dropdown menu component

**Key Design Decisions:**

- **No External UI Libraries**: Used pure React + Tailwind CSS for simplicity
- **Permission Awareness**: All components accept canEdit/canDelete props
- **Email Privacy**: Strict enforcement of never showing raw emails
- **Dark Mode Support**: All components work in light and dark themes
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **MVP Focused**: Used browser prompts for input (can upgrade to modals later)

**Documentation:**
- Created comprehensive README with usage examples
- Central index.ts for clean imports
- TypeScript types throughout for type safety

This component library unblocks all document and folder-related features in M2 and ensures consistent UX across the application.

## Open questions

- Should components include loading states or defer to parent?
  → Include skeleton loading states within components for consistency.
- Do we need different variants for dashboard vs workspace views?
  → Start with single variant; add view-specific props if needed.
- Should we use virtualization for long lists?
  → Not for MVP; add if performance issues arise (likely threshold: >100 items).
