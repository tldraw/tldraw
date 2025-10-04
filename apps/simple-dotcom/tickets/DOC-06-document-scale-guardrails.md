# [DOC-06]: Document Scale Guardrails

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
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Implement monitoring and soft guardrails to support ~1000 documents per workspace and 10MB per document, warning users and surfacing telemetry when limits are approached or exceeded.

## Acceptance Criteria

- [ ] Document creation endpoint checks current document count per workspace and returns warning metadata when approaching 1000 documents.
- [ ] Upload/persistence pipeline validates tldraw payload size, rejecting documents above 10MB with actionable error messaging.
- [ ] Metrics/logging capture limit events for future scaling decisions.

## Technical Details

### Database Schema Changes

- Consider aggregated counter table or materialized view for document counts to avoid expensive COUNT queries.

### API Endpoints

- Extend document create/update endpoints to enforce payload size checks and produce warnings.

### UI Components

- Display limit warnings within document creation UI (modal, toast) when backend signals thresholds.

### Permissions/Security

- Ensure limit enforcement applies uniformly across API and realtime sync flows.

## Dependencies

- DOC-01 document CRUD operations.
- PERF-01 instrumentation infrastructure.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-06.
- Engineering notes: eng-meeting-notes.md > Feature Complexity > Document limits & file size.

## Notes

Investigate background job to recompute counts nightly to detect drift from manual database edits or migrations.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
