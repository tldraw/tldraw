# [WS-03]: Member Settings and Leave Flow

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
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Allow non-owner members to view workspace settings in read-only mode and leave shared workspaces independently. Ensure UI clearly differentiates member vs owner capabilities and updates membership records when users leave.

## Acceptance Criteria

- [ ] Workspace settings page renders read-only state for members without owner permissions, hiding or disabling restricted controls.
- [ ] Members can trigger a leave action via UI that calls `/api/workspaces/[id]/leave` and removes their membership while preserving workspace data.
- [ ] Post-leave, member is redirected to dashboard with confirmation messaging and workspace removed from their lists.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Implement `/api/workspaces/[id]/leave` endpoint that deletes membership and updates caches/realtime feeds.

### UI Components

- Update settings layout to branch on role; add prominent "Leave workspace" button for members.

### Permissions/Security

- Validate membership existence before processing leave; ensure owners use transfer flow per WS-02.

## Dependencies

- WS-01 workspace CRUD endpoints.
- MEM-02 membership listing for verifying state.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: WS-03.
- Product spec: product.md > MVP Scope > Workspace membership.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace membership.

## Notes

Ensure analytics/events track leave actions for potential churn analysis.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
