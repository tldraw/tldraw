# [DESIGN-03]: Document Sharing Modal & Permission Controls

Date created: 2025-10-04
Date last updated: -
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
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Design the sharing modal that allows members to toggle document visibility (private, public read-only, public editable), copy/manage links, and understand the implications of each setting.

## Acceptance Criteria

- [ ] Modal flow covers default state, mode switching, link copy, regeneration confirmation, and disabled/guest views.
- [ ] Visual hierarchy and warning treatments for public editable mode specified, including iconography and color usage.
- [ ] Accessibility annotations cover focus trapping, keyboard navigation, and screen reader descriptions for permission changes.
- [ ] Guidance provided for inline share status indicators (document header/badges) aligning with modal states.

## Technical Details

### Database Schema Changes

- N/A

### API Endpoints

- N/A

### UI Components

- Sharing modal, share status badge, guest view messaging.

### Permissions/Security

- Document visuals for non-member/guest access, showing disabled controls and explanatory copy.

## Dependencies

- PERM-02 document sharing modes implementation.
- PERM-03 guest experience.
- MEM-03 invitation link management for regeneration patterns.
- DESIGN-05 design system foundation.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERM-02, PERM-03, PERM-04.
- Product spec: product.md > Permissions & Sharing.

## Notes

Include microcopy and tooltip guidance for each sharing mode so engineering can implement without additional content passes.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
