# [TECH-05]: Folder Ancestry Validation

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
- [x] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Implement backend validation to prevent folder hierarchy cycles and enforce maximum depth of 10 levels, raising descriptive errors for invalid move/create operations.

## Acceptance Criteria

- [ ] Folder create/move operations compute ancestry chain and reject actions that would introduce cycles or exceed depth limit.
- [ ] Validation logic shared across API and database (e.g., using stored procedures or triggers) to prevent bypass.
- [ ] Errors surfaced to clients include actionable messaging for UI display.

## Technical Details

### Database Schema Changes

- Add stored procedures (e.g., `validate_folder_parent`) or constraints executed before insert/update.

### API Endpoints

- Ensure folder-related endpoints call validation helpers and map errors to HTTP responses.

### UI Components

- N/A directly; consumed by DOC-02.

### Permissions/Security

- Validate that operations remain within same workspace to avoid cross-workspace parent assignment.

## Dependencies

- TECH-01 schema foundation.
- DOC-02 folder management UI.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-05.
- Product spec: product.md > Implementation Details > Folder Hierarchy & Cycle Prevention.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Cycle Prevention Strategy.

## Notes

Benchmark validation performance under deep hierarchies to ensure it does not become a bottleneck.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
