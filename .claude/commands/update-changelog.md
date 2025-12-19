Update the changelog file at `documentation/changelog/next.md` based on PRs merged to main since the previous release.

## Process

### 1. Determine the current and previous versions

Read `documentation/changelog/next.md` to find the current version from the frontmatter title (e.g., "v4.3" means current version is 4.3).

Calculate the previous release branch name:

- For v4.3, the previous branch is `v4.2.x`
- For v5.0, the previous branch is `v4.x.x` (find the highest v4.N.x branch)
- For v5.12, the previous branch is `v5.11.x`

### 2. Get PRs since the last release

Use git to find commits on main that are not on the release branch:

```bash
git log origin/main ^origin/vX.Y.x --oneline
```

Extract PR numbers from commit messages (format: `#NNNN`).

For each PR number, fetch details using:

```bash
gh pr view NNNN --json number,title,labels,author,body,mergedAt
```

### 3. Filter and categorize PRs

**Skip PRs that should not be in the changelog:**

- PRs with the `other` label (internal changes)
- PRs with the `skip-release` label
- PRs with the `chore` label
- PRs with the `dotcom` label (tldraw.com-only changes)
- PRs with titles starting with "Revert" (unless they fix something user-facing)
- PRs that only affect documentation, translations, or tests

**Categorize PRs into sections:**

1. **Breaking changes** - PRs with `major` label or breaking change indicators
2. **API changes** - PRs with `api` label, `feature` label, or that add/remove/modify public API
3. **Improvements** - PRs with `improvement` or `enhancement` label
4. **Bug fixes** - PRs with `bugfix` or `bug` label

**Extraction from PR body:**

- Look for the "### Release notes" section in the PR body for description text
- Look for the "### API changes" section for API change details
- Check the "### Change type" checkboxes to determine category

### 4. Format entries

Format entries following the `write-changelog` skill guidelines. Key points:

- Start with a verb: "Add", "Fix", "Improve", "Remove"
- Include PR link: `([#NNNN](https://github.com/tldraw/tldraw/pull/NNNN))`
- Credit community contributors (see team list below)
- Keep descriptions concise but informative

**Team members (do not credit as contributors):**

- steveruizok, SomeHats, TodePond, ds300, MitjaBezensek, Taha-Hassan-Git, mimecuvalo, huppy-bot, alex-mckenna-1, kostyafarber, max-drake, AniKrisn, github-actions

### 5. Write or update next.md

Write or update the sections in `documentation/changelog/next.md`. The article should be written as if the release had already been made. Use the `write-changelog` skill if it is available.

If pull requests are already documented, you do not necessarily need to update those sections. You may need to update the introduction and summary if there have been new changes.

### 6. Review the changes

After updating:

- Verify all PR links are correct
- Check that community contributors are credited
- Ensure no internal/dotcom-only changes leaked through
- Confirm entries follow sentence case and start with verbs

## Notes

- Do not include Claude Code attribution or co-author lines
- The audience is developers using the tldraw SDK
- Be appropriately concise—this is a changelog, not documentation
