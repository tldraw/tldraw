---
name: update-release-notes
description: Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs merged to main since the previous release, or archive `next.mdx` to a versioned file when a new version is published.
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Update release notes

This skill handles the operational tasks of maintaining release notes: adding new PR entries to `next.mdx` and archiving releases when a new version is published.

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

### 3. Find new PRs

Get PR numbers merged since the release branch:

```bash
.claude/skills/update-release-notes/scripts/get-new-prs.sh <diff_branch>
```

### 4. Fetch PR details

Batch fetch all PR information:

```bash
.claude/skills/update-release-notes/scripts/fetch-pr-batch.sh <pr1> <pr2> ...
```

### 5. Update next.mdx

For each PR not already in `next.mdx`:

1. Check PR labels and body against the style guide's categorization rules
2. Skip PRs that should be omitted (see style guide)
3. Add entries to the appropriate section
4. Promote significant changes to featured sections when warranted

### 6. Verify

Check that:

- PR links are correct
- Community contributors are credited
- Sections are in the correct order
- Breaking changes are marked with 💥

## The `last_version` field

The `next.mdx` frontmatter includes a `last_version` field that tracks the most recent published release. This determines which PRs are "new" and need to be added.

## References

- **Style guide**: See `../shared/release-notes-guide.md` for guidance on what a release notes article should contain and how to format it.
- **Scripts**: See `scripts/` for automation helpers
