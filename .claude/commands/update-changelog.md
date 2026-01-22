---
description: Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs merged to main since the previous release.
allowed-tools: Bash(git:*), Bash(gh:*)
---

Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs merged to main since the previous release.

Use the `write-changelog` skill for formatting guidelines and structural knowledge.

## Process

1. **Determine versions** - Read `next.mdx` frontmatter to get the upcoming version, then calculate the previous release branch (e.g., v4.3.0 means previous is v4.2.x)

2. **Find new PRs** - Use git to find commits on main not on the release branch:

   ```bash
   git log origin/main ^origin/vX.Y.x --oneline
   ```

3. **Fetch PR details** - For each PR number:

   ```bash
   gh pr view NNNN --json number,title,labels,author,body,mergedAt
   ```

4. **Filter and categorize** - Skip PRs per skill guidelines. Categorize the rest into breaking changes, API changes, improvements, and bug fixes.

5. **Update next.mdx** - Add new entries following the skill's formatting guidelines.

6. **Verify** - Check that PR links are correct, community contributors are credited, and sections are in order.

## Notes

- Do not include Claude Code attribution
- Write as if the release has already happened
- Omit empty sections
