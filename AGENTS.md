# AGENTS.md

This file provides guidance to AI coding agents working in this repository.

## Core rules

- Use `pnpm`, not `npm` or `yarn`, for repo commands. This repo uses pnpm workspaces; `yarn …` fails at install and is blocked for agents by a hook.
- Run commands from the repo root unless a command explicitly says to run from a workspace.
- Never run bare `tsc`; use `pnpm typecheck` from the repo root.
- Prefer targeted checks first. Avoid repo-wide test or e2e runs unless the change needs them.
- Keep changes scoped to the request and the affected package. Do not refactor unrelated code.
- Respect existing worktree changes. Do not revert user changes unless explicitly asked.
- Prefer editing existing files over creating new files. Do not add new documentation files unless requested.
- Use sentence case for headings, titles, labels, and documentation text.

## Repo overview

This is the tldraw monorepo, an infinite canvas SDK for React applications. It is organized with pnpm workspaces (see `pnpm-workspace.yaml`).

Core packages:

- `packages/editor` - foundational infinite canvas editor with no default shapes, tools, or UI
- `packages/tldraw` - complete SDK with default UI, shapes, tools, and interactions
- `packages/store` - reactive client-side database, persistence, and migrations
- `packages/tlschema` - shape, binding, and record type definitions and validators
- `packages/state` - reactive signals library
- `packages/sync` and `packages/sync-core` - multiplayer sync packages
- `packages/utils` and `packages/validate` - shared utilities and validation helpers
- `packages/assets` - icons, fonts, translations, and bundled assets

Apps and examples:

- `apps/examples` - SDK examples and demos; the main place for example development
- `apps/docs` - documentation site at tldraw.dev
- `apps/dotcom` - tldraw.com app and workers
- `apps/vscode` - VS Code extension
- `templates` - starter templates for supported frameworks

## Setup

Requires Node `>=22.12.0`. Enable Corepack before installing dependencies:

```bash
npm i -g corepack && pnpm install
```

Coming from Yarn (a checkout, worktree or branch from before the pnpm switch):

- If an install stops with "This repo uses pnpm. Run:", run the commands it lists, in order. They clear out Yarn's install (every `node_modules`, `.yarn` and `yarn.lock`), set up pnpm if needed, and reinstall.
- When merging main into an older branch: delete `yarn.lock` if it conflicts (`git rm yarn.lock`). If `pnpm-lock.yaml` conflicts, take main's copy (`git checkout origin/main -- pnpm-lock.yaml`) and run `pnpm install` to add the branch's dependency changes. Never hand-edit the lockfile.
- Replace `yarn <script>` with `pnpm <script>`, and `yarn workspace <pkg> <script>` with `pnpm --filter <pkg> <script>`.

## Common commands

Development:

- `pnpm dev` - start the examples app at localhost:5420
- `pnpm dev-app` - start the tldraw.com client app
- `pnpm dev-docs` - start the docs site
- `pnpm dev-vscode` - start VS Code extension development
- `pnpm dev-template <template name>` - run a template

Always run dev commands from the repo root. The root `pnpm dev` runs each package's `predev` step, which generates build artifacts like `packages/tldraw/tldraw.css`. Running a per-workspace command (`pnpm --filter examples.tldraw.com dev`) skips `predev`, so imports such as `tldraw/tldraw.css` fail to resolve. In a fresh git worktree, run `pnpm install` first since worktrees start without `node_modules`.

Build:

- `pnpm build` - build all changed packages incrementally
- `pnpm build-package` - build SDK packages only
- `pnpm build-app` - build the tldraw.com client app
- `pnpm build-docs` - build the docs site

Testing:

- `pnpm test` in a workspace - run tests in watch mode
- `pnpm test run` in a workspace - run tests once
- `pnpm test run --grep "pattern"` in a workspace - run matching tests
- `pnpm exec vitest` - run all tests across the repo; slow, avoid unless necessary
- `pnpm e2e` - run examples e2e tests
- `pnpm e2e-dotcom` - run tldraw.com e2e tests

Code quality:

- `pnpm lint` - lint the package or workspace
- `pnpm lint-current` - lint changed files
- `pnpm typecheck` - type check all packages and refresh assets
- `pnpm format` - format the repo
- `pnpm format-current` - format changed files
- `pnpm api-check` - validate public API reports

## Validation workflow

- For narrow package changes, run the relevant workspace test first, for example `cd packages/tldraw && pnpm test run --grep "SelectTool"`.
- For changes that affect shared types, migrations, editor behavior, or cross-package contracts, run `pnpm typecheck` from the repo root.
- For public API changes, run `pnpm api-check` and include intentional API report updates.
- For asset changes, run `pnpm refresh-assets` or `pnpm typecheck` so generated assets stay current.
- For docs changes, run the narrow docs checks or docs build only when the change affects generated content, MDX behavior, or site structure.
- For e2e behavior changes, run the smallest relevant e2e suite and update snapshots only when behavior intentionally changed.
- For a new or changed tldraw.com migration under `apps/dotcom/zero-cache/migrations/`, review it with `skills/review-migration/` before opening the PR. Zero replication and live-traffic locks are not covered by tests.

## Architecture notes

Reactive state:

- State is managed through `@tldraw/state` signals (`Atom`, `Computed`, and related primitives).
- Editor state is observable and dependency-tracked. Avoid bypassing existing reactive patterns.

Shapes:

- Shape behavior lives in `ShapeUtil` classes.
- Shape utils define geometry, rendering, handles, interactions, and SVG/export behavior.
- Add custom shape behavior through the established ShapeUtil patterns rather than one-off editor patches.

Tools:

- Tools are `StateNode` state machines.
- Complex tools use child states for pointer, keyboard, tick, and transition behavior.
- Keep interaction logic close to the tool state that owns it.

Bindings:

- Shape relationships use binding records and `BindingUtil` classes.
- Arrows and other connected shapes should update through binding utilities, not ad hoc shape mutation.

Managers:

- Editor subsystems live in `packages/editor/src/lib/editor/managers/` as classes owned and disposed by the `Editor`.
- A manager that subscribes to events or holds a resource should extend `EditorManager` and register its cleanup so it runs on `dispose()`: `addEditorEvent(event, fn)` for editor bus events, `register(fn)` for everything else (store side effects, reactions, DOM listeners, child resources). Use `editor.timers` for timeouts/intervals/frames and `editor.disposables` for cleanup on the editor itself.
- Don't extend `EditorManager` for managers with no teardown. See the `EditorManager` doc comment for the full decision guide.

Store and schema:

- Store changes should respect migrations, validators, and schema versioning.
- Schema-affecting changes usually need updates in `packages/tlschema` and focused migration tests.

## Where to work

- Use `packages/editor` for core editor primitives, geometry, managers, and UI-free behavior.
- Use `packages/tldraw` for default shapes, default tools, UI, and integration tests that need the full SDK.
- Use `apps/examples` for runnable SDK examples and demonstrations.
- Use `apps/docs/content` for documentation articles and release notes.
- Use `apps/dotcom/client` for tldraw.com frontend behavior.
- Use `apps/dotcom/*-worker` for Cloudflare worker behavior.
- Use `templates` for starter project changes.

## Testing guidance

- Unit tests live alongside source files as `*.test.ts`.
- Integration tests commonly live in `packages/tldraw/src/test/`.
- E2E tests live in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`.
- Test in `packages/tldraw` when default shapes, tools, bindings, or UI are involved.
- Test in `packages/editor` for core editor behavior that should not depend on default shapes or UI.
- Prefer comparing whole objects in assertions when that gives a clearer failure than checking fields one by one.
- See `skills/write-unit-tests/` and `skills/write-e2e-tests/` for detailed test patterns.

## Documentation and examples

- Docs live in `apps/docs/content/`.
- Examples live in `apps/examples/src/examples/`.
- Example folders use lowercase kebab-case names.
- Example README frontmatter drives the examples site; keep titles and descriptions sentence case.
- Update docs or examples when an API or user-facing behavior changes.
- See `skills/write-docs/`, `skills/write-example/`, and `skills/write-release-notes/` for task-specific guidance.

## Skills

- Canonical agent skills live in `skills/`.
- `.agents/skills` is a symlink to `../skills` for generic agent compatibility.
- `.claude/skills` is a symlink to `../skills` for Claude compatibility. Keep `skills/` as the source of truth.
- `.cursor/skills` is a symlink to `../skills` for Cursor compatibility.
- Skill folders use `skill-name/SKILL.md` with YAML frontmatter containing at least `name` and `description`.
- Put reusable scripts, references, and assets inside the relevant skill folder.
- Do not duplicate skill content for different agents; add compatibility pointers or symlinks instead.
- See `skills/skill-creator/` before creating or restructuring skills.
- User-facing workflow skills include `skills/pr/`, `skills/issue/`, `skills/take/`, `skills/commit-changes/`, and `skills/clean-copy/`.

## Code conventions

TypeScript:

- Follow existing file-local style and abstractions.
- Use workspace types and helpers rather than duplicating definitions.
- Keep public API changes deliberate and reflected in API reports.
- Avoid boolean or ambiguous positional options in new APIs when a named object or enum would make call sites clearer.

React and UI:

- Follow existing component patterns in the relevant app or package.
- Keep user-facing text concise and sentence case.
- Avoid broad UI rewrites when a focused component change is enough.

Generated files:

- Do not hand-edit generated assets, API reports, or schemas unless the repo already expects that file to be edited directly.
- Run the owning generator command when generated output needs to change.

Dependencies:

- Keep dependencies workspace-appropriate.
- If changing dependency manifests or lockfiles, make sure the lockfile update is intentional and included.
- Every package a file imports must be declared in the owning workspace's own `package.json`. pnpm's `hoisted` linker puts everything in the root `node_modules`, so an undeclared import still resolves here but breaks consumers with strict isolation. The `tldraw/no-undeclared-dependencies` lint rule enforces this across `packages/*`, `apps/*`, `internal/*`, and `templates/*`. Shared dev tooling that every workspace runs (`vitest`, `tsx`, `typescript`, `lazyrepo`) may live only in the root `package.json`: the root `node_modules` is reachable from every workspace under any linker. Anything a published package's source imports must be declared by that package. Adding a workspace dependency also needs a matching `references` entry in that package's `tsconfig.json` (`pnpm check-packages --fix`).
- Dependency install/build scripts are off by default, which closes the main supply-chain `postinstall` code-execution path. Every package that ships a build script must be listed under `allowBuilds` in `pnpm-workspace.yaml`: `true` for packages that genuinely need to build (native/napi modules, binary downloaders), `false` for everything else. pnpm fails the install when a package with a build script isn't listed, so a new one shows up at install time; decide whether it needs to run before adding it.

## Comments

A comment earns its place by saying something the code cannot: why this way, what breaks otherwise, which bug it guards. The litmus: a good comment names a failure mode, not a mechanism.

Scope: these rules apply to comments you write — new code, and lines you are already changing. Do not sweep existing comments while fixing a bug or refactoring; that buries a small change in a large diff. Leave an existing comment alone unless your change makes it inaccurate, you are rewriting the lines it is attached to, or the user asked for a cleanup. If you notice comments worth cleaning up, mention it or do it in a separate PR.

When writing comments:

- Don't restate the code (`/** Get the toolbar */` above `getToolbar()`), narrate it (`// Delete the shapes` above `editor.deleteShapes()`), add section banners, list call sites, or write `@param`/`@returns` that only repeat the signature.
- State a rationale once where the shared thing lives; don't copy it across sibling call sites.
- Keep comments shorter than the code they explain. Narrative that spans files belongs in a doc (`README.md`, `SPEC.md`, `apps/docs/content/`) with a short pointer from the code.
- Always keep: non-obvious invariants, issue numbers and provenance, constants nobody should tune blindly, diagrams, and enumerated cases the code must not break.
- In `packages/*`, doc comments on the `@public` surface become the API reference; density there is expected. In `apps/*` and `templates/*`, keep comments sparse.

## Writing style

- Use sentence case for Markdown headings, UI labels, docs titles, PR titles, and issue titles.
- Capitalize proper nouns, acronyms, and code names normally, for example `PostgreSQL`, `WebSocket`, and `NodeShapeUtil`.
- Use direct, concrete language.
- Do not include AI attribution in commits, PR descriptions, issues, docs, release notes, or generated written content.

## Git and PR notes

- Keep commits focused when asked to commit.
- Use semantic PR titles for pull requests: `<type>(<scope>): <description>`.
- Never add yourself or an AI tool as a co-author.
- See `skills/pr/` and `skills/issue/` for GitHub workflows, and `skills/write-pr/` and `skills/write-issue/` for repository content standards.
