---
name: update-release-notes
description: Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs on the production branch since the previous release, or archive `next.mdx` to a versioned file when a new version is published.
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Update release notes

This skill handles the operational tasks of maintaining release notes: adding new PR entries to `next.mdx` and archiving releases when a new version is published.

## Release cycle

The SDK releases every four weeks. One week before launch, the SDK is frozen and a `production` branch is cut from `main`. During release week, only hotfixes are cherry-picked to `production`.

The release notes in `next.mdx` must reflect what ships on the `production` branch — not everything on `main`. The `get-new-prs.sh` script diffs `origin/production` against the previous release branch to find the relevant PRs.

## Process

### 1. Check status

Run the status script to determine versions and diff branch:

```bash
.claude/skills/update-release-notes/scripts/get-changelog-status.sh
```

This returns:

- `diff_branch` (e.g., `v4.3.x`) - the branch to diff against
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

### 3. Find PRs on production

Get PR numbers on the production branch since the previous release:

```bash
.claude/skills/update-release-notes/scripts/get-new-prs.sh <diff_branch>
```

This uses `git cherry` (same approach as `extract-draft-changelog.tsx`) to compare patches between `origin/production` and `origin/<diff_branch>`. Unlike `git log`, `git cherry` correctly handles cherry-picked hotfix commits by comparing patch content rather than commit hashes.

The script outputs:

- **stdout**: PR numbers (one per line) extracted from commit messages
- **stderr**: Commits without PR numbers (typically `[HOTFIX]` commits)

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

Compare the full production PR list (from steps 3 + 4) against the PR numbers already referenced in `next.mdx`. Remove any entries from `next.mdx` whose PRs are **not** in the production set. These are PRs that landed on `main` after the production branch was cut and will not ship in this release.

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

- Every PR referenced in `next.mdx` is on the production branch (either via the diff or as a hotfix)
- PR links are correct
- Community contributors are credited
- Sections are in the correct order
- Breaking changes are marked with 💥
- Deprecations are marked with 🔜

## The `last_version` field

The `next.mdx` frontmatter includes a `last_version` field that tracks the most recent published release. This determines which PRs are "new" and need to be added.

## References

- **Style guide**: See `../shared/release-notes-guide.md` for guidance on what a release notes article should contain and how to format it.
- **Scripts**: See `scripts/` for automation helpers
