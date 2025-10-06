# [MEM-03]: Invitation Link Lifecycle

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
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Create and manage sharable invitation links per workspace, supporting enable/disable toggles, regeneration that invalidates prior tokens, and clear UI feedback for owners.

## Acceptance Criteria

- [ ] `/api/workspaces/[id]/invite` endpoint exposes current invitation state, enables/disables link, and regenerates tokens, invalidating old links immediately.
- [ ] Workspace settings surface link status with copy-to-clipboard controls, enabled/disabled state, and regeneration confirmation.
- [ ] Regenerated or disabled links render previous tokens unusable, returning descriptive errors through join flow.

## Technical Details

### Database Schema Changes

- Ensure `invitation_links` table exists with fields: `workspace_id`, `token`, `is_enabled`, `created_at`, `regenerated_at`.

### API Endpoints

- Implement GET/POST/PATCH handlers under `/api/workspaces/[id]/invite` for state queries and mutations.
- Invalidate cached tokens and broadcast changes via Supabase Realtime channel.

### UI Components

- Build invitation management panel in workspace settings with status badge, toggle, and regeneration button.

### Permissions/Security

- Restrict invite management to workspace owners.
- Generate cryptographically secure tokens with expiration optional configuration.

## Dependencies

- MEM-04 join-by-link flow to consume invitation endpoints.
- TECH-04 API layer scaffolding.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: MEM-03.
- Product spec: product.md > MVP Scope > Workspace invitations.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace invitations.

## Notes

Coordinate with marketing email provider if we later support direct invitation emails; ensure link format is stable before sharing externally.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
