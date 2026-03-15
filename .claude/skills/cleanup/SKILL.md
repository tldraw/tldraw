---
name: cleanup
description: Analyze source files for code reduction opportunities - dead code, duplication, unused exports, over-abstraction, and verbose patterns. Use when asked to clean up, reduce, simplify, or shrink code in the SDK. Trigger phrases include "clean up", "reduce code", "dead code", "unused exports", "duplication", "simplify".
---

# Code cleanup

Analyze source files to find concrete opportunities to reduce lines of code.

## Usage

The user provides a target: a file, directory, or package. Default to `packages/editor/src` if unspecified.

## Cleanup categories

Focus ONLY on changes that do NOT alter the package's public API surface. Never remove, rename, or change the signature of any publicly exported symbol.

1. **Dead internal code** - unused local variables/functions, unreachable branches, commented-out code blocks
2. **Dead internal exports** - symbols exported from a file but never imported elsewhere in the repo AND not part of the public API surface (i.e., not re-exported from `index.ts` or listed in `api/` reports)
3. **Duplication** - near-identical code blocks across files (>5 lines of structural similarity)
4. **Single-use abstractions** - internal helper functions, utilities, or classes used exactly once that could be inlined
5. **Verbose patterns** - code that can be simplified without changing behavior (e.g., unnecessary intermediate variables, redundant type annotations TypeScript can infer, verbose conditionals)

## Workflow

### Step 1: Scope and batch

1. Gather all `.ts` files in the target (excluding `.test.ts`, `.d.ts`)
2. Read the package's `index.ts` to understand what's publicly exported (the "public API surface")
3. Split files into batches of 5-15 files, grouped by directory when possible
4. Read the package's `api/` directory if it exists to understand the public API

### Step 2: Spawn parallel agents

CRITICAL: Send ALL agent calls in a SINGLE message so they run concurrently. Do NOT await one agent before spawning the next.

Each agent gets a prompt like this (customize the file list per batch):

```
Analyze these files for code cleanup opportunities in the tldraw repo at [repo root].

FILES TO ANALYZE:
[list of 5-15 absolute file paths]

PUBLIC API EXPORTS (do NOT flag these as dead):
[list of symbols from index.ts / api/ reports]

IMPORTANT: Only flag changes that do NOT affect the public API surface. If a symbol is publicly exported (from index.ts or api/ reports), it is OFF LIMITS - do not flag it for removal, renaming, or signature changes.

For EACH file:
1. Read the file
2. For each exported symbol that is NOT in the public API list, use Grep to search the entire repo for imports of that symbol. If it's only used in the file that defines it (or not used at all), flag it as a dead internal export.
3. For each non-exported function/variable/type, check if it's used within the file. If not, flag as dead code.
4. Look for commented-out code blocks (3+ lines).
5. Look for internal functions/helpers that are only called once - flag as single-use abstraction candidates for inlining.
6. Look for verbose patterns: unnecessary intermediate variables, overly explicit type annotations, verbose conditionals that could be ternaries or nullish coalescing, etc.
7. Look for code that is structurally very similar to code in other files in this batch.

For each finding, report:
- FILE: [path]:[line range]
- CATEGORY: [dead internal export | dead code | duplication | single-use abstraction | verbose pattern | commented-out code]
- DESCRIPTION: [what can be removed/simplified]
- LINES_SAVEABLE: [estimated number]
- CONFIDENCE: [high | medium | low]
- EVIDENCE: [grep results or reasoning supporting the finding]

Be thorough but conservative. Only flag things you have evidence for. Do NOT flag:
- Any symbol that is part of the public API surface (re-exported from index.ts or in api/ reports)
- Any change that would alter public type signatures, method signatures, or class interfaces
- Test utilities or test files
- Code that might be used dynamically (string-based lookups, etc.)
```

### Step 3: Compile report

After ALL agents complete, compile their findings into a single report:

```
## Cleanup report: [target]

### Summary
- Total files analyzed: N
- Total opportunities found: N
- Estimated lines removable: N

### High confidence
[findings sorted by lines saveable, descending]

### Medium confidence
[findings that need human judgment]

### Low confidence / needs investigation
[findings that may have external consumers or subtle dependencies]
```

### Step 4: Act on findings

Present the report. If the user approves changes, implement them starting with highest-confidence, highest-impact items. After changes:
- Run `yarn typecheck` from repo root
- Run tests in the affected workspace

## Important constraints

- NEVER remove, rename, or change the signature of public API symbols (from `index.ts` re-exports or `api/` reports)
- NEVER make changes that would cause `yarn api-check` to fail
- All changes must be purely internal — invisible to consumers of the package
- Be conservative with exports - they may be used by external consumers even if not in the public API list
- Do NOT touch test files unless specifically asked
- Do NOT reformat code or change style - only structural reductions
- Do NOT make changes without presenting findings first
- After implementing changes, run `yarn api-check` in addition to `yarn typecheck` to verify no public API changes
