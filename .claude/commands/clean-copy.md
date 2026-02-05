---
description: Reimplement the current branch on a new branch with a clean, narrative-quality git commit history
argument-hint: [new-branch-name]
allowed-tools: Bash(git:*), Bash(gh pr create:*)
model: opus
---

## Context

- Source branch: !`git branch --show-current`
- Git status: !`git status --short`
- Commits since main: !`git log main..HEAD --oneline`
- Full diff against main: !`git diff main...HEAD --stat`

## Task

Reimplement the current branch on a new branch with a clean, narrative-quality git commit history suitable for reviewer comprehension.

**New Branch Name**: Use `$ARGUMENTS` if provided, otherwise `{source_branch}-clean`.

### Steps

1. **Validate the source branch**
   - Ensure no uncommitted changes or merge conflicts
   - Confirm it is up to date with `main`

2. **Analyze the diff**
   - Study all changes between source branch and `main`
   - Form a clear understanding of the final intended state

3. **Create the clean branch**
   - Create a new branch off of `main` using the new branch name

4. **Plan the commit storyline**
   - Break the implementation into self-contained logical steps
   - Each step should reflect a stage of development—as if writing a tutorial

5. **Reimplement the work**
   - Recreate changes in the clean branch, committing step by step
   - Each commit must:
     - Introduce a single coherent idea
     - Include a clear commit message and description
   - **Use `git commit --no-verify` for all intermediate commits.** Pre-commit hooks check tests, types, and imports that may not pass until the full implementation is complete. Do not waste time fixing issues in intermediate commits that will be resolved by later commits.

6. **Verify correctness**
   - Confirm the final state exactly matches the source branch
   - Run the final commit **without** `--no-verify` to ensure all checks pass

7. **Open a pull request**
   - Create a PR following the instructions in @.claude/commands/pr.md
   - Include a link to the original branch in the PR description

### Rules

- Never add yourself as an author or contributor
- Never include "Generated with Claude Code" or "Co-Authored-By" lines in commits
- The end state of the clean branch must be identical to the source branch
