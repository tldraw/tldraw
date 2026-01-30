---
name: update-changelog
description: Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs merged to main since the previous release.
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Update changelog

Update the release notes file at `apps/docs/content/releases/next.mdx` based on PRs merged to main since the previous release.

## Process

1. **Check status** - Run the status script to determine versions and diff branch:

   ```bash
   .claude/skills/update-changelog/scripts/get-changelog-status.sh
   ```

   This returns the `diff_branch` (e.g., `v4.3.x`), `latest_release`, and whether archival is needed.

2. **Handle archival (if needed)** - If a new release was published since `last_version`:
   - Copy `next.mdx` content to `vX.Y.0.mdx` (e.g., `v4.3.0.mdx`)
   - Clear `next.mdx` and update its `last_version` field to the new release

3. **Find new PRs** - Get PR numbers merged since the release branch:

   ```bash
   .claude/skills/update-changelog/scripts/get-new-prs.sh <diff_branch>
   ```

4. **Fetch PR details** - Batch fetch all PR information:

   ```bash
   .claude/skills/update-changelog/scripts/fetch-pr-batch.sh <pr1> <pr2> ...
   ```

5. **Filter PRs** - Skip PRs with these labels: `other`, `skip-release`, `chore`, `dotcom`. Also skip reverts unless fixing something user-facing.

6. **Categorize** - Sort PRs into sections based on labels and content:

   | Category     | Labels                       | Indicators                       |
   | ------------ | ---------------------------- | -------------------------------- |
   | API changes  | `api`, `feature`, `major`    | Adds/removes/modifies public API |
   | Improvements | `improvement`, `enhancement` | Enhances existing functionality  |
   | Bug fixes    | `bugfix`, `bug`              | Fixes issues                     |

   Look for `### Release notes` and `### API changes` sections in PR bodies. Search for "breaking" to identify breaking changes (mark with 💥 prefix).

7. **Identify featured sections** - Promote to featured section when:
   - It's a breaking change that requires migration code
   - It introduces a major new capability
   - Multiple related PRs combine into one significant feature
   - Users need detailed guidance (migration guides, platform tables)

8. **Update next.mdx** - Add entries following `references/formatting.md`. Featured sections go at the top with `---` separators.

9. **Verify** - Check that PR links are correct, community contributors are credited, and sections are in order.

## Content guidelines

### What to emphasize

- Breaking changes that require user action
- New features that solve common pain points
- API additions that unlock new capabilities
- Changes that affect how developers integrate tldraw

### What to omit

- Internal performance optimizations (unless user-visible)
- Fixes for bugs introduced in the same release cycle
- Implementation details that don't affect public API
- Pure code quality improvements

### Voice

Semi-casual and confident. Professional but not stodgy.

- "significant performance improvements" not "loads of performance improvements"
- "an overhaul to our migration system" not "big changes to migrations"
- Lead with concrete features, then infrastructure, then performance

## Team members (do not credit)

angrycaptain19, AniKrisn, ds300, kostyafarber, max-dra, mimecuvalo, MitjaBezensek, profdl, Siobhantldraw, steveruizok, tldrawdaniel, huppy-bot, github-actions, Somehats, todepond, Taha-Hassan-Git

## Notes

- Do not include Claude Code attribution
- Write as if the release has already happened
- Omit empty sections
- The `last_version` field in `next.mdx` frontmatter tracks the most recent published release (e.g., `last_version: v4.3.0`)

## References

- **Formatting conventions**: See `references/formatting.md` for section structure, entry format, PR links, and frontmatter
- **Scripts**: See `scripts/` for automation helpers
