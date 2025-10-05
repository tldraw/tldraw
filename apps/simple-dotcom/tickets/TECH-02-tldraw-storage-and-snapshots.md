# [TECH-02]: tldraw Storage and Snapshots

Date created: 2025-10-04
Date last updated: 2025-10-05
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
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Integrate Cloudflare R2 storage for persisting tldraw document snapshots while application data lives in Supabase, ensuring autosave and backup flows meet MVP reliability expectations.

## Acceptance Criteria

### M2 MVP Scope
- [ ] Sync worker writes snapshots of document state to R2 on key events (e.g., every 100 operations, every 5 minutes, on disconnect).
- [ ] Application retrieves latest snapshot when loading document; falls back to empty canvas if no snapshot exists.
- [ ] `documents` table tracks: `snapshot_key` (R2 object path), `last_snapshot_at` (timestamp), `snapshot_version` (integer).
- [ ] Basic error handling: retry logic for R2 write failures (3 attempts with exponential backoff).

### Deferred to M3 (Launch Hardening)
- Advanced retention policies (e.g., keep last 10 snapshots, auto-delete after 90 days)
- Lifecycle management (automated cleanup of orphaned snapshots)
- Manual restore UI (admin/user can browse and restore previous snapshots)
- Storage cost monitoring and budget alerts
- Snapshot compression/optimization

## Technical Details

### Database Schema Changes

Add to `documents` table:
- `snapshot_key` (text, nullable) - R2 object key/path (e.g., `documents/{workspace_id}/{document_id}/latest.json`)
- `last_snapshot_at` (timestamp, nullable) - when last snapshot was written
- `snapshot_version` (integer, default 0) - incremental version counter for conflict detection

### API Endpoints

**Sync Worker (Cloudflare Workers):**
- Snapshot write: Triggered by sync worker internally on snapshot events
- Snapshot read: Sync worker loads latest snapshot when client joins room

**Application API (optional for MVP):**
- `GET /api/documents/[documentId]/snapshot` - Fetch latest snapshot metadata (for debugging)
- Manual restore endpoints deferred to M3

### UI Components

- Surface autosave indicator reflecting snapshot status (integrated with COLLAB-03 offline state).

### Permissions/Security

- Secure R2 access with signed URLs scoped per document; ensure public documents only expose derived data as permitted.

## Dependencies

- COLLAB-01 real-time editing pipeline.
- DOC-05 archive hard delete to trigger snapshot cleanup.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-02.
- Product spec: product.md > Technical Architecture > Storage.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Document versioning.

## Notes

**MVP Simplifications:**
- Single "latest" snapshot per document (no version history)
- R2 object key format: `documents/{workspace_id}/{document_id}/latest.json`
- Snapshot on: every 100 ops, every 5 minutes, client disconnect
- Cleanup on document delete handled by DOC-05

**Implementation Strategy:**
1. Start with dotcom sync-worker R2 integration as template
2. Use R2 bindings in Workers (not REST API) for performance
3. Implement retry logic with exponential backoff
4. Log errors but don't block editing on snapshot failures

**Storage Cost Estimates (for planning):**
- Assume 100KB avg snapshot size
- 10,000 documents = ~1GB storage
- R2 pricing very low; cost monitoring in M3

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Clarified MVP scope. Single "latest" snapshot per document. Advanced retention, manual restore, and cost monitoring deferred to M3.

## Open questions

- Should snapshots be per-document or per-room (if multiple documents share rooms)?
  → Per-document for MVP; room architecture TBD based on COLLAB-01B design.
- How do we handle R2 write failures that exceed retry limit?
  → Log error, continue editing (editing never blocks on snapshot failures). Alert ops if failure rate > 5%.
- Do we need snapshot compression?
  → Not for MVP; JSON is reasonably efficient. Consider gzip in M3 if costs become concern.
