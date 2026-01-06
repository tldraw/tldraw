---
name: write-changelog
description: Writing and maintaining release notes in `apps/docs/content/releases/`. Use when creating changelog entries, updating release notes, or when guidance on release documentation structure is needed. Triggers on changelog writing tasks, release documentation, or PR categorization for changelogs.
---

# Writing release notes

## Location

All release files live in `apps/docs/content/releases/`.

## File roles

| File | Purpose |
| ---- | ------- |
| `index.mdx` | Landing page listing all releases by major version |
| `next.mdx` | Accumulates changes for the upcoming release |
| `vX.Y.0.mdx` | Historical releases (immutable except for patch additions) |

## Core workflow

### Adding entries to next.mdx

1. **Find new PRs** - Get the upcoming version from `next.mdx` frontmatter (e.g., "v4.3.0"), then find commits since the previous release:
   ```bash
   git log origin/main ^origin/v4.2.x --oneline
   ```

2. **Fetch PR details** - For each PR number:
   ```bash
   gh pr view NNNN --json number,title,labels,author,body,mergedAt
   ```

3. **Filter PRs** - Skip PRs with these labels: `other`, `skip-release`, `chore`, `dotcom`. Also skip reverts unless fixing something user-facing.

4. **Categorize and write** - Add entries to the appropriate section. See `references/formatting.md` for section order and entry format.

### Publishing a release

1. Rename `next.mdx` to `vX.Y.0.mdx`
2. Increment `order` in frontmatter
3. Create new `next.mdx` for the next version
4. Update `index.mdx` with the new release

## PR categorization

| Category | Labels | Indicators |
| -------- | ------ | ---------- |
| Breaking changes | `major` | Breaking change notes in PR body |
| API changes | `api`, `feature` | Adds/removes/modifies public API |
| Improvements | `improvement`, `enhancement` | Enhances existing functionality |
| Bug fixes | `bugfix`, `bug` | Fixes issues |

Look for `### Release notes` and `### API changes` sections in PR bodies.

## Team members (do not credit)

steveruizok, SomeHats, TodePond, ds300, MitjaBezensek, Taha-Hassan-Git, mimecuvalo, huppy-bot, alex-mckenna-1, kostyafarber, max-drake, AniKrisn, github-actions

## Voice

Semi-casual and confident. Professional but not stodgy.

- "significant performance improvements" not "loads of performance improvements"
- "an overhaul to our migration system" not "big changes to migrations"
- Lead with concrete features, then infrastructure, then performance

## References

- **Formatting conventions**: See `references/formatting.md` for section structure, entry format, PR links, and frontmatter
- **Examples**: See `references/examples.md` for complete release note examples
