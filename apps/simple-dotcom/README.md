# Simple tldraw – Simple Dotcom

Developer guide for building and shipping the Simple tldraw MVP. The authoritative requirements, architecture, and implementation details live in `SPECIFICATION.md`; everything else exists to support those decisions.

## Relationship to the tldraw Monorepo

Simple Dotcom is a self-contained collaborative application built on the tldraw library. The tldraw monorepo contains several applications:

- **tldraw.com** (`apps/dotcom/`) — Full-featured application with local-first functionality
- **examples app** (`apps/examples/`) — SDK showcase and demos
- **VS Code extension** (`apps/vscode/`) — Editor integration
- **Simple Dotcom** (`apps/simple-dotcom/`, this project) — Simplified collaborative app optimized for agent development

Simple Dotcom shares many features with the full dotcom application but deliberately omits local-first capabilities. Instead, it uses a streamlined, cloud-native architecture. The project is designed to be built and maintained primarily by AI agents, following structured specifications.

The monorepo uses a CONTEXT.md system throughout: AI-friendly documentation files distributed across packages that explain architecture and usage patterns. These files help agents understand the codebase structure and make informed implementation decisions.

## Sources of Truth

- **Primary**: `SPECIFICATION.md` — start every task by confirming scope, requirements, and technical constraints here. If reality diverges, update the specification before (or alongside) code.
- **Secondary**: Documents in `secondary-sources/` (historic product requirements, original design outline, meeting notes). Use them only for background or when porting context into the spec.
- **Execution trackers**: `MILESTONES.md` defines the staged delivery plan, and `tickets/` contains the work items that implement each milestone.

## Repository Layout

```
apps/simple-dotcom/
├── SPECIFICATION.md        # Canonical product + technical reference
├── MILESTONES.md           # MVP stage gates mapped to ticket checklists
├── README.md               # You are here
├── landing-page-signed-out.png # Visual reference for marketing entry point
├── secondary-sources/      # Legacy docs kept for context only
│   ├── design-doc.md
│   ├── eng-meeting-notes.md
│   ├── product-requirements.md
│   └── product.md
├── simple-client/          # Next.js app (marketing + authenticated experience)
├── simple-worker/          # Cloudflare worker (placeholder until implemented)
├── simple-shared/          # Shared types/utilities (placeholder until implemented)
└── tickets/                # Markdown tickets + TEMPLATE.md
```

## Getting Started

1. Install Node 20 (the monorepo requires it) and enable Corepack if you have not already: `corepack enable`.
2. **IMPORTANT: Always use `yarn` for package management. This monorepo uses yarn workspaces - never use `npm`.**
3. Install dependencies from the repository root: `yarn install`.
4. Seed environment configuration. Follow the integration guidance in `SPECIFICATION.md` under **Technical Architecture & Implementation** for Supabase, Better Auth, Cloudflare, and R2. Create `.env.local` files as needed for `simple-client` and future packages.
5. Run the web app:
   - `yarn workspace simple-dotcom dev` — Next.js development server with Turbopack.
   - `yarn workspace simple-dotcom build` / `start` for production verification.
   - `yarn workspace simple-dotcom lint` before opening a PR.
6. Add additional services (workers, shared packages) as you implement the corresponding milestones; wire up scripts in the root `package.json` or individual package manifests when ready.

## Package Management

- **Always use `yarn`** - this project uses yarn workspaces
- Add dependencies: `yarn workspace simple-dotcom add <package>`
- Add dev dependencies: `yarn workspace simple-dotcom add -D <package>`
- Run scripts: `yarn workspace simple-dotcom <script>`

## TypeScript Type Generation

When the Supabase database schema changes, regenerate TypeScript types:

```bash
yarn workspace simple-client gen-types
```

This command updates types in two locations:

- `supabase/types.ts` (shared types for the workspace)
- `simple-client/src/lib/supabase/types.ts` (client-specific types)

**When to regenerate types:**

- After running new migrations (`supabase migration up`)
- When database schema changes in development
- After pulling schema changes from other developers

## Delivery Workflow

1. **Plan via milestones**: Confirm which milestone you are executing (`MILESTONES.md`). Do not pull tickets from later milestones until current exit criteria are satisfied.
2. **Work from tickets**:
   - Each ticket in `tickets/` references a requirement ID from `SPECIFICATION.md`. Ensure acceptance criteria trace back to the spec (e.g., `AUTH-01`, `DOC-03`).
   - When creating a new ticket, copy `tickets/TEMPLATE.md`, fill in the metadata, and list relevant sections in the **Related Documentation** field (pointing to `SPECIFICATION.md` headings).
   - Update status checkboxes and dates as work progresses.
   - Use the **Worklog** section to track progress, decisions, and blockers with dated entries as work proceeds.
   - Use the **Open questions** section to capture unresolved issues or areas needing clarification; remove items as they are answered.
3. **Implement using the spec**:
   - Product scope: see **MVP Requirements** in `SPECIFICATION.md` for the authoritative feature list, user roles, and limits.
   - Technical direction: follow the same document’s architecture, data model, API surface, sync worker plan, and security/testing strategies.
   - Open questions or new decisions should be recorded back in the spec’s **Open Questions & Outstanding Decisions** section.
4. **Review & QA**:
   - Align test coverage with `SPECIFICATION.md` → **Testing Strategy** and milestone expectations. Add or update Playwright, integration, and unit tests as features are implemented.
   - Document manual verification steps in the related ticket for future regressions.
5. **Ship**:
   - Use milestone exit criteria to confirm readiness.
   - Summarize spec deltas, tests run, and outstanding risks in your PR description.

## Agent Workflow Guide

- Treat `SPECIFICATION.md` as your contract. Before acting on a request, restate the relevant requirement IDs, assumptions, and affected sections to the user. Call out any ambiguity so the spec can be updated.
- Cross-check `MILESTONES.md` to ensure work aligns with the current milestone. If a request falls outside scope, flag it and propose a ticket move or spec change.
- When drafting or completing tickets, mirror the workflow expected of human contributors: note assumptions, list tests run (or not run), and reference spec sections by heading name.
- Prefer non-destructive exploration commands (read-only listing, `rg`, etc.) unless the user explicitly requests edits. Announce planned file changes before executing them.
- After making changes, provide a concise diff-oriented summary, validation results, and next-step suggestions so humans can review quickly.
- Keep documentation synchronized. Any decision, workaround, or clarification uncovered while assisting must be reflected in `SPECIFICATION.md`, `MILESTONES.md`, or the relevant ticket before handing off.

## Updating Documentation

- **SPECIFICATION.md**: Update whenever requirements, architecture, or decisions change. Treat it as the contract for the product and engineering teams.
- **MILESTONES.md**: Adjust ticket groupings or exit criteria if sequencing changes; keep history via git so the plan is auditable.
- **Secondary sources**: Only touch when archiving new background material. Annotate the spec with references instead of duplicating content here.
- **Tickets**: Keep statuses, acceptance criteria, and dependencies current. Close the loop by linking code changes and noting validation steps.

## Additional Notes

- Design artifacts (like `landing-page-signed-out.png`) should be stored in this folder and referenced from tickets/spec as needed.
- If you add new tooling (scripts, config, CI), note the workflow in this README and cross-link to the relevant spec section.
- Prefer workspace-aware Yarn commands (`yarn workspace <package> <script>`) to keep dependency management centralized.

This README is intentionally lightweight. If a contributor cannot accomplish a task using this guide plus `SPECIFICATION.md`, update the documentation so the next person can.

For Better Auth, see the [Better Auth documentation](https://www.better-auth.com/llms.txt).
For Supabase, see the [Supabase documentation](https://supabase.com/docs).
For Cloudflare, see the [Cloudflare documentation](https://developers.cloudflare.com/workers/runtime-apis/overview).
For R2, see the [R2 documentation](https://developers.cloudflare.com/r2/reference).
