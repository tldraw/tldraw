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

### 5. Filter PRs

Skip PRs with these labels:
- `other`
- `skip-release`
- `chore`
- `dotcom`

Also skip reverts unless they fix something user-facing.

### 6. Categorize

Sort PRs into sections based on labels and content:

| Category     | Labels                       | Indicators                       |
| ------------ | ---------------------------- | -------------------------------- |
| API changes  | `api`, `feature`, `major`    | Adds/removes/modifies public API |
| Improvements | `improvement`, `enhancement` | Enhances existing functionality  |
| Bug fixes    | `bugfix`, `bug`              | Fixes issues                     |

Look for `### Release notes` and `### API changes` sections in PR bodies. Search for "breaking" to identify breaking changes (mark with 💥 prefix).

### 7. Identify featured sections

Promote to featured section when:
- It's a breaking change that requires migration code
- It introduces a major new capability
- Multiple related PRs combine into one significant feature
- Users need detailed guidance (migration guides, platform tables)

### 8. Update next.mdx

Add entries following the formatting conventions. Featured sections go in the "What's new" section at the top.

### 9. Verify

Check that:
- PR links are correct
- Community contributors are credited
- Sections are in the correct order
- Breaking changes are marked with 💥

## Team members (do not credit)

angrycaptain19, AniKrisn, ds300, kostyafarber, max-dra, mimecuvalo, MitjaBezensek, profdl, Siobhantldraw, steveruizok, tldrawdaniel, huppy-bot, github-actions, Somehats, todepond, Taha-Hassan-Git, alex-mckenna-1, max-drake

## Notes

- Do not include Claude Code attribution
- Write as if the release has already happened
- Omit empty sections
- The `last_version` field in `next.mdx` frontmatter tracks the most recent published release

## References

- **Formatting conventions**: See `../shared/release-notes-formatting.md` for section structure, entry format, PR links, and frontmatter
- **Scripts**: See `scripts/` for automation helpers
- **Writing guidance**: See `../write-release-notes/SKILL.md` for voice, style, and content decisions
