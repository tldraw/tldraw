# [NAV-04B]: Guest Document View Experience

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement streamlined document view for guests accessing publicly shared documents via link. **M2 Scope: Canvas-agnostic** - guests see document metadata/info without canvas rendering; canvas integration deferred to M2B/M3.

## Acceptance Criteria

### M2 Canvas-Agnostic Scope
- [ ] Guests accessing public documents via `/d/[documentId]` see streamlined UI without workspace sidebar or management controls.
- [ ] Document header shows: document name (non-editable), basic context (e.g., "Shared by [Owner Name]"), and CTA to sign up/login.
- [ ] Main content area shows **document information** with:
  - Document type indicator
  - Sharing mode badge ("View only" or "Can edit")
  - Basic metadata (created date, last modified - no creator email)
  - Placeholder message explaining canvas editor coming soon
- [ ] Attempting to access private documents via link returns custom 403 page with "Request Access" messaging.
- [ ] Guest banner/badge clearly indicates limited access status with CTA to create account for full features.
- [ ] Guest views respect sharing mode database flag (read_only vs editable) for future canvas integration.

### Deferred to M2B/M3 (Canvas Integration)
- ~~Tldraw canvas in view-only or edit mode~~
- ~~Presence indicators with active viewers/editors~~
- ~~Actual editing capability for editable mode~~

## Technical Details

### Database Schema Changes

- None (leverages PERM-02 sharing schema).

### API Endpoints

- Public document access: `GET /api/documents/[documentId]/public?token=[shareToken]` validates sharing state and returns sanitized document data.
- Ensure API does not expose workspace metadata, member lists, or folder structure to guests.

### UI Components

**Guest Layout Wrapper:**
- Minimal header with document name only
- No workspace sidebar/navigation
- Persistent guest status banner with signup CTA

**Document Info Display (M2 - no canvas):**
- Document type and sharing mode badges
- Metadata section with limited info (no emails/sensitive data)
- Clear placeholder: "Canvas editor launching soon"
- Sharing mode indicator ("View only" / "Can edit")

**403 Error Page (Private Documents):**
- Clear messaging: "This document is private"
- CTA: "Request access from the owner" (email/contact if available)
- Link to login if user is unauthenticated

**Guest Banner:**
- "You're viewing as a guest - Sign up for full features"
- Dismissible but persistent across session
- Non-intrusive positioning (top or bottom)

### Permissions/Security

- Token-based access validation (from PERM-02 sharing system).
- Prevent guests from accessing:
  - Workspace lists, archives, member info
  - Document management operations (rename, delete, move, etc.)
  - Other documents in the workspace
- Sharing mode flag stored for future canvas enforcement (M2B/M3).

## Dependencies

**Prerequisites:**
- NAV-04A (member document view) - base UI patterns
- PERM-02 (sharing modes and token system) - REQUIRED
- PERM-03 (guest access infrastructure) - REQUIRED

**Blocks:**
- None (this is an endpoint in M2 flow)

## Testing Requirements

- [x] Unit tests (permission enforcement)
- [x] Integration tests (public access flows)
- [x] E2E tests (Playwright - guest scenarios)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: NAV-04, PERM-03.
- Product spec: product.md > Permissions & Sharing > Guest access.
- README.md: Site Map > Document Routes (Guest roles)

## Notes

**M2 Canvas-Agnostic Approach:**
- Guest view shows document metadata/info page without canvas rendering
- Info panel displays document type, sharing mode, basic metadata
- Clear messaging that canvas editor is coming soon
- Architecture designed for easy canvas integration later (M2B/M3)
- Permission system architecture supports future canvas enforcement

**Design Principles:**
- Minimal chrome to focus on document information
- Clear affordances for limitations (why can't I edit/rename/etc.)
- Prominent conversion CTAs without being annoying
- Placeholder messaging for missing canvas functionality

**Implementation Strategy:**
1. Create separate layout component for guest view (no workspace chrome)
2. Use route/middleware to detect guest vs member access
3. Build document info panel with metadata, sharing mode, and placeholders
4. Test thoroughly with both read-only and editable sharing modes

**Display Name Handling:**
- Show "Shared by [Owner Display Name]" in header
- Never expose workspace name or structure
- Presence should use anonymous display names if user not authenticated

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Split from original NAV-04 to create focused guest experience separate from member UI. Updated to canvas-agnostic approach - guest document info panel instead of canvas for M2.

## Open questions

- Should we allow unauthenticated guests or require login even for public documents?
  → Allow unauthenticated access; it's the core value of public sharing.
- Do guests see presence of other guests or only members?
  → Show all collaborators (guests + members) for transparency.
- Should guest edits show in document "last modified" metadata?
  → Yes, update last_modified but don't change creator field.
