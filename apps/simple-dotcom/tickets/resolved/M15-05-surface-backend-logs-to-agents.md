# [M15-05]: Surface Backend Logs to Agents

Date created: 2025-10-05
Date last updated: 2025-10-05
Date completed: 2025-10-05

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
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Give agents an easy, deterministic way to inspect recent logs emitted by the Next.js backend without attaching a debugger or tailing the running process. Introduce a shared server logger that mirrors structured log output to both stdout and a rotating file under `apps/simple-dotcom/.logs/`. Document the workflow in the README so an agent can read the latest log lines on demand.

## Acceptance Criteria

- [x] A reusable logger (e.g. `lib/server/logger.ts`) writes backend log events to stdout and to `apps/simple-dotcom/.logs/backend.log`, appending when the process restarts.
- [x] Logger instantiation is limited to Node runtimes (API routes, server components) so the Edge runtime continues to build without `fs` errors.
- [x] Existing server-side `console.*` calls in Milestone 1.5 scope are migrated to the shared logger, producing structured JSON output with contextual metadata.
- [x] `apps/simple-dotcom/README.md` gains a "Viewing backend logs" section that tells agents exactly how to read the latest 200 lines (e.g. `tail -n 200 apps/simple-dotcom/.logs/backend.log`) and reminds them the file rotates per process start.
- [x] `.logs/` is ignored by git (verify or add to `.gitignore`) so log artifacts never enter commits.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Wrap API route logging (e.g. `/api/dashboard`, `/api/auth/*`) with the shared logger to emit structured fields like `route`, `requestId`, and `status`.

### UI Components

None (server components may import the logger for SSR diagnostics).

### Permissions/Security

- Ensure log files stay on the local filesystem only and are not exposed via HTTP routes.

## Dependencies

- Complements `M15-01` (Better Auth ↔ Supabase bridge) debugging; no hard dependency but coordinate to capture new auth context fields.
- Ensure compatibility with eventual `TECH-07` (error tracking) so we can share instrumentation later.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- README: new section documents the tail command for agents.
- Spec references: Check `product.md` monitoring/observability notes once available.

## Notes

- Prefer `pino` or `winston` for JSON logs; use multistream/transport to duplicate to stdout and file.
- Consider a lightweight daily rotation (`pino/file` with `fs.createWriteStream` and `flags: 'a'`) but skip long-term retention for now.
- Follow the repo comment style guidelines when replacing `console.*` calls.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-05
- Installed pino and pino-pretty as logging dependencies
- Created `src/lib/server/logger.ts` with multistream support (stdout + file)
- Logger includes runtime guard to ensure it only runs in Node.js (not Edge runtime)
- Configured pretty-printing for development and JSON for production/file output
- Added `.logs/` to `.gitignore` at both root and simple-client levels
- Migrated console.* calls in:
  - `src/lib/auth.ts` (password reset, workspace provisioning errors)
  - `src/app/api/workspaces/route.ts` (workspace creation logging)
  - `src/lib/api/response.ts` (error handling)
- Added comprehensive "Viewing Backend Logs" section to README.md
- Fixed pre-existing TypeScript error in presence route (cursor_data vs cursor_position)
- Ran gen-types to ensure database types are current
- Verified typecheck passes successfully
- Ran E2E tests - majority passing (2 pre-existing failures unrelated to logging)
- Created log directory structure

### 2025-10-05 (Follow-up fixes)
- Fixed logger path calculation to use `../.logs` instead of `../../.logs` to ensure logs are written to `apps/simple-dotcom/.logs/backend.log`
- Fixed hardcoded absolute paths in README.md to use relative paths (`apps/simple-dotcom/.logs/backend.log`)
- Verified logging works end-to-end:
  - Server starts successfully
  - Log file is created at correct location
  - Logs appear in both stdout (pretty-printed) and file (JSON format)
  - API errors are properly logged with stack traces
- **Important clarification**: Client-side console.* calls were intentionally NOT migrated as the server logger only works in Node.js runtime. The following files correctly use console.* for client-side logging:
  - `src/app/workspace/[workspaceId]/error.tsx` (client-side error boundary)
  - `src/app/dashboard/dashboard-client.tsx` (3 instances in client component)
  - `src/app/d/[documentId]/error.tsx` (client-side error boundary)
  - E2E test files (run in test environment, not server runtime)

## Open questions

- Do we also need a short CLI helper (e.g. `yarn backend:logs`) to make tailing easier, or is README guidance sufficient?
