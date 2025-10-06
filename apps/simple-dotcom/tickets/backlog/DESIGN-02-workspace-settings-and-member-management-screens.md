# [DESIGN-02]: Workspace Settings & Member Management Screens

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
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Design the workspace settings experience, including member management, invitation controls, ownership transfer, and leave/delete confirmations for both owners and members.

## Acceptance Criteria

- [ ] Figma flows map entry points from dashboard and workspace views into settings subsections (general, members, invites, archive).
- [ ] High-fidelity mockups cover owner vs member permission states, including disabled controls and explanatory copy.
- [ ] Component specifications provided for member list rows, role badges, invitation link modules, and confirmation dialogs.
- [ ] Accessibility guidance documented for table navigation, focus management, and dialog behavior.

## Technical Details

### Database Schema Changes

- N/A

### API Endpoints

- N/A

### UI Components

- Member list, role badges, ownership transfer modal, invite management panel, leave/delete confirmations.

### Permissions/Security

- Document differences in visibility/editability for owners vs members.

## Dependencies

- WS-03 member settings UI implementation.
- MEM-01 through MEM-04 membership features.
- DESIGN-05 design system foundation.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: WS-03, MEM-01..MEM-04.
- Product spec: product.md > Workspace Management & Invitations.

## Notes

Include content strategy for error and success states so the engineering team can implement consistent messaging without additional design reviews.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
