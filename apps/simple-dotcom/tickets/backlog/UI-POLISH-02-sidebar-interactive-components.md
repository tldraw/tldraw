# UI-POLISH-02: Sidebar Interactive Component Upgrades

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
- [ ] P1 (Post-MVP)
- [x] P2 (Nice to Have)

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

Upgrade sidebar interactive components to match the UX patterns shown in design mockups. This ticket focuses on component behavior refinements that enhance the user experience without being blocking for MVP.

Key upgrades:
1. Replace context switcher click-to-cycle with proper dropdown menu
2. Implement inline search with results (preferred approach, replacing current modal)
3. Add help menu popover/tooltip

This is a post-MVP enhancement task to align the sidebar UX with approved design patterns.

## Acceptance Criteria

### Context Switcher Dropdown (Priority 1)
- [ ] Replace click-to-cycle behavior with dropdown menu
  - [ ] Click context header shows dropdown with options
  - [ ] Options: "Workspaces", "Recent", "Shared with me"
  - [ ] Selected option highlighted
  - [ ] Keyboard navigation: arrow keys + enter
  - [ ] Close on selection or click outside
- [ ] Implement using shadcn/ui `DropdownMenu` or `Select` component
- [ ] Match visual design from `designs/sidebar-context-switcher.png`
- [ ] Proper accessibility (ARIA attributes, focus management)

### Help Menu Popover (Priority 2)
- [ ] Implement help menu popover/tooltip
  - [ ] Click help icon (?) shows popover menu
  - [ ] Menu items:
    - [ ] Link to documentation
    - [ ] Keyboard shortcuts reference
    - [ ] Support/feedback link
    - [ ] About/version info
  - [ ] Popover positioned relative to help button
  - [ ] Close on click outside or escape key
- [ ] Use shadcn/ui `Popover` component
- [ ] Match visual design from `designs/sidebar-help-menu.png`

### Inline Search (Priority 3)
- [ ] Replace modal search with inline input field
  - [ ] Input appears in place of context header when activated
  - [ ] Results display inline, replacing main content area temporarily
  - [ ] Close button (X) dismisses search and restores context header
  - [ ] Filtering happens as user types (debounced)
  - [ ] Match visual design from `designs/sidebar-search.png`
- [ ] Keyboard interactions:
  - [ ] ⌘K or Ctrl+K activates search
  - [ ] Escape dismisses search and restores previous view
  - [ ] Arrow keys navigate results
  - [ ] Enter opens selected document
- [ ] Result display:
  - [ ] Show document name
  - [ ] Show workspace/folder path as metadata
  - [ ] Highlight matching text
  - [ ] Group by workspace (optional enhancement)

## Technical Details

### Database Schema Changes

- N/A

### API Endpoints

- Reuse existing `/api/search` endpoint
- No changes required

### UI Components

Update components in `/src/components/sidebar/`:
- `SidebarContextHeader.tsx` - Replace cycle logic with dropdown
- `SidebarFooter.tsx` - Add help menu popover
- `Sidebar.tsx` - Integrate inline search mode (replaces context header temporarily)

New components:
- `HelpMenuContent.tsx` - Help menu content/links
- `SidebarInlineSearch.tsx` - Inline search component (replaces modal approach)

### shadcn/ui Components

Install if not already present:
- `DropdownMenu` - For context switcher
- `Popover` - For help menu
- Existing: `Command` (already used for search dialog)

### Permissions/Security

- N/A (UI behavior only)

## Dependencies

**Required:**
- ✅ NAV-08 (Enhanced Sidebar Navigation) - must be complete
- ✅ UI-POLISH-01 (Visual Refinements) - should be complete for consistency

**Recommended:**
- DESIGN-06 shadcn component integration tickets
- Keyboard shortcuts documentation (if creating shortcuts reference)

## Testing Requirements

### E2E Tests (Playwright)

Create `e2e/sidebar-interactions.spec.ts` or extend existing:

- [ ] **Context switcher:**
  - [ ] Click context header opens dropdown
  - [ ] Select "Recent" from dropdown, verify view updates
  - [ ] Keyboard: arrow down highlights next option
  - [ ] Keyboard: enter selects highlighted option
  - [ ] Click outside closes dropdown without selection
  - [ ] Escape key closes dropdown

- [ ] **Help menu:**
  - [ ] Click help icon opens popover
  - [ ] Verify menu items render correctly
  - [ ] Click "Documentation" link navigates correctly
  - [ ] Click outside closes popover
  - [ ] Escape key closes popover

- [ ] **Inline search:**
  - [ ] Click search button activates inline search mode
  - [ ] Context header replaced with search input
  - [ ] Input auto-focuses on activation
  - [ ] Type query, verify results filter in real-time (debounced)
  - [ ] Click X or press Escape closes search, restores context header
  - [ ] Arrow keys navigate through results
  - [ ] Enter opens selected document
  - [ ] Search works across all user's accessible documents

### Manual Testing Scenarios
- [ ] Test dropdown with keyboard-only navigation
- [ ] Verify popover positioning at different scroll positions
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify smooth transitions and animations
- [ ] Test on mobile viewport (if sidebar is responsive)

## Related Documentation

- Design mockups: `designs/sidebar-context-switcher.png`, `designs/sidebar-help-menu.png`, `designs/sidebar-search.png`
- Implementation: `SIDEBAR.md`
- Parent ticket: `tickets/NAV-08-enhanced-sidebar-navigation.md`
- shadcn/ui docs: https://ui.shadcn.com/

## Notes

### Context Switcher Implementation

Current behavior (click-to-cycle):
```typescript
// SidebarContextHeader.tsx:33-39
const handleContextClick = () => {
  const contexts: SidebarContext[] = ['workspaces', 'recent', 'shared-with-me']
  const currentIndex = contexts.indexOf(currentContext)
  const nextIndex = (currentIndex + 1) % contexts.length
  onContextChange(contexts[nextIndex])
}
```

Proposed behavior (dropdown menu):
```typescript
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger>
    <span>{contextLabels[currentContext]}</span>
    <ChevronDown />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={() => onContextChange('workspaces')}>
      Workspaces
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onContextChange('recent')}>
      Recent
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onContextChange('shared-with-me')}>
      Shared with me
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Help Menu Content

Suggested menu items:
- **Documentation** - Link to user guide/docs site
- **Keyboard Shortcuts** - Modal or popover with shortcut reference
  - ⌘K: Global search
  - ⌘N: New document
  - Etc.
- **Support** - Link to support email or help center
- **Give Feedback** - Link to feedback form or GitHub issues
- **About** - App version, license info

### Inline Search Implementation

**Decision:** Implement inline search to replace current modal approach.

**Rationale:**
- More aligned with design mockups (`designs/sidebar-search.png`)
- Faster, more contextual access (no modal transition)
- Keeps user focused within sidebar workflow
- Better integration with sidebar navigation state

**Implementation approach:**
- Search input replaces context header temporarily when activated
- Results display inline in the main sidebar content area
- Debounced filtering for performance (300ms delay)
- Reuse existing `/api/search` endpoint
- Smooth transitions between search mode and normal sidebar views

**Migration from modal:**
- Remove or deprecate `SearchDialog.tsx` component
- Move search activation to sidebar header (search icon button)
- Preserve ⌘K keyboard shortcut for search activation

### Accessibility Considerations

**Context switcher dropdown:**
- `role="menu"` on dropdown content
- `aria-expanded` on trigger
- `aria-label` describing purpose
- Focus trap within dropdown when open
- Restore focus to trigger on close

**Help menu popover:**
- `role="menu"` or `role="dialog"` depending on complexity
- `aria-labelledby` referencing trigger
- Focus management for modal behavior
- Keyboard navigation (Tab, Shift+Tab, Escape)

**Inline search:**
- `role="search"` on container
- `aria-label` on input (e.g., "Search documents")
- `aria-live="polite"` region for result count announcements
- Focus input automatically on activation
- Arrow key navigation for results with `aria-activedescendant`
- Restore previous focus on close (e.g., search button)

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Estimate: 2 days** for interactive upgrades:
- Context switcher dropdown: 2-3 hours
- Help menu popover: 2-3 hours
- Inline search implementation: 4-6 hours
- Testing and refinement: 3-4 hours

Total: ~2 days for all three components

## Worklog

_2025-10-10:_ Ticket created based on design comparison. Identified interactive component gaps between current implementation (NAV-08) and approved designs. Prioritized context switcher dropdown and help menu as P2; inline search as P3 (optional).

_2025-10-10 (updated):_ Changed inline search from "optional" to preferred approach. Updated ticket to reflect inline search as the standard implementation, replacing the current modal approach. This better aligns with design mockups and provides more contextual user experience.

## Open Questions

1. **Inline search (RESOLVED):**
   - ~~Should we keep the modal approach or switch to inline?~~
   - **Decision:** Implement inline search as preferred approach per design mockups

2. **Help menu links:**
   - Where should "Documentation" link point? (tldraw.dev? custom docs?)
   - What support channel should be linked? (email, Discord, GitHub issues?)
   - Should "Give Feedback" be included in MVP?

3. **Keyboard shortcuts reference:**
   - Should shortcuts reference be comprehensive or minimal?
   - Should it be a modal, popover, or separate page?
   - Are all keyboard shortcuts documented anywhere?

4. **"Shared with me" context:**
   - This context is not yet implemented (see NAV-08 future enhancements)
   - Should dropdown include this option now (disabled state) or hide until implemented?
   - **Recommendation:** Hide until feature exists to avoid user confusion
