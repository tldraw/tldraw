---
name: write-release-notes
description: Writing release notes articles for tldraw SDK releases. Use when creating new release documentation, drafting release notes from scratch, or reviewing release note quality. Provides guidance on structure, voice, and content for release files in `apps/docs/content/releases/`.
---

# Write release notes

This skill covers how to write a complete release notes article for a published tldraw SDK release.

## Location

All release files live in `apps/docs/content/releases/`.

| File         | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| `next.mdx`   | Accumulates changes for the upcoming release              |
| `vX.Y.0.mdx` | Published releases (immutable except for patch additions) |

## Process

### 1. Identify the release

Get the version number and find the GitHub release:

```bash
gh release view v4.3.0
```

This shows the release date, tag, and any release notes from GitHub.

### 2. Find all PRs in the release

List PRs merged between the previous release and this one:

```bash
# Find commits between releases
git log v4.2.0..v4.3.0 --oneline --merges

# Or use gh to list PRs
gh pr list --state merged --base main --search "merged:2024-01-01..2024-02-01"
```

### 3. Fetch PR details

For each PR, get the full details:

```bash
gh pr view <PR_NUMBER> --json title,body,labels,author
```

Look for:

- `### Release notes` section in PR body
- `### API changes` section in PR body
- Labels indicating category (api, bugfix, improvement, etc.)
- Whether "breaking" appears in the PR

### 4. Find patch releases

List any patch releases for this minor version:

```bash
gh release list | grep "v4.3"
```

For each patch release, find its PRs:

```bash
git log v4.3.0..v4.3.1 --oneline --merges
```

### 5. Write the article

Create `apps/docs/content/releases/vX.Y.0.mdx` following the style guide.

1. Write the frontmatter with version, dates, and keywords
2. Write a 1-2 sentence introduction summarizing highlights
3. Create featured sections for major features and breaking changes
4. List API changes, improvements, and bug fixes
5. Add patch release sections if applicable
6. Add GitHub release links

### 6. Verify

Check that:

- All significant PRs are represented
- PR links are correct and formatted properly
- Community contributors are credited
- Breaking changes are marked with 💥
- Sections are in the correct order

## References

- **Style guide**: See `../shared/release-notes-guide.md` for guidance on what a release notes article should contain and how to format it.
