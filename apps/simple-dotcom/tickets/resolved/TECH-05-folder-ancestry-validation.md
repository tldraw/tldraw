# [TECH-05]: Folder Ancestry Validation

Date created: 2025-10-04
Date last updated: 2025-10-07
Date completed: 2025-10-07

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

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
- [x] Testing
- [x] Infrastructure

## Description

Implement backend validation to prevent folder hierarchy cycles and enforce maximum depth of 10 levels, raising descriptive errors for invalid move/create operations.

## Acceptance Criteria

- [x] Folder create/move operations compute ancestry chain and reject actions that would introduce cycles or exceed depth limit.
- [x] Validation logic shared across API and database (e.g., using stored procedures or triggers) to prevent bypass.
- [x] Errors surfaced to clients include actionable messaging for UI display.

## Technical Details

### Database Schema Changes

- Database triggers already implemented in base schema migration (TECH-01):
  - `prevent_folder_cycles()` trigger function validates no cycles on INSERT/UPDATE
  - `check_folder_depth()` trigger function enforces 10-level max depth on INSERT/UPDATE

### API Endpoints

- Created `/api/folders/[folderId]/route.ts` with PATCH and DELETE endpoints
- PATCH endpoint includes validation for:
  - Cycle detection (folder cannot be moved into itself or descendants)
  - Depth limit enforcement (max 10 levels)
  - Cross-workspace boundary prevention
- Helper functions:
  - `getFolderDepth()` - calculates folder depth by traversing parent chain
  - `wouldCreateCycle()` - checks if a move would create circular reference
- Error codes properly mapped to HTTP status codes with descriptive messages

### UI Components

- N/A directly; consumed by DOC-02.

### Permissions/Security

- [x] Validate that operations remain within same workspace to avoid cross-workspace parent assignment.
- [x] Membership validation before any folder operations
- [x] RLS policies enforced at database level

## Dependencies

- [x] TECH-01 schema foundation (completed).
- [ ] DOC-02 folder management UI (pending).

## Testing Requirements

- [x] Unit tests - 14 comprehensive tests covering all validation scenarios
- [x] Integration tests - API route tests with mocked Supabase client
- [ ] E2E tests (Playwright) - deferred to DOC-02 for full UI integration
- [x] Manual testing scenarios

## Related Documentation

- SPECIFICATION.md: TECH-05 requirement
- Base schema migration: `/supabase/migrations/20251004152910_tech_01_base_schema.sql`
- API error codes: `/simple-client/src/lib/api/errors.ts`
- API types: `/simple-client/src/lib/api/types.ts`

## Notes

Benchmark validation performance under deep hierarchies to ensure it does not become a bottleneck.

**Performance considerations:**
- Validation functions use efficient traversal algorithms with safety limits (max 15 iterations)
- Database triggers provide double-layer protection at both API and database levels
- Queries use indexed foreign key relationships for optimal performance

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Actual time:** ~4 hours (faster than estimated due to existing database validation)

## Worklog

### 2025-10-07

**Database validation review:**
- Discovered database triggers already implemented in base schema migration
- `prevent_folder_cycles()` function validates folder hierarchy integrity
- `check_folder_depth()` function enforces 10-level maximum depth
- Both triggers execute on INSERT/UPDATE providing database-level protection

**API implementation:**
- Created `/api/folders/[folderId]/route.ts` with PATCH and DELETE endpoints
- Implemented `getFolderDepth()` helper to calculate folder depth by parent traversal
- Implemented `wouldCreateCycle()` helper to detect circular references
- Added comprehensive error handling with descriptive messages:
  - `FOLDER_CYCLE_DETECTED` - when move would create cycle
  - `FOLDER_DEPTH_EXCEEDED` - when depth would exceed 10 levels
  - `FOLDER_NOT_IN_WORKSPACE` - when crossing workspace boundaries
- Validation occurs both at API layer (for better error messages) and database layer (for security)

**Testing:**
- Created comprehensive test suite with 14 test cases
- Tests cover:
  - Successful operations (name update, parent move)
  - Cycle detection (self-reference, descendant reference)
  - Depth limit enforcement
  - Workspace boundary validation
  - Authorization checks
  - Error handling
- All tests passing

**Files created/modified:**
1. `/simple-client/src/app/api/folders/[folderId]/route.ts` (new)
   - PATCH endpoint for updating folder name/parent
   - DELETE endpoint for folder deletion
   - Helper functions for validation
2. `/simple-client/src/app/api/folders/[folderId]/route.test.ts` (new)
   - 14 comprehensive test cases
   - Mock Supabase client interactions
   - Edge case coverage

**Error handling:**
- Database triggers catch any attempts to bypass API validation
- API validation provides user-friendly error messages
- Error codes properly mapped to HTTP status codes
- All errors include actionable guidance for users

## Completion Summary

**What was implemented:**

1. **Database-level validation** (already existed in TECH-01):
   - Trigger functions prevent cycles and enforce depth limits
   - Double-layer protection at database level

2. **API-level validation** (new):
   - PATCH `/api/folders/[folderId]` - update folder name or parent with validation
   - DELETE `/api/folders/[folderId]` - delete folder with cascade behavior
   - Helper functions for depth calculation and cycle detection
   - Comprehensive error messages for better UX

3. **Testing** (new):
   - 14 unit/integration tests covering all validation scenarios
   - Tests verify both success cases and all error conditions
   - All tests passing

**Key architectural decisions:**

1. **Two-layer validation approach:**
   - API layer validates first with detailed error messages
   - Database triggers provide security backstop
   - API validation improves UX, database validation ensures integrity

2. **Efficient traversal algorithms:**
   - Safety limit of 15 iterations prevents infinite loops
   - Uses indexed foreign key relationships
   - Visited set tracking prevents cycle issues

3. **Clear error messaging:**
   - Errors explain what went wrong and why
   - Messages actionable for UI display
   - Consistent error code mapping

**Ready for DOC-02:**
- All backend validation complete and tested
- API endpoints ready for folder management UI
- Error handling prepared for user-facing displays

## Open questions

None - all requirements satisfied.
