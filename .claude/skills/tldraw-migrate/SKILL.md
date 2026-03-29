---
name: tldraw-migrate
description: Migrate a project to a newer version of the tldraw SDK. Use when upgrading tldraw packages, fixing TypeScript errors after a tldraw upgrade, or when the user mentions tldraw migration.
argument-hint: '[previous-version]'
disable-model-invocation: true
user-invocable: true
---

# tldraw Migration Assistant

You are helping migrate a project to a newer version of the tldraw SDK. Follow this process carefully.

Previous version (auto-detected from git history): !`node ${CLAUDE_SKILL_DIR}/detect-versions.mjs`

## Resources (auto-fetched on invocation)

!`mkdir -p ${CLAUDE_SKILL_DIR}/references && curl -s https://tldraw.dev/llms-releases.txt | node ${CLAUDE_SKILL_DIR}/filter-changelog.mjs $(node ${CLAUDE_SKILL_DIR}/detect-versions.mjs) > ${CLAUDE_SKILL_DIR}/references/tldraw-releases.txt && echo "Saved filtered changelog to ${CLAUDE_SKILL_DIR}/references/tldraw-releases.txt ($(wc -l < ${CLAUDE_SKILL_DIR}/references/tldraw-releases.txt) lines)"`

!`mkdir -p ${CLAUDE_SKILL_DIR}/references && curl -s https://tldraw.dev/llms-full.txt > ${CLAUDE_SKILL_DIR}/references/tldraw-full-docs.txt && echo "Saved full docs to ${CLAUDE_SKILL_DIR}/references/tldraw-full-docs.txt ($(wc -l < ${CLAUDE_SKILL_DIR}/references/tldraw-full-docs.txt) lines)"`

- **[Filtered changelog](references/tldraw-releases.txt)** — release notes for versions between the previous version and now. Read this first to understand what changed.
- **[Full docs](references/tldraw-full-docs.txt)** — complete tldraw SDK docs (~1.5MB). Do NOT read this upfront. Use Grep or Read with line ranges to search for specific topics as needed (e.g., custom shapes, TLTextOptions).

## Step 1: Understand the environment

Before making any changes, scan the project to understand what you're working with. Run these in parallel:

- **Package manager**: Check for lock files (`yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package-lock.json`). Use the corresponding tool throughout.
- **tldraw packages**: `cat package.json | grep -E "tldraw|@tldraw"` — which packages are installed, and at what versions? Note: not every project uses all tldraw packages.
- **Import style**: `grep -r "from '@tldraw/" src/ --include="*.ts" --include="*.tsx" -l | head -5` — does the project import from `'tldraw'`, `'@tldraw/editor'`, or both? This affects module augmentation targets.
- **TypeScript**: Check `package.json` for a `typecheck` or `tsc` script. Also check the TypeScript version — is it a direct dependency or does the project rely on a global install?
- **Build tool**: Check `package.json` scripts for the build command (vite, next, webpack, esbuild, etc.)
- **Linter**: Check for eslint/biome config files (`.eslintrc*`, `eslint.config.*`, `biome.json`). A linter may help catch deprecations later.
- **Monorepo**: Is `package.json` at the working directory root, or is this a nested package? Check for workspaces config.

## Step 2: Upgrade packages

Using the detected package manager, upgrade all tldraw packages that are already in the project's dependencies to the latest version. Don't add new packages the project doesn't already use.

## Step 3: Identify all TypeScript errors

Run the project's typecheck command (from Step 1) and categorize the errors:

1. **Count errors by TS code** (e.g., TS2344, TS2786) to understand the distribution
2. **List unique files with errors** to understand the scope
3. **Identify error patterns** — common categories in tldraw upgrades:
   - React types mismatch (TS2786 "cannot be used as JSX component") — usually means `@types/react` version doesn't match what tldraw bundles. Check `node_modules/@tldraw/editor/node_modules/@types/react/package.json` for the expected version.
   - Custom shape type registration (TS2344 "does not satisfy constraint TLShape/TLBaseBoxShape") — tldraw v4.3+ requires module augmentation of `TLGlobalShapePropsMap`
   - Custom binding type registration — same pattern with `TLGlobalBindingPropsMap`
   - `BaseBoxShapeTool.shapeType` type mismatch (TS2416) — needs `as const`
   - API renames/removals (TS2305, TS2724) — check changelog for specific migrations
   - `createShapes`/`updateShapes` type widening (TS2345) — mapped arrays need `TLShapePartial` or `TLCreateShapePartial` casts

## Step 4: Fix errors in order of impact

Fix in this order (each fix eliminates many downstream errors):

### 3a. Fix React types

If you see TS2786 "bigint not assignable to ReactNode" errors, upgrade `@types/react` and `@types/react-dom` to match tldraw's bundled version.

### 3b. Register custom shapes and bindings

For every `TLBaseShape<'name', Props>` in the codebase, add module augmentation. Use the import style detected in Step 1 as the module target:

```ts
declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		'shape-name': {
			/* props */
		}
	}
}
type MyShape = TLShape<'shape-name'>
```

Same pattern for bindings with `TLGlobalBindingPropsMap` and `TLBinding<'name'>`.

**IMPORTANT**: If multiple files use the same shape type name with different props, rename them to be unique — they all share the global type registry.

Add `as const` to all `static override shapeType = '...'` properties.

### 3c. Fix API renames and removals

Cross-reference each TS2305/TS2724/TS2339 error with the changelog. Common patterns:

- Removed exports: find replacement by grepping the tldraw type definitions
- Renamed properties: check changelog for the new name
- Changed method signatures: check the current type definitions

To find tldraw type definitions, check which paths exist — the location varies by version:

- `node_modules/tldraw/dist-cjs/index.d.ts`
- `node_modules/tldraw/dist/index.d.ts`
- `node_modules/@tldraw/editor/dist-cjs/index.d.ts`
- `node_modules/@tldraw/tlschema/dist-cjs/index.d.ts`

### 3d. Fix TipTap imports if needed

If the project uses TipTap (`@tiptap/*` in dependencies or imports), the tldraw upgrade may require upgrading TipTap as well. Starting with tldraw v4.2, tldraw bundles TipTap v3 as a transitive dependency. If the project pins TipTap v2 packages directly, this will cause version conflicts and broken imports. **Upgrade the project's direct `@tiptap/*` dependencies to v3** to match what tldraw expects — leaving them on v2 will not work.

After upgrading, fix any breaking TipTap v2 → v3 changes:

- **Default → named exports**: If a default import fails, switch to a named import: `import StarterKit from '@tiptap/starter-kit'` → `import { StarterKit } from '@tiptap/starter-kit'`
- **Renames**: If a named import fails, check the package's actual exports: `grep 'export' node_modules/@tiptap/<package>/dist/index.js | head` — some extensions were renamed in TipTap v3 (e.g., `TextStyle` → `TextStyleKit`).
- **Transaction handler types**: If TipTap event handler types break, import the proper types: `import { EditorEvents } from '@tiptap/core'` and type handlers as `(props: EditorEvents['transaction']) => void` rather than inline type annotations.

### 3e. Fix remaining type errors

- `createShapes`/`updateShapes` with `.map()`: The proper fix is to add `as const` to the `type` field in the mapped object literal so TypeScript narrows it to the string literal type. If that's not sufficient, use a `satisfies` annotation on the return value. Only as a last resort, cast the result to `TLCreateShapePartial` or `TLShapePartial`.
- TipTap extension commands not on `ChainedCommands`: use `declare module '@tiptap/core'` augmentation to register custom commands.
- **General rule**: every `as` cast you add is tech debt. Before adding one, exhaust these alternatives in order:
  1. `as const` on object literals to narrow string literal types
  2. `satisfies` annotations to check types without widening
  3. Proper generic type parameters on the call site
  4. Module augmentation to teach TypeScript about your types
  5. Only then, a targeted `as` cast with a comment explaining why it's needed

## Step 5: Fix deprecations

After all type errors are resolved, find and fix deprecated API usage. These still compile but should be migrated.

1. **Find deprecated symbols** — grep the tldraw type definitions for `@deprecated` annotations. Also search the changelog for "deprecated" in `${CLAUDE_SKILL_DIR}/tldraw-releases.txt`.

2. **Check if a linter is configured** — look for eslint, biome, or other linting config in the project. If available, run the linter — it may flag deprecated usage automatically (e.g., eslint's `deprecation/deprecation` rule). If no linter is configured, skip to step 3.

3. **Search the project source** for each deprecated symbol found in step 1. Replace with the recommended alternative from the `@deprecated` JSDoc comment or changelog.

## Step 6: Verify

Run the project's typecheck and build commands (as discovered in Step 1).

If errors remain, repeat the categorize-and-fix cycle.

### Post-migration sanity check

After all errors are resolved, do a quick audit:

1. **Count `as` casts before vs after**: Run `grep -rn ' as ' --include='*.ts' --include='*.tsx' src/` and compare against the same grep on the pre-migration code (use `git stash` or `git show HEAD:path`). **The migration should add no more than a small handful of new casts** (ideally zero). If you added more than ~5 new `as` casts across the entire migration, go back and fix them — you are almost certainly using the new API incorrectly.
2. **Review every cast you added**: For each new `as` cast, verify it's truly necessary by checking whether `as const`, `satisfies`, generic type parameters, or module augmentation could replace it. Remove or replace any that have a cleaner alternative.
3. **Verify no stubs or dead code**: If you stubbed out removed APIs (e.g., replaced a removed function with a no-op), make sure the calling code doesn't depend on the return value. If it does, find the proper replacement in the changelog or docs.

## Quality checks

- **Type safety is paramount.** The goal is a migration that is as type-safe as the original code. Do NOT add `as any`, `as unknown`, or broad type casts. Do NOT add `@ts-ignore` or `@ts-expect-error`. These are never acceptable — if you can't make the types work, you don't understand the new API yet. Stop and read the changelog and type definitions before continuing.
- **Prefer TypeScript's narrowing features over casts.** Use `as const` for literal types, `satisfies` for type-checking without widening, generic parameters for call sites, and module augmentation for extending interfaces. These are the right tools for a migration — `as` casts are not.
- Use parallel agents for fixing large batches of files with the same pattern.
- **Don't just make errors go away — understand the new API.** When a method signature changes (e.g., new parameters added, property renamed to a richer type), read the changelog AND the current type definitions to understand _why_ it changed. A fix that compiles but passes hardcoded/dummy values where the new API expects real data is worse than a type error — it silently degrades behavior. For example, if a function gains new required parameters, check what shape props or editor state should feed those parameters rather than passing `0` or `1`.
- **When unsure about an API pattern**, grep the full docs (`${CLAUDE_SKILL_DIR}/tldraw-full-docs.txt`) for usage examples of that specific API. The docs contain code samples that show the canonical way to use each API.

## Tips

- Read `${CLAUDE_SKILL_DIR}/references/tldraw-releases.txt` for the filtered changelog — this is the primary source for what changed
- Grep `${CLAUDE_SKILL_DIR}/references/tldraw-full-docs.txt` when you need docs on a specific API
- When searching tldraw types, try multiple paths — the dist directory structure varies by version and package manager
