---
name: write-release-notes
description: Writing release notes articles for tldraw SDK releases. Use when creating new release documentation, drafting release notes from scratch, or reviewing release note quality. Provides guidance on structure, voice, and content for release files in `apps/docs/content/releases/`.
---

# Writing release notes

This skill provides guidance on writing release notes articles for tldraw SDK releases.

## Location

All release files live in `apps/docs/content/releases/`.

## File roles

| File         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `next.mdx`   | Accumulates changes for the upcoming release               |
| `vX.Y.0.mdx` | Published releases (immutable except for patch additions)  |

## Content structure

### What to include

1. **Introduction paragraph** - 1-2 sentences summarizing the release highlights
2. **What's new** - Featured sections (H3s) for major features and breaking changes
3. **API changes** - New methods, properties, options, deprecations, breaking changes
4. **Improvements** - Enhancements to existing functionality
5. **Bug fixes** - Fixed issues
6. **Patch releases** - (for published releases) Changes in patch versions

Omit empty sections.

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

## Writing featured sections

Promote changes to the "What's new" section when:
- It's a breaking change requiring migration code
- It introduces a major new capability
- Multiple related PRs combine into one significant feature
- Users need detailed guidance (migration guides, platform tables)

Featured sections should include:
- Clear description of what changed and why it matters
- Code examples where helpful
- Migration guides in collapsible `<details>` blocks for breaking changes
- Links to relevant documentation

## PR categorization

| Category     | Labels                       | Indicators                       |
| ------------ | ---------------------------- | -------------------------------- |
| API changes  | `api`, `feature`, `major`    | Adds/removes/modifies public API |
| Improvements | `improvement`, `enhancement` | Enhances existing functionality  |
| Bug fixes    | `bugfix`, `bug`              | Fixes issues                     |

Look for `### Release notes` and `### API changes` sections in PR bodies. Search for "breaking" to identify breaking changes (mark with 💥 prefix).

## Voice and style

Semi-casual and confident. Professional but not stodgy.

- "significant performance improvements" not "loads of performance improvements"
- "an overhaul to our migration system" not "big changes to migrations"
- Lead with concrete features, then infrastructure, then performance
- Start entries with verbs: "Add", "Fix", "Improve", "Remove"
- American English spelling
- Avoid complicated grammar, obscure vocabulary, jokes, or cultural idioms

## Team members (do not credit)

angrycaptain19, AniKrisn, ds300, kostyafarber, max-dra, mimecuvalo, MitjaBezensek, profdl, Siobhantldraw, steveruizok, tldrawdaniel, huppy-bot, github-actions, Somehats, todepond, Taha-Hassan-Git, alex-mckenna-1, max-drake

Credit community contributors with:
```markdown
(contributed by [@username](https://github.com/username))
```

## Notes

- Do not include Claude Code attribution
- Write as if the release has already happened
- The release listing is maintained in `apps/docs/content/getting-started/releases.mdx`

## References

- **Formatting conventions**: See `../shared/release-notes-formatting.md` for detailed formatting rules, entry format, PR links, frontmatter, and examples
