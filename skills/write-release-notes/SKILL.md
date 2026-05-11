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
gh pr view <PR_NUMBER> --json title,body,labels,author,baseRefName
```

Look for:

- `### Release notes` section in PR body
- `### API changes` section in PR body
- Labels indicating category (api, bugfix, improvement, etc.)
- Whether "breaking" appears in the PR

**Important:** Only include PRs whose `baseRefName` is `main`. PRs merged into feature branches (e.g. `default-shape-customization`) are not yet released — they will be included when the feature branch itself is merged to main.

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

### 6. Write a migration guide for every breaking change

Every `💥` in the article needs a migration recipe. The `tldraw-migrate` skill drives off these recipes — it intentionally does not duplicate them in its own SKILL.md, because version-specific knowledge belongs next to the breaking change that introduced it. If the recipe is missing, agents and contributors performing the upgrade have to reverse-engineer it from type defs.

There are two acceptable forms:

**For breaking changes with their own featured section** (renames, replaced APIs, new patterns), add a `<details><summary>Migration guide</summary>` block under the section. Include before/after code and call out any silent-compile traps (props the typecheck won't reject, signatures with optional new parameters, etc.):

````mdx
### 💥 Custom themes with display values

[Description of what changed and why]

<details>
<summary>Migration guide</summary>

`getDefaultColorTheme()` and `DefaultColorThemePalette` have been removed. Use `editor.getCurrentTheme().colors[colorMode]` instead:

```tsx
// Before
const theme = getDefaultColorTheme({ isDarkMode })

// After
const theme = editor.getCurrentTheme()
const colors = theme.colors[editor.getColorMode()]
```

</details>
````

**For one-line `💥` entries in the API changes list**, the bullet itself must contain the recipe — name the replacement and any caveats inline:

- ✅ `💥 Replace TLDrawShapeSegment.points with the helper getPointsFromDrawSegment(segment, scaleX, scaleY) so segment points respect the shape's current scale.`
- ❌ `💥 Remove TLDrawShapeSegment.points.` (no replacement → reader has to guess)

A symbol that is removed without a replacement is a documentation bug — find the public alternative or, if there genuinely isn't one, say so explicitly so readers know to drop the call site rather than searching for a rename.

**Special case — `@public` → `@internal` demotions:** these compile but disappear from public types. They are still breaking changes for consumers who imported the symbol. Treat them like a removal: mark with `💥`, name the public replacement, and explicitly tell readers *not* to reach for module augmentation to re-expose the demoted symbol.

### 7. Verify

Check that:

- All significant PRs are represented
- PR links are correct and formatted properly
- Community contributors are credited
- Breaking changes are marked with 💥
- **Every `💥` has either a migration guide block or an inline replacement** (run `grep -nE '💥' apps/docs/content/releases/<file>.mdx` and verify each bullet/section)
- Sections are in the correct order

## References

- **Style guide**: See `../shared/release-notes-guide.md` for guidance on what a release notes article should contain and how to format it.
