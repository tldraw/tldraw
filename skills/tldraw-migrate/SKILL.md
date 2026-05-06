---
name: tldraw-migrate
description: Migrate a project to a newer version of the tldraw SDK. Use when upgrading tldraw packages, fixing TypeScript errors after a tldraw upgrade, or when the user mentions tldraw migration.
argument-hint: '[from-version] [target]'
disable-model-invocation: true
user-invocable: true
---

# tldraw migration assistant

You are helping migrate a project to a newer version of the tldraw SDK. Follow this process carefully.

Throughout this skill, `${SKILL_DIR}` refers to this skill's own directory (where `SKILL.md`, the helper `.mjs` scripts, and the cached `references/` folder live). The auto-fetch blocks below resolve it from the `SKILL_DIR` env var if set, otherwise probe the common skill locations (`.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `skills/`). When you run shell commands later in the workflow that reference `${SKILL_DIR}`, substitute the same absolute path.

**Arguments**: `/tldraw-migrate [from-version] [target]`. Both optional. `from-version` defaults to the previous tldraw version detected from git history. `target` defaults to `latest` (the latest stable release on npm); pass a dist-tag (`canary`, `next`, `beta`) or a pre-release semver (e.g. `4.6.0-canary.abc123`) to migrate to a pre-release.

Resolved migration: !`SKILL_DIR="${SKILL_DIR:-$(for d in .claude/skills/tldraw-migrate .agents/skills/tldraw-migrate .cursor/skills/tldraw-migrate skills/tldraw-migrate; do [ -d "$d" ] && printf %s "$d" && break; done)}" && FROM=$(node "$SKILL_DIR/detect-versions.mjs" $ARGUMENTS) && TARGET=$(node "$SKILL_DIR/detect-target.mjs" $ARGUMENTS) && echo "from $FROM → target $TARGET"`

## Resources (auto-fetched on invocation)

!`SKILL_DIR="${SKILL_DIR:-$(for d in .claude/skills/tldraw-migrate .agents/skills/tldraw-migrate .cursor/skills/tldraw-migrate skills/tldraw-migrate; do [ -d "$d" ] && printf %s "$d" && break; done)}" && mkdir -p "$SKILL_DIR/references" && CHANGELOG="$SKILL_DIR/references/tldraw-releases.txt" && PREV=$(node "$SKILL_DIR/detect-versions.mjs" $ARGUMENTS) && [ -n "$PREV" ] && curl --fail -sS https://tldraw.dev/llms-releases.txt | node "$SKILL_DIR/filter-changelog.mjs" "$PREV" > "$CHANGELOG" && echo "Saved changelog (from $PREV) to $CHANGELOG ($(wc -l < "$CHANGELOG") lines)"`

!`SKILL_DIR="${SKILL_DIR:-$(for d in .claude/skills/tldraw-migrate .agents/skills/tldraw-migrate .cursor/skills/tldraw-migrate skills/tldraw-migrate; do [ -d "$d" ] && printf %s "$d" && break; done)}" && DOCS="$SKILL_DIR/references/tldraw-full-docs.txt" && if [ -s "$DOCS" ]; then echo "Using cached full docs at $DOCS ($(wc -l < "$DOCS") lines) — delete the file to refresh"; else curl --fail -sS https://tldraw.dev/llms-full.txt -o "$DOCS" && echo "Saved full docs to $DOCS ($(wc -l < "$DOCS") lines)"; fi`

!`SKILL_DIR="${SKILL_DIR:-$(for d in .claude/skills/tldraw-migrate .agents/skills/tldraw-migrate .cursor/skills/tldraw-migrate skills/tldraw-migrate; do [ -d "$d" ] && printf %s "$d" && break; done)}" && mkdir -p "$SKILL_DIR/references" && TARGET=$(node "$SKILL_DIR/detect-target.mjs" $ARGUMENTS) && case "$TARGET" in canary|next|beta|alpha|rc|*-canary*|*-next*|*-beta*|*-alpha*|*-rc*) NEXT="$SKILL_DIR/references/tldraw-next.mdx" && curl --fail -sS https://raw.githubusercontent.com/tldraw/tldraw/main/apps/docs/content/releases/next.mdx -o "$NEXT" && echo "Pre-release target ($TARGET) — saved next-release notes to $NEXT ($(wc -l < "$NEXT") lines)" ;; *) echo "Stable target ($TARGET) — skipping next-release notes" ;; esac`

- **[Filtered changelog](references/tldraw-releases.txt)** — release notes for stable versions between the previous version and now. Each breaking change (marked `💥`) carries a `<details><summary>Migration guide</summary>` block with a before/after recipe. **These migration blocks are the primary source for version-specific fixes** — this skill intentionally does not duplicate them. When you hit a TS error, grep for the relevant API name in this file and read its migration block.
- **[Full docs](references/tldraw-full-docs.txt)** — complete tldraw SDK docs (~1.5MB). Do NOT read this upfront. Use Grep or Read with line ranges to search for specific topics as needed (e.g., custom shapes, TLTextOptions).
- **[Next-release notes](references/tldraw-next.mdx)** — *only present when the target is a pre-release.* The in-progress release notes (raw MDX from `main`) for the upcoming version. Same `<details><summary>Migration guide</summary>` structure. The stable changelog won't cover canary/next deltas; this file is where you'll find them.

**Searching for migration recipes:**

```sh
# List every breaking change with a migration block
grep -nE '💥|<summary>Migration guide' ${SKILL_DIR}/references/tldraw-next.mdx

# Find the migration recipe for a specific symbol
grep -n -B2 -A20 'getIndicatorPath\|TLUserStore\|EmbedShapeUtil' ${SKILL_DIR}/references/tldraw-next.mdx
```

## Step 1: Understand the environment

Before making any changes, scan the project to understand what you're working with. Run these in parallel:

- **Package manager**: Check for lock files (`yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package-lock.json`). Use the corresponding tool throughout.
- **tldraw packages**: `grep -E "tldraw|@tldraw" package.json` — which packages are installed, and at what versions? Note: not every project uses all tldraw packages.
- **Source directory**: figure out where the project's TypeScript sources live (commonly `src/`, `app/`, or `lib/`; Next.js App Router projects don't have `src/`). Use this directory for every grep below — don't assume `src/`.
- **Import style**: `grep -r "from '@tldraw" <source-dir> --include="*.ts" --include="*.tsx" -l | head -5` — does the project import from `'tldraw'`, `'@tldraw/editor'`, or both? This affects module augmentation targets.
- **TypeScript**: Check `package.json` for a `typecheck` or `tsc` script. If neither exists, fall back to `npx tsc --noEmit` (TypeScript is usually a devDependency). Also check the TypeScript version.
- **Build tool**: Check `package.json` scripts for the build command (vite, next, webpack, esbuild, etc.)
- **Linter**: Check for eslint/biome config files (`.eslintrc*`, `eslint.config.*`, `biome.json`). A linter may help catch deprecations later.
- **Monorepo**: Is `package.json` at the working directory root, or is this a nested package? Check for workspaces config.

## Step 2: Upgrade packages

Using the detected package manager, upgrade all tldraw packages that are already in the project's dependencies to the resolved target (printed in the "Resolved migration" line above). Don't add new packages the project doesn't already use.

- For a stable target (`latest` or a stable semver): install at that tag/version, e.g. `yarn add tldraw@latest` or `npm install tldraw@4.5.10`.
- For a pre-release target (`canary`, `next`, `beta`, or a pre-release semver): install at that tag/version, e.g. `yarn add tldraw@canary`. If multiple `@tldraw/*` packages are listed, pin them all to the same target to avoid version skew.

## Step 3: Identify all TypeScript errors

Run the project's typecheck command (from Step 1) and categorize the errors:

1. **Count errors by TS code** (e.g., TS2344, TS2786) to understand the distribution.
2. **List unique files with errors** to understand the scope.
3. **Identify error patterns.** The categories below are version-agnostic — they describe the *shape* of common errors. The *specific* fix for each rename, removal, or signature change lives in the release-notes migration blocks (see "Searching for migration recipes" above), not in this skill.

   - **TS2786** "cannot be used as JSX component" / "bigint not assignable to ReactNode": React types skew. `@types/react` (and usually `@types/react-dom`) don't match the version tldraw bundles. To find the bundled version: with npm or yarn classic, check `node_modules/@tldraw/editor/node_modules/@types/react/package.json`; with pnpm or yarn berry, run the package manager's "why" command (e.g. `pnpm why @types/react`).
   - **TS2344** "does not satisfy constraint TLShape/TLBaseBoxShape" / **TS2416** `shapeType` mismatch: custom shape or binding type isn't registered for the new global props maps. Fix pattern in 4b.
   - **TS2305** / **TS2724** "has no exported member" / "is not exported": API removed or renamed. Find the replacement in the matching `Migration guide` block in `tldraw-releases.txt` / `tldraw-next.mdx`.
   - **TS2339** "property does not exist": API renamed or method signature changed. Same lookup.
   - **TS2515** "non-abstract class does not implement inherited abstract member": a base class gained a required method. The error names the method — search the migration blocks for that method name. (Note: if your implementation only throws, TypeScript may infer `never`; add an explicit return type to satisfy the base class signature.)
   - **TS2345** on `createShapes`/`updateShapes`: heterogeneous mapped arrays need `as TLShapePartial[]` / `as TLCreateShapePartial[]` casts. See 4e.
   - **TS2345** with two structurally-similar `Editor` classes resolving to different paths under `node_modules/@tiptap/core` and `node_modules/@tldraw/editor/node_modules/@tiptap/core`: TipTap v2/v3 dual install. See 4d.

## Step 4: Fix errors in order of impact

Fix in this order (each fix eliminates many downstream errors). After each sub-step, re-run the project's typecheck and confirm that the error codes targeted by *that* sub-step are resolved (or at least decreasing). Ignore unrelated error codes — they belong to later sub-steps. This catches regressions early without blocking on errors you haven't gotten to yet.

### 4a. Fix React types

If you see TS2786 "bigint not assignable to ReactNode" errors, upgrade `@types/react` AND `@types/react-dom` together to match tldraw's bundled version. Bumping only `@types/react` will leave a transitive dependency on the old `@types/react-dom` and the same errors will reappear from a different path (e.g. inside `TldrawUiToolbarButton`).

**Verify**: re-run typecheck — TS2786 errors should be gone.

### 4b. Register custom shapes and bindings

If you see TS2344 ("does not satisfy constraint `TLShape`/`TLBaseBoxShape`") or TS2416 (`shapeType` mismatch) errors, the project is using the pre-v4.3 `TLBaseShape<'name', Props>` pattern and needs to migrate to `TLGlobalShapePropsMap` module augmentation.

The full recipe — module augmentation for shapes and bindings, the rename ripple when shape names collide, `as const` on `static override type` / `static override shapeType`, and the heterogeneous `createShapes`/`updateShapes` cast guidance — lives in the v4.3 release notes migration block. Find it with:

```sh
grep -n -B2 -A80 'TLGlobalShapePropsMap' ${SKILL_DIR}/references/tldraw-releases.txt
```

Apply that recipe across the project. Use the import style detected in Step 1 as the module-augmentation target (`declare module 'tldraw'` vs. `declare module '@tldraw/editor'`).

**Verify**: re-run typecheck — TS2344 and TS2416 errors should be gone.

### 4c. Fix API renames, removals, and abstract-method additions

This is where the version-specific work happens, and it's driven entirely by the release-notes migration blocks. The skill does *not* enumerate which APIs changed — that's the changelog's job, and it would go stale on every release.

For each TS2305 / TS2724 / TS2339 / TS2515 error:

1. Pull the symbol name out of the error.
2. Grep the migration blocks for it: `grep -n -B2 -A20 'SymbolName' ${SKILL_DIR}/references/tldraw-releases.txt ${SKILL_DIR}/references/tldraw-next.mdx`.
3. Apply the recipe shown in the matching `Migration guide` block. Migration blocks contain before/after code snippets; copy the structure.

If the symbol isn't in any migration block:

- **Demoted to `@internal`** (still exported at runtime, but missing from `.d.ts`): check whether a `<details><summary>Migration guide</summary>` mentions it as part of a larger API. The right fix is almost always to switch to the public replacement, *not* to use module augmentation to re-expose the symbol. If you reach for `declare module 'tldraw' { export function X(): ... }`, stop — find the public replacement instead.
- **Truly unmentioned**: check the type defs in `node_modules/tldraw/dist-cjs/index.d.ts`, `node_modules/@tldraw/editor/dist-cjs/index.d.ts`, or `node_modules/@tldraw/tlschema/dist-cjs/index.d.ts` (the layout varies by version and package manager). If the symbol is genuinely gone with no listed replacement, treat the gap as a documentation bug worth flagging in your final report.

For TS2515 (newly-required abstract method): if your implementation only throws, declare the return type explicitly so TypeScript doesn't infer `never` and the abstract-mismatch error doesn't linger.

**Verify**: re-run typecheck — count TS2305, TS2724, TS2339, and TS2515 errors before and after. Each fix should knock out one error. If counts haven't dropped, you missed a migration block — re-grep before continuing.

### 4d. Fix TipTap imports if needed

**Skip this entire sub-step if the project has no `@tiptap/*` dependencies or imports.** Confirm with `grep -E '@tiptap/' package.json` and a recursive grep for `from '@tiptap` in the source directory. If both come back empty, jump to 4e.

If the project uses TipTap, your migration may need to cross the v2 → v3 cutover (introduced in tldraw v4.2). The full v2 → v3 recipe — dual-install diagnostic, default-to-named export changes, `TextStyle`/`TextStyleKit`/`FontFamily` reorganization, transaction-handler types — lives in the v4.2 release notes migration block. Find it with:

```sh
grep -n -B2 -A60 'TipTap v3' ${SKILL_DIR}/references/tldraw-releases.txt
```

Apply that recipe. The tldraw skill only adds two version-agnostic notes on top:

> **Install ordering trap (any TipTap upgrade).** Running `npm install @tiptap/core@3 @tiptap/starter-kit@3 ...` against a project that already has v2 in `node_modules` will fail with `ERESOLVE`, because the v2 `starter-kit` declares `peer @tiptap/core@^2.7`. Either uninstall the v2 packages first (`npm uninstall @tiptap/core @tiptap/starter-kit ...`) or pass `--legacy-peer-deps`.

> **Custom chained commands.** Whatever TipTap version, custom chain commands register via `declare module '@tiptap/core'` augmentation. This is a TipTap idiom, not a tldraw one — see TipTap's docs.

**Verify**: re-run typecheck — TipTap import and type errors should be gone.

### 4e. Fix remaining type errors

- `createShapes`/`updateShapes` with `.map()`: see the v4.3 migration block for the full recipe (`as const` on the `type` field for homogeneous arrays; `as TLShapePartial[]` / `as TLCreateShapePartial[]` for heterogeneous ones; *not* `satisfies TLShapePartial`).
- TipTap extension commands not on `ChainedCommands`: use `declare module '@tiptap/core'` augmentation to register custom commands.
- **General rule**: every `as` cast you add is tech debt. Before adding one, exhaust these alternatives in order:
  1. `as const` on object literals to narrow string literal types
  2. `satisfies` annotations to check types without widening
  3. Proper generic type parameters on the call site
  4. Module augmentation to teach TypeScript about your types
  5. Only then, a targeted `as` cast with a comment explaining why it's needed

**Verify**: re-run typecheck — remaining errors should all be resolved. If any remain, re-categorize and route them back to 4a–4d as appropriate.

## Step 5: Fix deprecations

After all type errors are resolved, find and fix `@deprecated` API usage. These still compile but should be migrated.

1. **Find deprecated symbols.** The changelog is the most reliable starting point — tldraw's `.d.ts` files use multi-line JSDoc, so grepping the type defs is fragile (the declaration line is typically 2–5 lines after the `@deprecated` tag, not adjacent to it).

   Start here:

   ```sh
   grep -i 'deprecated' ${SKILL_DIR}/references/tldraw-releases.txt
   ```

   When the target is a pre-release, also: `grep -i 'deprecated' ${SKILL_DIR}/references/tldraw-next.mdx`.

   To cross-check against the type defs (one package at a time — repeat for each `@tldraw/*` package the project imports from, and `tldraw` itself), use `-A` not `-B`:

   ```sh
   grep -A5 '@deprecated' node_modules/@tldraw/editor/dist-cjs/index.d.ts \
     | grep -oE '\b(class|function|interface|const|type|let|var)\s+\w+' \
     | awk '{print $NF}' | sort -u
   ```

   This catches multi-line JSDoc but produces some false positives — treat the output as a candidate list, not an authoritative one. The changelog grep is what you should drive from.

2. **Run the linter if configured** — eslint's `deprecation/deprecation` rule will flag deprecated imports automatically. If no linter is configured, skip this step.

3. **Search the project source** for each deprecated symbol. Replace with the recommended alternative from the `@deprecated` JSDoc comment, the changelog entry, or the docs.

4. **Sanity-check renames the typecheck didn't catch.** If the changelog or `tldraw-next.mdx` describes a rename and the project still imports the old name, TypeScript may resolve it through a wildcard re-export and miss it. Skim the changelog/next.mdx for "renamed" / "moved to" entries and grep the source for any old names you find.

## Step 6: Verify

Run the project's typecheck and build commands (as discovered in Step 1).

If errors remain, repeat the categorize-and-fix cycle.

### Post-migration sanity check

After all errors are resolved, do a quick audit:

1. **Count typed `as` casts added by this migration.** A naive `grep ' as '` overcounts because it includes `as const` (the recommended narrowing pattern) and `as` in import paths. Drive off the diff and filter:

   ```sh
   git diff -- '<source-dir>/**/*.ts' '<source-dir>/**/*.tsx' \
     | grep -E '^\+' | grep -v '^+++' \
     | grep -E '\bas\s+[A-Z]' | grep -v 'as const'
   ```

   **The migration should add no more than a small handful of new typed casts** (ideally zero, with `as TLShapePartial[]` / `as TLCreateShapePartial[]` for heterogeneous `createShapes`/`updateShapes` arrays as the main legitimate exception). If you added more than ~5 across the whole migration, go back and fix them — you are almost certainly using the new API incorrectly.
2. **Review every typed cast you added**: For each, verify it's truly necessary by checking whether `as const`, `satisfies`, generic type parameters, or module augmentation could replace it. Remove or replace any that have a cleaner alternative.
3. **Audit module augmentations.** Module augmentation is correct for `TLGlobalShapePropsMap` / `TLGlobalBindingPropsMap` registration and for adding genuinely-missing public types. It is **not** correct for re-exposing symbols that the SDK demoted to `@internal` — that's a workaround, not a fix. Find the public replacement instead (the migration block usually names it).
4. **Verify no stubs or dead code**: If you stubbed out removed APIs (e.g., replaced a removed function with a no-op), make sure the calling code doesn't depend on the return value. If it does, find the proper replacement in the migration blocks or docs.

## Quality checks

- **Type safety is paramount.** The goal is a migration that is as type-safe as the original code. Do NOT add `as any`, `as unknown`, or broad type casts. Do NOT add `@ts-ignore` or `@ts-expect-error`. These are never acceptable — if you can't make the types work, you don't understand the new API yet. Stop and read the changelog and type definitions before continuing.
- **Prefer TypeScript's narrowing features over casts.** Use `as const` for literal types, `satisfies` for type-checking without widening, generic parameters for call sites, and module augmentation for extending interfaces. These are the right tools for a migration — `as` casts are not.
- Use parallel agents for fixing large batches of files with the same pattern.
- **Don't just make errors go away — understand the new API.** When a method signature changes (e.g., new parameters added, property renamed to a richer type), read the changelog AND the current type definitions to understand _why_ it changed. A fix that compiles but passes hardcoded/dummy values where the new API expects real data is worse than a type error — it silently degrades behavior. For example, if a function gains new required parameters, check what shape props or editor state should feed those parameters rather than passing `0` or `1`.
- **When unsure about an API pattern**, grep the full docs (`${SKILL_DIR}/references/tldraw-full-docs.txt`) for usage examples of that specific API. The docs contain code samples that show the canonical way to use each API.

## Tips

- Read `${SKILL_DIR}/references/tldraw-releases.txt` for the filtered changelog — this is the primary source for what changed
- Grep `${SKILL_DIR}/references/tldraw-full-docs.txt` when you need docs on a specific API
- When searching tldraw types, try multiple paths — the dist directory structure varies by version and package manager
