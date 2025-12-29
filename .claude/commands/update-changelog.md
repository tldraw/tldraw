Update the changelog file at `apps/docs/content/changelog/next.mdx` based on PRs merged to main since the previous release.

Read `.claude/skills/write-changelog.md` for formatting guidelines and structural knowledge about the changelog system.

## Process

1. **Determine versions** - Read `next.mdx` frontmatter to get the upcoming version, then calculate the previous release branch (e.g., v4.3 → v4.2.x)

2. **Find new PRs** - Use git to find commits on main not on the release branch:

   ```bash
   git log origin/main ^origin/vX.Y.x --oneline
   ```

3. **Fetch PR details** - For each PR number, get details:

   ```bash
   gh pr view NNNN --json number,title,labels,author,body,mergedAt
   ```

4. **Filter and categorize** - Skip PRs with `other`, `skip-release`, `chore`, or `dotcom` labels. Categorize the rest into breaking changes, API changes, improvements, and bug fixes based on labels and PR body sections.

5. **Update next.mdx** - Add new entries following the skill's formatting guidelines. If PRs are already documented, just update the introduction if needed.

6. **Verify** - Check that PR links are correct, community contributors are credited, and sections are in the correct order.

## Notes

- Do not include Claude Code attribution or co-author lines
- Write as if the release has already happened
- Omit empty sections
