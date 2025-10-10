# UI-POLISH-01: Sidebar Visual Refinements

Date created: 2025-10-10
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

Polish the sidebar visual design to match the design mockups in `designs/sidebar-*.png`. This ticket focuses on visual refinements that don't change core functionality: icons, document status indicators, and styling adjustments.

This is a post-MVP polish task to bring the functional sidebar implementation (NAV-08) into alignment with the approved designs.

## Acceptance Criteria

### Global Header (Tier 1)
- [ ] Replace text-only "tldraw" branding with logo + text
  - [ ] Add tldraw icon/logo (square icon) next to "tldraw" text
  - [ ] Ensure proper spacing and alignment
  - [ ] Icon should be 20-24px size
- [ ] Replace hamburger menu icon with "panels/layout" icon
  - [ ] Use appropriate lucide-react icon (LayoutGrid, Panels, or similar)
  - [ ] Match icon style from `designs/sidebar-contexts.png`

### Document Status Indicators
- [ ] Add colored dot/icon indicators before document names
  - [ ] Recent documents: timestamp or recency indicator
  - [ ] Shared documents: share icon or indicator
  - [ ] Guest-accessible: appropriate visual marker
  - [ ] Active document: highlight with accent color
- [ ] Implement icon color system
  - [ ] Use theme colors (primary, secondary, muted)
  - [ ] Ensure WCAG AA contrast requirements met
  - [ ] Support light and dark modes

### User Footer Styling
- [ ] Adjust bullet indicator color to match design
  - [ ] Current: `text-foreground/60` (lighter)
  - [ ] Design: solid black/dark bullet
  - [ ] Ensure visibility in both light/dark modes

### Visual Polish
- [ ] Review spacing/padding against designs
- [ ] Ensure consistent hover states across all interactive elements
- [ ] Verify focus indicators for keyboard navigation
- [ ] Check truncation behavior for long names
- [ ] Validate responsive behavior at different sidebar heights

## Technical Details

### Database Schema Changes

- N/A

### API Endpoints

- N/A

### UI Components

Update existing components in `/src/components/sidebar/`:
- `SidebarGlobalHeader.tsx` - Add logo, update menu icon
- `SidebarDocumentItem.tsx` - Add status indicators
- `SidebarFooter.tsx` - Adjust bullet color

### Assets Needed

- tldraw logo SVG or PNG (square format, 20-24px)
- Confirm icon choice for menu button with designer

### shadcn/ui Components

- Badge (for document status indicators) - may need to install
- Existing icons from lucide-react

### Permissions/Security

- N/A (visual-only changes)

## Dependencies

**Required:**
- ✅ NAV-08 (Enhanced Sidebar Navigation) - must be complete

**Recommended:**
- DESIGN-05 (Design System Foundation) - for color tokens and spacing scale
- Dark mode implementation (if not yet complete)

## Testing Requirements

### Manual Testing Scenarios
- [ ] Test logo appearance in light and dark modes
- [ ] Verify document indicators show correct states
- [ ] Check icon alignment and spacing
- [ ] Test with long workspace/document names (truncation)
- [ ] Verify WCAG AA contrast ratios using browser tools

### E2E Tests
- [ ] Update existing sidebar tests if selectors change
- [ ] Add visual regression tests if tooling available

## Related Documentation

- Design mockups: `designs/sidebar-*.png`
- Implementation: `SIDEBAR.md`
- Parent ticket: `tickets/NAV-08-enhanced-sidebar-navigation.md`
- Design system: `tickets/backlog/DESIGN-05-design-system-foundation.md`

## Notes

### Assets Location
- Logo should be added to `simple-client/public/` or `simple-client/src/assets/`
- Use Next.js Image component for optimization if bitmap format

### Icon Selection
For the menu button, consider these lucide-react options:
- `LayoutGrid` - grid of squares
- `Panels` - two rectangles side-by-side
- `LayoutDashboard` - dashboard layout icon
- `Menu` (current) - three horizontal lines

Review `designs/sidebar-contexts.png` at line 77 to confirm which icon best matches.

### Document Status Indicators
Reference existing patterns from:
- `src/components/documents/DocumentActions.tsx` - for document state logic
- `src/lib/api/types.ts` - Document type includes `sharing_mode`, `is_archived`

Possible indicator logic:
```typescript
// Pseudo-code for indicator selection
const getDocumentIndicator = (doc: Document, isRecent: boolean) => {
  if (doc.is_archived) return { icon: 'Archive', color: 'muted' }
  if (doc.sharing_mode !== 'private') return { icon: 'Share', color: 'primary' }
  if (isRecent) return { icon: 'Clock', color: 'accent' }
  return null // No indicator
}
```

### Color System
Ensure consistency with theme:
```typescript
// Example color mapping
const indicatorColors = {
  recent: 'text-blue-500 dark:text-blue-400',
  shared: 'text-green-500 dark:text-green-400',
  archived: 'text-gray-400 dark:text-gray-600',
  active: 'text-primary',
}
```

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Estimate: 0.5-1 day** for visual refinements:
- Logo and icon updates: 1-2 hours
- Document status indicators: 2-3 hours
- Styling adjustments: 1-2 hours
- Testing and refinement: 1 hour

## Worklog

_2025-10-10:_ Ticket created based on design comparison. Identified visual gaps between current implementation (NAV-08) and approved designs in `designs/` folder.

## Open Questions

1. **Logo asset:**
   - Where is the official tldraw logo asset? Check with design team
   - What format/size should be used? (SVG preferred for scalability)

2. **Menu icon:**
   - Which specific icon from lucide-react matches the design intent?
   - Request confirmation from designer

3. **Document indicator priority:**
   - If a document is both "recent" and "shared", which indicator takes precedence?
   - Should multiple indicators be shown simultaneously?

4. **Dark mode:**
   - Are dark mode variants of the designs available?
   - How should indicators adapt to dark theme?
