# [COLLAB-02]: Presence Indicators

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

Show which users are viewing or editing a document through real-time presence updates, including avatars/initials and cursor or selection highlights within the canvas.

## Acceptance Criteria

- [ ] Presence service emits enter/exit events as users open or close document views and updates UI in under 500ms.
- [ ] Canvas renders collaborator cursors/selections using tldraw presence hooks, and document header shows participant list with **display names/initials only** (never raw emails).
- [ ] Presence state **persists across page refreshes**—users who refresh remain visible to collaborators without disconnect/reconnect flicker.
- [ ] Presence respects workspace permissions and hides users who lose access mid-session.

## Technical Details

### Database Schema Changes

- None; presence handled via realtime channels.

### API Endpoints

- Implement `/api/presence` channel negotiation endpoint returning tokens/connection details for Supabase Realtime (or similar).

### UI Components

- Update document header/panel to display participant list; integrate tldraw presence overlays.

### Permissions/Security

- Validate membership before subscribing to presence channels; disconnect clients losing permissions.

## Dependencies

- COLLAB-01 real-time editing transport.
- AUTH-04 display names to show correct user labels.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: COLLAB-02.
- Product spec: product.md > Real-Time Collaboration > Presence System.
- Engineering notes: eng-meeting-notes.md > Testing > Multiplayer presence (display name guidance).

## Notes

Plan for optimistic presence removal (timeout after inactivity) to avoid ghost indicators if client disconnects unexpectedly.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Note:** Complexity increased from Small to Medium due to "persist across page refreshes" requirement (see investigation note below).

## Worklog

2025-10-05: Added investigation note about presence persistence requirement. This is more complex than standard reconnect-on-refresh.

## Open questions

**INVESTIGATION REQUIRED:** What does "persist across page refreshes" mean exactly?

Two possible interpretations:
1. **Standard reconnect** (Simple, ~1 day):
   - User refreshes → client reconnects to presence channel
   - Server remembers user is in session (via session ID/token)
   - Presence restored automatically on reconnect
   - This is typical behavior for WebSocket/Realtime systems

2. **Server-side presence persistence** (Complex, 2-3 days):
   - Server tracks presence state in database/cache
   - User refreshes → presence never shows "disconnected" to others
   - Requires presence heartbeat system
   - Needs cleanup logic for truly disconnected users (not just refreshing)
   - More infrastructure: Redis/DB for presence state, background jobs for cleanup

**Decision needed before starting this ticket:**
- Which interpretation is correct per product requirements?
- Is preventing "disconnect flicker" on refresh critical for MVP?
- Recommendation: Start with standard reconnect (interpretation #1) for MVP; add server-side persistence post-MVP if needed.

→ **Action:** Clarify with product/eng stakeholders before implementation.
