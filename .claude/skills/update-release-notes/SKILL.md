---
name: update-release-notes
description: Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs on the production branch since the previous release, or archive `next.mdx` to a versioned file when a new version is published.
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Update release notes

This skill handles the operational tasks of maintaining release notes: adding new PR entries to `next.mdx` and archiving releases when a new version is published.

## Release cycle

The SDK releases every four weeks. One week before launch, the SDK is frozen and a `production` branch is cut from `main`. During release week, only hotfixes are cherry-picked to `production`.

The release notes in `next.mdx` must ultimately reflect what ships on the `production` branch. However, during the ~3 development weeks before the freeze, we build up release notes from `main` so they're not empty. The status script detects which phase we're in based on the date of the last minor release:

- **Development weeks** (`source: "main"`, <3 weeks since last minor release): PRs are gathered from `main` since the last release tag. These are preliminary — some may not ship if they're reverted or if production cherry-picks differ.
- **Freeze week** (`source: "production"`, 3+ weeks since last minor release): PRs are gathered from the `production` branch using `git cherry` against the previous release branch. Only PRs that landed before the freeze or were hotfixed onto production are included. Entries accumulated from `main` that aren't on production will be pruned.

## Process

### 1. Check status

Run the status script to determine versions and diff branch:

```bash
.claude/skills/update-release-notes/scripts/get-changelog-status.sh
```

This returns:

- `source` - either `"main"` (development weeks) or `"production"` (release week)
- `diff_branch` (e.g., `v4.3.x`) - the branch to diff against (used when `source` is `"production"`)
- `last_tag` (e.g., `v4.4.0`) - the last release tag (used when `source` is `"main"`)
- `latest_release` - the most recent published release
- Whether archival is needed

### 2. Handle archival (if needed)

If a new release was published since `last_version` in `next.mdx`:

1. Copy `next.mdx` content to `vX.Y.0.mdx` (e.g., `v4.3.0.mdx`)
2. Update the frontmatter in the new file:
   - Set `title` to the version
   - Update dates
   - Add the GitHub release link after frontmatter
3. Reset `next.mdx`:
   - Update `last_version` field to the new release
   - Clear the content sections
   - Keep the file structure for accumulating new changes

### 3. Find new PRs

The approach depends on the `source` field from step 1.

**If `source` is `"production"` (release week):**

Get PR numbers on the production branch since the previous release:

```bash
.claude/skills/update-release-notes/scripts/get-new-prs.sh <diff_branch>
```

This uses `git cherry` (same approach as `extract-draft-changelog.tsx`) to compare patches between `origin/production` and `origin/<diff_branch>`. Unlike `git log`, `git cherry` correctly handles cherry-picked hotfix commits by comparing patch content rather than commit hashes.

**If `source` is `"main"` (development weeks):**

Get PR numbers on main since the last release tag:

```bash
.claude/skills/update-release-notes/scripts/get-new-prs-from-main.sh <last_tag>
```

This uses `git cherry` to compare patches between `origin/main` and the release tag, excluding commits that were cherry-picked to production and already shipped in the release.

**Both scripts output:**

- **stdout**: PR numbers (one per line) extracted from commit messages
- **stderr**: Commits without PR numbers (typically hotfixes or direct commits)

### 4. Resolve hotfix commits

Check stderr from step 3 for any `[HOTFIX]` commits without PR numbers. For each SDK-relevant one (skip dotcom-only), find the corresponding PR:

```bash
gh pr list --state merged --search "<hotfix title keywords>" --json number,title --jq '.[]'
```

Also check `sdk-hotfix-please` labeled PRs, but verify they actually landed on production — this label is also used for patch releases on the previous release branch (e.g., v4.3.x):

```bash
gh pr list --label "sdk-hotfix-please" --state merged --limit 20 --json number,title,mergedAt
```

Add any matched PR numbers to the production PR list from step 3.

### 5. Fetch PR details

Batch fetch all PR information:

```bash
.claude/skills/update-release-notes/scripts/fetch-pr-batch.sh <pr1> <pr2> ...
```

### 6. Remove stale entries

Compare the full PR list (from steps 3 + 4) against the PR numbers already referenced in `next.mdx`. Remove any entries from `next.mdx` whose PRs are **not** in the current set.

- **When `source` is `"production"`**: This prunes entries that were accumulated from `main` during development but didn't make it to production. These are PRs that landed on `main` after the production branch was cut and will not ship in this release.
- **When `source` is `"main"`**: This removes entries for PRs that were reverted or otherwise no longer on main. Pruning is less aggressive since the full set isn't finalized until production is cut.

When removing an entry, also check whether it was referenced in a featured "What's new" section and remove that section too. Update the intro paragraph if it mentions a removed feature.

### 7. Add new entries

For each PR on production that is not already in `next.mdx`:

1. Check PR labels and body against the style guide's categorization rules
2. Skip PRs that should be omitted (see style guide)
3. Skip PRs that fix bugs introduced in the same release cycle (i.e., bugs caused by other PRs already in `next.mdx` that were not in the previous release)
4. If a PR is a revert, also remove the original reverted PR's entry from `next.mdx` if present
5. Add entries to the appropriate section
6. Promote significant changes to featured sections when warranted

### 8. Verify

Check that:

- Every PR referenced in `next.mdx` is in the current PR set (from `main` or `production` depending on `source`)
- PR links are correct
- Community contributors are credited
- Sections are in the correct order
- Breaking changes are marked with 💥
- Deprecations are marked with 🔜

**Note**: When `source` is `"main"`, the entries are preliminary. Some may be pruned later when the production branch is cut and the source switches to `"production"`.

## The `last_version` field

The `next.mdx` frontmatter includes a `last_version` field that tracks the most recent published release. This determines which PRs are "new" and need to be added.

## References

- **Style guide**: See `../shared/release-notes-guide.md` for guidance on what a release notes article should contain and how to format it.
- **Scripts**: See `scripts/` for automation helpers
