# [PERM-03]: Guest Access Experience

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Deliver guest-facing document experience for public links, ensuring guests can view or edit based on sharing mode without seeing workspace chrome or management controls.

## Acceptance Criteria

- [ ] Public document routes render streamlined UI without workspace sidebar, showing required context (document name, owner) and CTA to sign up.
- [ ] Guest permissions enforced so read-only links block editing actions while editable links allow limited editing in canvas.
- [ ] Access to private documents via public link returns 403 page with messaging guiding user to request access.

## Technical Details

### Database Schema Changes

- None beyond PERM-02 fields.

### API Endpoints

- Ensure public access routes verify sharing token and return sanitized document data without workspace metadata.

### UI Components

- Build guest layout variant for `/d/[id]` and apply to share entry points.
- Add banners encouraging signup/login for guests.

### Permissions/Security

- Prevent guests from loading workspace lists, archives, or member info.
- Ensure tokens cannot escalate to other documents/workspaces.

## Dependencies

- PERM-02 document sharing modes.
- NAV-04 document view routing.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERM-03.
- Product spec: product.md > Permissions & Sharing > Guest access.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Guest access.

## Notes

Coordinate with marketing to ensure guest view includes appropriate branding and conversion messaging without distracting from canvas.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
