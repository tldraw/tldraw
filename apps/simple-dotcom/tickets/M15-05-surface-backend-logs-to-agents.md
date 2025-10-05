# [M15-05]: Surface Backend Logs to Agents

Date created: 2025-10-05
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

- [ ] A reusable logger (e.g. `lib/server/logger.ts`) writes backend log events to stdout and to `apps/simple-dotcom/.logs/backend.log`, appending when the process restarts.
- [ ] Logger instantiation is limited to Node runtimes (API routes, server components) so the Edge runtime continues to build without `fs` errors.
- [ ] Existing server-side `console.*` calls in Milestone 1.5 scope are migrated to the shared logger, producing structured JSON output with contextual metadata.
- [ ] `apps/simple-dotcom/README.md` gains a "Viewing backend logs" section that tells agents exactly how to read the latest 200 lines (e.g. `tail -n 200 apps/simple-dotcom/.logs/backend.log`) and reminds them the file rotates per process start.
- [ ] `.logs/` is ignored by git (verify or add to `.gitignore`) so log artifacts never enter commits.

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

-

## Open questions

- Do we also need a short CLI helper (e.g. `yarn backend:logs`) to make tailing easier, or is README guidance sufficient?
