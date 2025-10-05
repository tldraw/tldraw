# [PERM-02]: Document Sharing Modes and Permission Enforcement

Date created: 2025-10-05
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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [x] Infrastructure

## Description

Implement complete document-level sharing system including UI controls for setting sharing modes (private, public read-only, public editable), backend enforcement of permissions, and guest access infrastructure. Only workspace members can modify sharing settings, with all changes immediately enforced at application level. **M2 Scope: Canvas-agnostic** - permission system architecture supports future canvas integration (M2B/M3).

## Acceptance Criteria

### Sharing UI (Member Access)
- [ ] Sharing modal accessible from document view (share button) allows workspace members to:
  - Toggle document visibility: Private, Public (read-only), Public (editable)
  - Copy shareable link to clipboard when public
  - See current sharing status with clear labels
  - Regenerate public access token (invalidates old links)
- [ ] Document header displays sharing status badge (private/public indicator).
- [ ] Non-members (guests) see disabled/hidden sharing controls with explanatory tooltip or banner.

### Backend Sharing API
- [ ] `POST /api/documents/[documentId]/share` endpoint:
  - Accepts: `{ visibility: 'private' | 'public_readonly' | 'public_editable', regenerateToken?: boolean }`
  - Returns: Updated sharing state with public URL if applicable
  - Validates caller is workspace member (403 if not)
  - Generates cryptographically secure public token on first public share
  - Invalidates old token when regenerating
- [ ] `GET /api/documents/[documentId]` includes sharing metadata for authorized users.
- [ ] Public document access route: `GET /api/documents/[documentId]/public?token=[shareToken]` validates token and returns sanitized document data.

### Permission Enforcement
- [ ] Private documents:
  - Only workspace members can access
  - Public links return 403 with "This document is private"
- [ ] Public read-only documents:
  - Anyone with link can view document information
  - Guests see view-only UI (no edit controls)
  - Workspace members retain full edit access
- [ ] Public editable documents:
  - Anyone with link can view (editing capability deferred to M2B/M3 canvas integration)
  - Guests cannot rename, delete, archive, move, or change sharing settings
  - Workspace members retain full management access
- [ ] Permissions enforced consistently across:
  - API endpoints (document access, updates)
  - UI controls (disabled buttons/menus)
  - Permission system architecture ready for canvas integration (M2B/M3)

### Authorization & Security
- [ ] Share modal hides or disables controls for non-members with clear explanation.
- [ ] `POST /api/documents/[documentId]/share` returns 403 for guests attempting to change settings.
- [ ] Logging captures unauthorized change attempts for monitoring (coordinate with TECH-07).
- [ ] RLS policies prevent direct database updates bypassing API checks.

## Technical Details

### Database Schema Changes

Add to `documents` table:
- `visibility` (enum: 'private', 'public_readonly', 'public_editable') - default: 'private'
- `public_token` (text, nullable, unique) - cryptographically secure token for public access
- `public_token_created_at` (timestamp, nullable)

Indexes:
- Unique index on `public_token` for fast lookup
- Compound index on `(id, visibility)` for access checks

### API Endpoints

**Sharing Management:**
- `POST /api/documents/[documentId]/share`
  - Auth: Workspace member required
  - Body: `{ visibility: string, regenerateToken?: boolean }`
  - Returns: `{ success: true, data: { visibility, publicUrl?, token? } }`

**Public Access:**
- `GET /api/documents/[documentId]/public?token=[token]`
  - Auth: None required
  - Validates token matches document's public_token
  - Returns: Sanitized document data (no workspace details)

**Token Validation Middleware:**
- Helper function to resolve access: membership vs public token
- Used by document routes and future canvas sync integration (M2B/M3)

### UI Components

**Sharing Modal:**
- Radio buttons or dropdown for visibility mode
- Explanation text for each mode
- Copy-to-clipboard button for public URL (when applicable)
- Regenerate token button (with confirmation)
- Visual preview of what guests will see

**Sharing Status Badge:**
- Document header indicator: "Private" (lock icon) or "Public" (link icon)
- Tooltip shows mode details on hover

**Permission-based UI Rendering:**
- Conditionally render controls based on:
  - User role (workspace member vs guest)
  - Document visibility (for guests)
- Use reusable `<PermissionGate>` component pattern

### Permissions/Security

**Member Authorization:**
- Middleware checks workspace membership before allowing share operations
- Both owners and members can change sharing settings (per spec)

**Token Security:**
- Generate tokens using crypto.randomBytes (32+ bytes)
- Tokens are URL-safe base64 encoded
- Allow optional token regeneration to revoke access
- Consider token expiration for future enhancement (not MVP)

**Guest Access Restrictions:**
- Validate token on every request (no caching)
- Never expose workspace structure, member lists, or other documents to guests
- Permission system architecture supports future canvas-level enforcement (M2B/M3)

## Dependencies

**Prerequisites:**
- PERM-01 (workspace access control) - base permission system
- DOC-01 (document CRUD) - document model exists
- Workspace membership system functional

**Blocks:**
- NAV-04B (guest document view) - consumes sharing modes
- PERM-03 (guest access experience) - relies on this infrastructure

## Testing Requirements

- [x] Unit tests (permission checks, token generation)
- [x] Integration tests (sharing workflows)
- [x] E2E tests (Playwright - all modes + guest scenarios)
- [x] Manual testing scenarios

### Key Test Scenarios
1. Member sets document to public readonly → guest can view document info, cannot edit
2. Member sets document to public editable → guest sees editable mode indicator (actual editing deferred to M2B/M3)
3. Member changes public document back to private → old link returns 403
4. Guest attempts to change sharing settings → API returns 403, UI is disabled
5. Token regeneration → old token becomes invalid
6. Non-member attempts to access private document → 403 error

## Related Documentation

- Product requirements: product-requirements.md: PERM-02, PERM-04.
- Product spec: product.md > Permissions & Sharing > Document-Level Sharing.
- README.md: Workspace Permissions table, Sharing FAQs.

## Notes

**Why Combine PERM-02 + PERM-04:**
- PERM-04 is just enforcement of PERM-02's modes (not a separate feature)
- UI and API are built together for sharing functionality
- Testing is more coherent as integrated system
- Reduces handoff and coordination overhead

**Default Sharing Mode:**
- All documents default to private on creation
- Track analytics on sharing mode adoption to inform future defaults

**Token Design Decisions:**
- URL-based tokens (not JWT) for simplicity
- No expiration for MVP (feature flag for later)
- Regeneration allows revoking access without affecting members

**M2 Canvas-Agnostic Approach:**
- Permission modes (private, public read-only, public editable) fully implemented and stored
- Guest access validated and enforced at application level
- Architecture designed for easy canvas permission integration later (M2B/M3)
- Sharing mode database flag ready for future canvas enforcement

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Note:** Originally PERM-02 (medium) + PERM-04 (small). Combined saves overhead and improves coherence. Estimate: 2-3 days.

## Worklog

2025-10-05: Combined from PERM-02 (sharing modes) and PERM-04 (enforcement) to create unified document sharing system. Updated to canvas-agnostic approach - permission system architecture supports future canvas integration (M2B/M3).

## Open questions

- Should we track who shared a document and when in metadata?
  → Yes, add `shared_by` and `shared_at` fields; useful for audit trail.
- Do we need separate tokens per sharing mode or single token?
  → Single token; mode is stored in DB, token just proves possession of link.
- Should regenerating token notify current guests?
  → Not for MVP; defer notification system to post-MVP.
