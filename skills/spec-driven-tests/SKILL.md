---
name: spec-driven-tests
description: Rebuild a package's unit test suite around a behavior specification (SPEC.md) derived from the implementation, with every test citing a numbered rule ID. Use when asked to do a spec-driven test rebuild, write a SPEC.md for a package, repeat the state or store spec process (PRs #9158, #9172) for another package, or rebuild tests around a spec.
---

# Spec-driven test rebuild

Derive a behavior specification from a package's implementation, then rebuild the unit test suite as an expression of that spec. Every rule gets a stable ID; every test cites the rule it expresses, so coverage is greppable in both directions.

The models are PR #9158 (`packages/state`, spec at `packages/state/SPEC.md`) and PR #9172 (`packages/store`, spec at `packages/store/SPEC.md`). Read both PRs and both specs before starting — they set the format, tone, and PR structure. (#9172's spec lives on its branch if not yet merged.)

## Process

### 1. Baseline

Create a branch. Run `yarn test run` in the package and record the file and test counts. Map the existing test files and note any duplicated or parallel suites that should merge (the store package had two whole generations of tests). Leave fuzz suites untouched.

### 2. Read the implementation

Read all of it before writing anything. The spec is derived from the source, not from the existing tests or the docs.

### 3. Write SPEC.md

Write `SPEC.md` at the package root: numbered rules with stable IDs (e.g. `S3`, `MG4`) grouped into sections, one rule per observable behavior, internal machinery marked **internal**. Keep the header framing from the existing specs ("When a test and this document disagree, one of them is wrong — figure out which and fix it.").

- Spec what the code DOES, not what it should do. If behavior looks wrong but intent is ambiguous, document it as the contract.
- Before baking in any rule you inferred rather than observed, verify it with a throwaway test. Delete the scratch file after.

### 4. Audit the spec adversarially

Audit the draft before writing tests. The failure mode is overstatement. Specifically hunt for:

- claimed symmetry between two code paths (create vs update, top-level vs nested, up vs down) — check each path independently;
- claims that two implementations of the same idea agree (a predicate vs an index, from-scratch vs incremental) — feed both the edge cases, especially missing/undefined values;
- blanket "X never happens" or "Y is always Z" claims — find the branch that falsifies them;
- side effects on inputs (mutation, freezing) that a happy-path test wouldn't notice.

### 5. Rebuild the test suite

Test files mirror the spec's sections; every test name cites its rule like `it('[S3] ...')`. Merge duplicated coverage, port good existing tests rather than rewriting them, and add tests for uncovered rules.

Test-environment knowledge for this repo:

- Store listener flushes are synchronous in tests unless `globalThis.__FORCE_RAF_IN_TESTS__ = true`.
- Deprecated-but-contractual APIs need a file-level eslint-disable with a reason.

### 6. Cross-check citations both ways

```bash
grep -oE '\*\*[A-Z]+[0-9]+\*\*' SPEC.md | tr -d '*' | sort -u > /tmp/rules
grep -rhoE '\[[A-Z]+[0-9]+\]' src --include='*.test.ts' | tr -d '[]' | sort -u > /tmp/cited
comm -3 /tmp/rules /tmp/cited
```

Every rule needs a citing test, or an explicit "deliberately untested because X" note in the PR body (as #9158 did); every citation needs a rule. Fix gaps before finishing.

### 7. Fix bugs found along the way

Fix each bug in its own `fix(<package>):` commit with a citing test, AFTER the main `test(<package>):` commit. Before fixing:

- Check intent: comments, the symmetric code path, git blame.
- Check blast radius: grep for in-repo callers, then run the dependent package suites (`editor`, `tldraw`, `sync-core` — whichever consume this package).

If a fix would change behavior someone plausibly relies on and intent is unclear, document the behavior in the spec instead and flag it in the PR.

### 8. Verify

Run, in order: the package tests, `yarn format-current` then `yarn lint`, `yarn typecheck` from the repo root, `yarn api-check`, and the dependent package suites from step 7.

### 9. PR

Follow `skills/write-pr/`. Model the body on #9172:

- lead paragraph explaining the spec/citation system;
- a per-commit fixes section;
- a section on merged suites and new coverage;
- release notes only for behavior changes;
- a code changes table. Beware: `git diff --numstat` rename lines break naive path matching; use the last field.

### 10. Follow-up notes

Finish by reporting: latent issues you chose not to fix, quirks future test writers need to know, and anything a reviewer should double-check.
