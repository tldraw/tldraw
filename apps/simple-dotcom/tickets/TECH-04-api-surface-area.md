# [TECH-04]: API Surface Area

Date created: 2025-10-04
Date last updated: 2025-10-04
Date completed: -

## Status

- [ ] Not Started
- [x] In Progress
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
- [x] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Define and implement RESTful API endpoints covering workspaces, documents, folders, members, invites, sharing, and presence, ensuring consistent conventions, versioning, and documentation.

## Acceptance Criteria

- [x] API routes implemented per specification with consistent naming, HTTP verbs, and error formats.
- [x] OpenAPI (or similar) documentation generated and published for internal use, kept in sync with code.
- [ ] API integration tests validate critical flows and permissions across endpoints. **(BLOCKED: requires AUTH-01 completion for authentication flows)**

## Technical Details

### Database Schema Changes

- None beyond existing tables.

### API Endpoints

- Implement routes: `/api/workspaces`, `/api/documents`, `/api/folders`, `/api/workspaces/[id]/members`, `/api/workspaces/[id]/invite`, `/api/documents/[id]/share`, `/api/presence/[documentId]`, `/api/search`, plus supporting endpoints.
- Adopt consistent response wrappers and error codes.
- **Clarification**: Presence endpoints are parameterized as `/api/presence/[documentId]` to scope presence to specific documents.

### UI Components

- Provide typed API client utilities for front-end consumption.

### Permissions/Security

- Integrate authentication middleware, rate limiting, and logging across all endpoints.
- **NOTE**: Rate limiting deferred to SEC-01 ticket (rate-limiting-and-abuse-prevention.md) to be implemented as a cohesive security layer.

## Dependencies

- TECH-01 schema foundation.
- PERM-01 access control policies.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests **(PENDING: requires AUTH-01 for authentication flows)**
- [ ] E2E tests (Playwright) **(PENDING: covered by TEST-01 ticket)**
- [x] Manual testing scenarios *(endpoints ready for manual testing once AUTH-01 is complete)*

## Related Documentation

- Product requirements: product-requirements.md: TECH-04.
- Product spec: product.md > Technical Architecture > API Endpoints.

## Notes

Establish versioning strategy (e.g., `/api/v1`) to support future backward-compatible changes.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-04
**Completed API Surface Area Implementation**

**Architecture & Infrastructure:**
- Created comprehensive type system in `src/lib/api/types.ts` covering all domain entities (workspaces, documents, folders, members, invitations, presence)
- Implemented consistent error handling with `ApiException` class and standardized error codes in `src/lib/api/errors.ts`
- Built response utilities for consistent API responses, pagination, and error handling in `src/lib/api/response.ts`
- Set up Supabase server-side client with auth helpers in `src/lib/supabase/server.ts`
- Generated TypeScript database types in `src/lib/supabase/database.types.ts`

**API Routes Implemented:**
- **Workspaces**: GET/POST `/api/workspaces`, GET/PATCH/DELETE `/api/workspaces/:id`, POST leave/transfer-ownership
- **Documents**: GET/POST `/api/workspaces/:id/documents`, GET/PATCH/DELETE `/api/documents/:id`
- **Folders**: GET/POST `/api/workspaces/:id/folders` with cycle detection and depth validation
- **Members**: GET `/api/workspaces/:id/members`, DELETE `/api/workspaces/:id/members/:userId`
- **Invitations**: GET/PATCH `/api/workspaces/:id/invite`, POST regenerate, POST `/api/invite/:token/join`
- **Sharing**: PATCH `/api/documents/:id/share` with mode validation
- **Presence**: GET/POST `/api/presence/:id` with session tracking
- **Search**: GET `/api/search` with workspace filtering

**Key Features:**
- Consistent RESTful conventions across all endpoints
- Proper HTTP verb usage (GET, POST, PATCH, DELETE)
- Comprehensive error handling with specific error codes
- Access control enforcement (owner, member, guest permissions)
- Support for public document sharing (read-only and editable modes)
- Pagination support for list endpoints
- Folder hierarchy validation (cycle prevention, max depth 10)
- Resource limits enforcement (100 workspaces/user, 100 members/workspace, 1000 documents/workspace)

**Frontend Integration:**
- Built typed API client in `src/lib/api/client.ts` for type-safe frontend consumption
- Exported singleton `apiClient` instance for easy usage
- All endpoints wrapped with TypeScript interfaces

**Documentation:**
- Created comprehensive API.md with endpoint specs, examples, and security notes
- Documented all error codes and response formats
- Added usage examples for both API client and direct fetch

**Dependencies Added:**
- `@supabase/ssr` for server-side Supabase client
- `@supabase/supabase-js` for Supabase JavaScript client

**Remaining Work to Complete Ticket:**
1. **Integration Tests (BLOCKED)**: Requires AUTH-01 to be completed first for authentication flows. Once auth is ready:
   - Test workspace CRUD operations with permission enforcement
   - Test document sharing modes (private, public read-only, public editable)
   - Test invitation flow (generate, enable/disable, join)
   - Test folder hierarchy validation (cycle prevention, depth limits)
   - Test member management and ownership transfer

2. **Rate Limiting (DEFERRED)**: Explicitly moved to SEC-01 (rate-limiting-and-abuse-prevention.md) ticket to implement as a cohesive security layer with:
   - Rate limiting middleware
   - Per-endpoint throttling configuration
   - IP-based and user-based limits
   - Abuse detection and logging

**Implementation Decision:**
- Chose to defer rate limiting to SEC-01 rather than implement piecemeal because:
  - SEC-01 ticket specifically focuses on rate limiting across the entire application
  - Allows for unified rate limiting strategy and configuration
  - Prevents duplicate work and inconsistent implementations
  - API routes are functional and testable without rate limiting in development

**Status Summary:**
- ✅ All API endpoints implemented and documented
- ✅ Type-safe client utilities created
- ✅ Comprehensive API documentation (API.md)
- ❌ Integration tests blocked on AUTH-01
- ❌ Rate limiting deferred to SEC-01
- **Ticket remains IN PROGRESS until integration tests are written and passing**

## Open questions

- ~~Rate limiting strategy and thresholds~~ - Will be addressed in SEC-01 ticket
- ~~Better Auth vs Supabase Auth integration approach~~ - Abstracted with Supabase client wrapper for flexibility
- ~~Presence endpoint path structure~~ - Resolved: using `/api/presence/[documentId]` for document-scoped presence
- Integration testing approach - Pending TEST-01 Playwright setup and AUTH-01 authentication implementation
