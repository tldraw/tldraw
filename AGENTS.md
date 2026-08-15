# AGENTS.md

This file provides guidance to AI coding agents working in this repository. It covers what the codebase can't tell you on its own — for structure, packages, and available scripts, read the tree and the root `package.json`.

## Core rules

- Use `yarn`, not `npm`, for repo commands. This repo uses Yarn workspaces and Yarn 4.
- Run commands from the repo root unless a command explicitly says to run from a workspace.
- Never run bare `tsc`; use `yarn typecheck` from the repo root.
- Prefer targeted checks first. Avoid repo-wide test or e2e runs unless the change needs them.
- Respect existing worktree changes. Do not revert user changes unless explicitly asked.
- Do not add new documentation files unless requested.

## Setup

Requires Node `>=22.12.0`. Enable Corepack before installing dependencies:

```bash
npm i -g corepack && yarn
```

In a fresh git worktree, run `yarn install` first since worktrees start without `node_modules`.

## Running the dev servers

Always run dev commands from the repo root. The root `yarn dev` runs each package's `predev` step, which generates build artifacts like `packages/tldraw/tldraw.css`. Running a per-workspace command (`yarn workspace examples.tldraw.com dev`) skips `predev`, so imports such as `tldraw/tldraw.css` fail to resolve.

`yarn vitest` runs every test in the repo and is slow; prefer a workspace-scoped run.

## Validation workflow

- For narrow package changes, run the relevant workspace test first, for example `cd packages/tldraw && yarn test run --grep "SelectTool"`.
- For changes that affect shared types, migrations, editor behavior, or cross-package contracts, run `yarn typecheck` from the repo root.
- For public API changes, run `yarn api-check` and include intentional API report updates.
- For asset changes, run `yarn refresh-assets` or `yarn typecheck` so generated assets stay current.
- For docs changes, run the narrow docs checks or docs build only when the change affects generated content, MDX behavior, or site structure.
- For e2e behavior changes, run the smallest relevant e2e suite and update snapshots only when behavior intentionally changed.

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

Store and schema:

- Store changes should respect migrations, validators, and schema versioning.
- Schema-affecting changes usually need updates in `packages/tlschema` and focused migration tests.

Editor manager conventions live in `packages/editor/CLAUDE.md`.

## Testing guidance

- Test in `packages/tldraw` when default shapes, tools, bindings, or UI are involved.
- Test in `packages/editor` for core editor behavior that should not depend on default shapes or UI.
- Prefer comparing whole objects in assertions when that gives a clearer failure than checking fields one by one.
- See `skills/write-unit-tests/` and `skills/write-e2e-tests/` for test patterns and file placement.

## Documentation and examples

- Example folders use lowercase kebab-case names, and example README frontmatter drives the examples site.
- Update docs or examples when an API or user-facing behavior changes.
- See `skills/write-docs/`, `skills/write-example/`, and `skills/write-release-notes/` for task-specific guidance.

## Skills

- Canonical agent skills live in `skills/`. The `.agents/skills`, `.claude/skills`, and `.cursor/skills` symlinks point there for agent compatibility; keep `skills/` as the source of truth.
- Skill folders use `skill-name/SKILL.md` with YAML frontmatter containing at least `name` and `description`.
- Put reusable scripts, references, and assets inside the relevant skill folder.
- Do not duplicate skill content for different agents; add compatibility pointers or symlinks instead.
- See `skills/skill-creator/` before creating or restructuring skills.

## Code conventions

TypeScript:

- Use workspace types and helpers rather than duplicating definitions.
- Keep public API changes deliberate and reflected in API reports.
- Avoid boolean or ambiguous positional options in new APIs when a named object or enum would make call sites clearer.

Generated files:

- Do not hand-edit generated assets, API reports, or schemas unless the repo already expects that file to be edited directly.
- Run the owning generator command when generated output needs to change.

Dependencies:

- Keep dependencies workspace-appropriate.
- If changing dependency manifests or lockfiles, make sure the lockfile update is intentional and included.
- Every package a file imports must be declared in the owning workspace's own `package.json`. Yarn's `node-modules` linker hoists everything to the repo root, so an undeclared import still resolves here but breaks consumers on pnpm or Yarn PnP. The `tldraw/no-undeclared-dependencies` lint rule enforces this across `packages/*`; adding a workspace dependency also needs a matching `references` entry in that package's `tsconfig.json` (`yarn check-packages --fix`).
- Dependency install/build scripts are off by default (`enableScripts: false` in `.yarnrc.yml`), which closes the main supply-chain `postinstall` code-execution path. Packages that genuinely need to build (native/napi modules, binary downloaders) are allowlisted with `built: true` under `dependenciesMeta` in the root `package.json`. When adding a dependency that ships a native addon or downloads a platform binary, add an allowlist entry — Yarn silently skips unlisted scripts, so a missing entry shows up as a runtime or build failure, not an install error.

## Comments

A comment earns its place by saying something the code cannot: why this way, what breaks otherwise, which bug it guards. Everything else is noise a reader wades through to reach the code — and enough of it teaches people to skip comments entirely, including the load-bearing ones.

Delete on sight:

- **Restatement.** `/** Get the toolbar element */` above `getToolbar()`. The name already said it.
- **Narration.** `// Check if the shape is already selected` above the line that checks. `// Delete the shapes` above `editor.deleteShapes()`.
- **Section banners.** `// ===== Locators =====`, `// --- internals ---`. A file that needs signposting needs splitting. Judge the label like any other comment once the rule is off it — `// Bug 3: arrow binding survives rotation` above `test('bug 3: arrow binding survives rotation')` is restatement wearing decoration.
- **`@param` / `@returns` that restate the signature.** The types carry it. Keep the tag only for what the type can't say — units, a caller precondition, `0 = first button`.
- **Rationale copy-pasted across sibling call sites.** State it once where the shared thing lives and point at it. Three copies become three subtly different claims, and then nobody knows which is current.
- **Call-site lists.** `Used by: SelectTool, DrawTool, EraserTool…`. Find-references gives this for free and it rots on the next caller.

Trim, rather than delete, when the reason is real but overlong. The test is whether a reviewer reads it or skips past it to get at the code: **once a comment is longer than the code it explains, it has stopped working.** A twenty-line rationale block is usually three good lines plus seventeen restating them — keep the three. One orienting header per file is fine; one per method is not.

**Narrative belongs in a doc; the comment keeps the local fact and points at it.** Ask: does this knowledge span more than one file, and would you read it _before_ starting rather than while typing? Then it is narrative — put it in the project's doc (a `README.md` beside the code, a `SPEC.md`, an article in `apps/docs/content/`) and leave a header of a few lines carrying what this file's own reader needs, plus the reference. A guard comment fails that test and must stay at the line: it is read _during_ an edit, by the person about to delete the thing it guards, and nobody consults a doc before deleting a line.

The pointer is the deliverable, not the leftover — extraction without one is deletion with extra steps. And extract, never copy: a duplicated narrative is the thing that rots, because each copy drifts into a slightly different claim and the stalest one is indistinguishable from the current one.

**The litmus, in one line: a good comment names a failure mode, not a mechanism.** The mechanism is on screen. What is not on screen is what goes wrong without it — "otherwise the binding updates before the shape has its new page transform". Write the "otherwise" and the mechanism explains itself. Expect length, not category, to be the usual defect: most blocks worth editing already name a real force, and then say it three more times.

What earns real length, and should not be trimmed for being long:

- **A diagram.** Twenty lines of box-drawing beat any prose about geometry.
- **An enumerated set of cases** the code must not break — the list is the specification.
- **Provenance.** An issue number, "we tried X and it did Y", "modified from the upstream version to…".

Keep, always: the non-obvious invariant, the bug or issue number, the constant nobody should tune blindly.

**Application code is not library code.** In `packages/*`, doc comments on the `@public` surface are a deliverable — they become the API reference on tldraw.dev and land in `api-report.md`, and density there is expected. In `apps/*` and `templates/*` almost nothing is a published surface, so comment lines are explanation prose and cost reading time. App code carrying library-grade comment density, with no `@public` surface to justify it, is over-commented by definition.

Applies to code you write **and** code you touch. Prior art: [#9824](https://github.com/tldraw/tldraw/pull/9824).

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
