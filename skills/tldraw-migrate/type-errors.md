# Type error fix recipes

Fix recipes for the TypeScript errors a tldraw upgrade produces, in the order that eliminates the most downstream errors first. Referenced from `SKILL.md` step 4.

Fix in this order (each fix eliminates many downstream errors). After each sub-step, re-run the project's typecheck and confirm that the error codes targeted by *that* sub-step are resolved (or at least decreasing). Ignore unrelated error codes — they belong to later sub-steps. This catches regressions early without blocking on errors you haven't gotten to yet.

### 4a. Fix React types

If you see TS2786 "bigint not assignable to ReactNode" errors, upgrade `@types/react` AND `@types/react-dom` together to match tldraw's bundled version. Bumping only `@types/react` will leave a transitive dependency on the old `@types/react-dom` and the same errors will reappear from a different path (e.g. inside `TldrawUiToolbarButton`).

**Verify**: re-run typecheck — TS2786 errors caused by `bigint not assignable to ReactNode` should be gone. (TS2786 can also fire from genuine JSX usage problems unrelated to types skew; those remain for later sub-steps.)

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
2. Grep the migration blocks for it: `grep -n -B2 -A60 'SymbolName' ${SKILL_DIR}/references/tldraw-releases.txt ${SKILL_DIR}/references/tldraw-next.mdx 2>/dev/null` (the `2>/dev/null` swallows the missing-file warning when `next.mdx` isn't present for stable targets).
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
