# [PERM-02]: Document Sharing Modes

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
- [x] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Provide document-level sharing controls supporting private, public read-only, and public editable modes with backend enforcement and intuitive UI modal.

## Acceptance Criteria

- [ ] Sharing modal allows workspace members to set document mode (private/public read/public edit) and copy shareable links.
- [ ] `/api/documents/[id]/share` endpoint updates sharing state, storing required metadata (e.g., public token) and invalidating caches.
- [ ] Canvas and API respect sharing mode, preventing edits for read-only guests and blocking access when set to private.

## Technical Details

### Database Schema Changes

- Add sharing fields to `documents` table (e.g., `visibility`, `public_token`, `public_can_edit`).

### API Endpoints

- Implement share endpoint and middleware to resolve access via tokens vs membership.
- Provide link validation route for public access checks.

### UI Components

- Build share modal with radio buttons/toggles, explanation copy, and copy-to-clipboard functionality.
- Display current sharing state within document header.

### Permissions/Security

- Only workspace members can change sharing settings (coordinate with PERM-04).
- Generate cryptographically secure tokens for public links; allow regeneration.

## Dependencies

- PERM-03 guest experience to consume public modes.
- DOC-03 move logic to ensure sharing state follows document across workspaces.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERM-02.
- Product spec: product.md > Permissions & Sharing > Document-Level Sharing.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Document permissions.

## Notes

Define default sharing mode (private) and evaluate analytics for share mode adoption to inform future improvements.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
