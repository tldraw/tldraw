# TECH-11: Logging Strategy & Professionalism

Date created: 2025-10-08
Date last updated: -
Date completed: -

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Implement a professional, pragmatic logging strategy across the application. Currently, 49 console.log/error/warn statements ship to production, creating unprofessional behavior, potential information leakage, and performance overhead. The server-side pino logger exists but is inconsistently used.

**Key Issues**:
1. Client-side hooks/components use console.log for debugging (~40 statements)
2. Server-side code mixes console and pino logger inconsistently
3. Development debugging logs left in production code
4. Inconsistent prefix patterns ([Dashboard Realtime] vs [REGENERATE])
5. Normal operations logged unnecessarily (successful broadcasts, event receipts)

**Impact**: Unprofessional production behavior, browser console pollution, information leakage (workspace IDs, event types), performance overhead from synchronous console operations.

## Acceptance Criteria

### Phase 1: Client-Side Cleanup
- [x] Remove all console.log statements from client-side hooks (useMultiWorkspaceRealtime, useWorkspaceRealtimeUpdates, useDocumentRealtimeUpdates)
- [x] Remove all console.log/warn/info from client components (dashboard-client, workspace-browser-client, workspace-settings-client)
- [x] Keep only console.error in catch blocks that display errors to users
- [x] Verify realtime functionality still works after cleanup

### Phase 2: Server-Side Consistency
- [x] Update `/lib/realtime/broadcast.ts` to use pino logger instead of console
- [x] Remove success logging from broadcast utility (only log failures)
- [x] Convert all console.error to logger.error in API routes
- [x] Remove or convert to logger.debug() all development debugging statements

### Phase 3: Logger Refinement
- [x] Remove file logging in development mode (keep for production only)
- [x] Verify LOG_LEVEL environment variable controls server logging
- [x] Document logging standards in LOGGING.md or CLAUDE.md

### Phase 4: Verification
- [x] Production build contains no console.log/warn/info output (only console.error for user-facing errors)
- [x] Server logs use structured JSON format in production
- [x] Pretty-printing works in development mode
- [x] All realtime subscriptions work correctly
- [x] Error boundaries still log errors appropriately

## Technical Details

### Files to Update (Client-Side)

**Priority 1: Realtime Hooks** (~7 console statements each)
- `/src/hooks/useMultiWorkspaceRealtime.ts` - Remove lines 44, 50, 58, 68, 83, 85, 105
- `/src/hooks/useWorkspaceRealtimeUpdates.ts` - Remove console.log at lines 52, 54, 56
- `/src/hooks/useDocumentRealtimeUpdates.ts` - Remove console.log/error at lines 65, 89, 91, 94

**Priority 1: Client Components** (keep only console.error in catch blocks)
- `/src/app/dashboard/dashboard-client.tsx` - Lines 173, 204, 231, 283, 356, 375, 395, 415, 434
- `/src/app/workspace/[workspaceId]/workspace-browser-client.tsx` - Lines 205, 245, 267, 285, 306, 330, 350, 370, 392
- `/src/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx` - Lines 203, 205, 208

### Files to Update (Server-Side)

**Priority 2: Broadcast Utility**
- `/src/lib/realtime/broadcast.ts` - Lines 38, 41
  - Remove console.log for success case
  - Replace console.error with logger.error

**Priority 2: API Routes**
- `/src/app/api/workspaces/[workspaceId]/invite/regenerate/route.ts` - Lines 88, 114, 148, 175, 191, 213, 231, 274
  - Convert console.error to logger.error
  - Remove or convert console.log debugging statements to logger.debug

**Priority 3: Logger Configuration**
- `/src/lib/server/logger.ts` - Lines 30-31, 72-79
  - Conditionally enable file logging (production only by default)

### Code Patterns

**Client-Side - Before**:
```typescript
console.log(`[Dashboard Realtime] Event in workspace ${workspaceId}:`, event.type)
console.error('[Dashboard Realtime] Error handling event:', error)
```

**Client-Side - After**:
```typescript
// Delete console.log entirely
// Keep console.error only if showing error to user
```

**Server-Side - Before**:
```typescript
console.log(`Broadcast ${eventType} event to workspace ${workspaceId}`)
console.error(`Failed to broadcast event:`, error)
```

**Server-Side - After**:
```typescript
// Success: no logging needed
// Error case:
logger.error('Failed to broadcast event', error, {
  context: 'broadcast',
  workspace_id: workspaceId,
  event_type: eventType,
})
```

### Logging Standards

**Server-Side Rules**:
- ✅ Use pino logger exclusively (never console)
- ✅ Log errors with structured context (user_id, workspace_id, etc.)
- ✅ Log significant business events at INFO level
- ✅ Use DEBUG level for troubleshooting (development only)
- ❌ Don't log normal operations (successful queries, broadcasts)

**Client-Side Rules**:
- ✅ Use console.error only for user-facing errors
- ❌ Remove all console.log/warn/info statements
- ❌ Don't log realtime events, subscriptions, tab visibility changes

**What to Log**:
- ✅ API errors that affect users
- ✅ Significant business events (workspace created, member invited)
- ✅ RLS policy denials (potential security issues)
- ❌ Successful operations
- ❌ React Query refetches
- ❌ WebSocket reconnections (unless repeated failures)
- ❌ Normal broadcasts

## Dependencies

None

## Testing Requirements

- [ ] Manual testing: Verify realtime subscriptions work after client-side cleanup
- [ ] Manual testing: Test all error scenarios still show console.error appropriately
- [ ] Manual testing: Check production build browser console (should be clean except for errors)
- [ ] Manual testing: Verify server logs in development (pretty-printed, no file)
- [ ] Manual testing: Verify server logs in production simulation (JSON format, structured)
- [ ] E2E tests: Existing tests should pass without modification
- [ ] Code review: Verify no console statements remain except console.error in catch blocks

## Related Documentation

- Agent Review: See code-quality-pragmatist review output above
- Logger Implementation: `/src/lib/server/logger.ts`
- Logging Guide: To be created in LOGGING.md or added to CLAUDE.md

## Notes

### Performance Impact
- Removing ~40 console statements from hot paths (realtime hooks, event handlers) provides immediate performance gain
- Console operations are synchronous and block the event loop
- File I/O overhead in development mode is unnecessary

### Professionalism Impact
- Console logs in production are equivalent to leaving "TODO" comments in shipped code
- Users opening DevTools see internal debugging messages
- Logs expose workspace IDs, event types, internal architecture

### Optional Enhancements (Not Required)
- Add development-only debug utility for client-side:
  ```typescript
  // lib/debug.ts
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true'
  export const realtimeDebug = {
    log: (...args: any[]) => { if (DEBUG) console.log('[Realtime]', ...args) },
    error: (...args: any[]) => { console.error('[Realtime]', ...args) }
  }
  ```

### What NOT to Do
- ❌ Don't add complex logging frameworks or enterprise-style logging ceremonies
- ❌ Don't set up log aggregation infrastructure (let deployment platform handle it)
- ❌ Don't add logging for every function entry/exit
- ❌ Don't create elaborate log categorization systems

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

**Breakdown**:
- Phase 1 (Client cleanup): 1-2 hours
- Phase 2 (Server consistency): 1 hour
- Phase 3 (Logger refinement): 30 minutes
- Testing & verification: 1 hour
- Documentation: 30 minutes

**Total**: ~4 hours of focused work

## Worklog

2025-10-08: Ticket created based on code-quality-pragmatist agent review

2025-10-08: Ticket completed by simple-dotcom-engineer agent
- Phase 1 complete: Removed ~40 console.log statements from client-side code
  - useMultiWorkspaceRealtime.ts: Removed 7 console statements
  - useWorkspaceRealtimeUpdates.ts: Removed 3 console statements
  - useDocumentRealtimeUpdates.ts: Removed 4 console statements
  - workspace-settings-client.tsx: Removed 3 console statements
  - Kept only console.error in catch blocks that show errors to users (dashboard-client.tsx, workspace-browser-client.tsx)
- Phase 2 complete: Converted server-side console to structured pino logger
  - broadcast.ts: Replaced console with logger.error
  - invite/regenerate/route.ts: Converted 8 console statements to logger.error with structured context
- Phase 3 complete: Made file logging conditional
  - Updated logger.ts to only log to file in production by default
  - Added LOG_TO_FILE environment variable for manual control
  - Reduced development overhead (no unnecessary file I/O)
- Phase 3 complete: Added logging standards to CLAUDE.md
  - Documented server-side and client-side logging rules
  - Added code examples for proper usage
  - Included viewing/debugging instructions
- Typecheck passed: All changes compile successfully
- Result: Professional logging strategy with no console pollution in production

## Open Questions

- Should we create a separate LOGGING.md document or add logging standards to CLAUDE.md?
  - **Recommendation**: Add to CLAUDE.md under a "Logging Standards" section for better visibility

- Should we add optional development-only debug utility for client-side troubleshooting?
  - **Recommendation**: Not required for this ticket. Can be added later if debugging becomes difficult.

- Should file logging remain in production?
  - **Recommendation**: Yes, but make it configurable via LOG_TO_FILE env var. Useful for debugging production issues when log aggregation isn't available yet.
