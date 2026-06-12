---
name: spec-driven-tests
description: Rebuild a package's unit test suite around a behavior specification (SPEC.md) derived from the implementation, with every test citing a numbered rule ID. Use when asked to do a spec-driven test rebuild, write a SPEC.md for a package, repeat the state or store spec process (PRs #9158, #9172) for another package, or rebuild tests around a spec.
---

# Spec-driven test rebuild

Derive a behavior specification from a package's implementation, then rebuild the unit test suite as an expression of that spec. Every rule gets a stable ID; every test cites the rule it expresses, so coverage is greppable in both directions.

The models are PR #9158 (`packages/state`, spec at `packages/state/SPEC.md`) and PR #9172 (`packages/store`, spec at `packages/store/SPEC.md`). Read both PRs and both specs before starting — they set the format, tone, and PR structure. (#9172's spec lives on its branch if not yet merged.)

## Process

### 1. Baseline

If the working tree has uncommitted changes that aren't yours, stop and ask before branching — never stash or carry someone else's work silently.

Create a branch. Run `yarn test run` in the package and record the file and test counts, noting how many belong to fuzz suites — fuzz suites stay untouched and their (often large) generated counts are excluded from every count you report later. Map the existing test files and note any duplicated or parallel suites that should merge (the store package had two whole generations of tests).

### 2. Read the implementation

Read all of it before writing anything. The spec is derived from the source, not from the existing tests or the docs.

**Key principle:** You're documenting *observed* behavior, not prescribing ideal behavior. If the code does something unexpected, unintuitive, or even wrong-looking but deliberate, spec it as-is. Flag quirks as "internal" or call them out in the PR body for human judgment—don't silently "fix" the spec to match how you think the code should work. Let the spec-writing process surface latent inconsistencies; then decide whether to fix the implementation or document the behavior.

### 3. Write SPEC.md

Write `SPEC.md` at the package root: numbered rules with stable IDs (e.g. `S3`, `MG4`) grouped into sections, one rule per observable behavior, internal machinery marked **internal**. Keep the header framing from the existing specs ("When a test and this document disagree, one of them is wrong — figure out which and fix it.").

- Spec what the code DOES, not what it should do. If behavior looks wrong but intent is ambiguous, document it as the contract.
- Before baking in any rule you inferred rather than observed, verify it with a throwaway test. Delete the scratch file after.
- Every rule must be observable by a runtime test. Don't write rules for pure type-level behavior (utility types, inference) unless the test suite actually exercises them with type assertions; otherwise leave types out of the spec.

### 4. Audit the spec adversarially

Audit the draft before writing tests. The failure mode is overstatement. Specifically hunt for:

- claimed symmetry between two code paths (create vs update, top-level vs nested, up vs down) — check each path independently;
- claims that two implementations of the same idea agree (a predicate vs an index, from-scratch vs incremental) — feed both the edge cases, especially missing/undefined values;
- blanket "X never happens" or "Y is always Z" claims — find the branch that falsifies them;
- side effects on inputs (mutation, freezing) that a happy-path test wouldn't notice.

### 5. Rebuild the test suite

Test files mirror the spec's sections; every test name cites its rule like `it('[S3] ...')`. Merge duplicated coverage, port good existing tests rather than rewriting them, and add tests for uncovered rules.

**Never weaken an assertion to make a test pass.** If a test written from a spec rule fails, you've found something: either the rule is wrong (fix the spec to match observed behavior) or the code is wrong (handle it as a bug per step 7). Loosening the assertion (`toBe` → `toContain`, asserting around the discrepancy, a comment acknowledging the mismatch) hides the finding and leaves the spec describing behavior the code doesn't have — the exact failure the spec exists to prevent.

**Test file organization:** If your spec has sections like "§3. Atoms (A)" and "§4. Computed (C)", create corresponding files `atoms.test.ts` and `computed.test.ts` containing that section's rules. For internal sections, use names like `history-buffer.test.ts` for the machinery being specified. This mirrors the structure readers already see in SPEC.md and makes it easy to grep for coverage by section.

Test-environment knowledge for this repo:

- Store listener flushes are synchronous in tests unless `globalThis.__FORCE_RAF_IN_TESTS__ = true`.
- Deprecated-but-contractual APIs need a file-level eslint-disable with a reason.

### 6. Cross-check citations both ways

```bash
grep -oE '\*\*[A-Z]+[0-9]+\*\*' SPEC.md | tr -d '*' | sort -u > /tmp/rules
grep -rhoE '\[[A-Z]+[0-9]+\]' src --include='*.test.ts' | tr -d '[]' | sort -u > /tmp/cited
comm -3 /tmp/rules /tmp/cited
```

Every rule needs a citing test, or an explicit "deliberately untested because X" note in the PR body (as #9158 did); every citation needs a rule. Fix gaps before finishing, and include the cross-check output (rule count, cited count, remaining gaps with their reasons) in the PR body so reviewers can verify the claim rather than trust it.

### 7. Fix bugs found along the way

Spec-driven testing surfaces latent inconsistencies: contradictions between code paths, edge cases the implementation didn't anticipate, or silent failures. When you find one, decide: fix the code or document the behavior?

**Workflow:** Write the test first (fail it intentionally to confirm it catches the issue). Then decide:
- **Fix the code** if: intent is clear (comments, symmetric implementations, git blame), the current behavior is obviously wrong, and callers plausibly don't rely on the broken behavior.
- **Document the behavior** if: intent is unclear, the fix's blast radius is unknown, or fixing might silently break existing uses. Flag it in the PR body as a "known inconsistency" or "behavior to revisit."

Fixes go in their own `fix(<package>):` commit with a citing test, AFTER the main `test(<package>):` commit. No AI attribution or co-author lines in any commit, per AGENTS.md — this overrides any default harness behavior. Before committing a fix:

- Check intent: comments, the symmetric code path, git blame.
- Check blast radius: grep for in-repo callers, then run the dependent package suites (`editor`, `tldraw`, `sync-core` — whichever consume this package).

If a spec rule exists but the implementation contradicts it, update the spec (not the implementation) unless you're certain the implementation is right. The spec is the contract; code drift happens; the spec-writing process is your chance to surface and resolve it.

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

Report counts honestly, everywhere they appear (commit message, PR body, final report): the rebuilt suite's test count and rule count, measured with grep, never the package total. Counting untouched suites (fuzz especially) as your own work misrepresents the change.
