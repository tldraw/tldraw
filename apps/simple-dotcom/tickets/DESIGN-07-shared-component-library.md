# [DESIGN-07]: Shared Document/Folder Component Library

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

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

- [ ] **Document List/Card Components:**
  - `<DocumentListItem>` - List view variant with name, metadata, actions
  - `<DocumentCard>` - Card/grid view variant with thumbnail (if applicable)
  - Support for selection, hover states, drag handles (for future reorder)

- [ ] **Folder Components:**
  - `<FolderListItem>` - Folder display in list views
  - `<FolderTree>` - Hierarchical folder browser with expand/collapse
  - Breadcrumb component for folder navigation

- [ ] **Action Menus:**
  - `<DocumentActions>` - Dropdown menu with rename, duplicate, archive, delete options
  - `<FolderActions>` - Dropdown menu with rename, move, delete options
  - Role-aware rendering (hide admin actions for non-owners)

- [ ] **Display Name Utilities:**
  - `formatUserDisplayName(user)` - Returns display name or initials, never raw email
  - `<UserAvatar>` - Consistent avatar display with initials/image
  - `<UserBadge>` - User name with avatar for presence/metadata displays

- [ ] **Empty States:**
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

## Open questions

- Should components include loading states or defer to parent?
  → Include skeleton loading states within components for consistency.
- Do we need different variants for dashboard vs workspace views?
  → Start with single variant; add view-specific props if needed.
- Should we use virtualization for long lists?
  → Not for MVP; add if performance issues arise (likely threshold: >100 items).
