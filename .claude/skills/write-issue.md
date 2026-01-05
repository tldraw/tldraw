# Writing and maintaining GitHub issues

This skill describes the standards for writing and maintaining issues in the tldraw/tldraw repository.

## Title standards

### Format

- **Sentence case**: Use sentence case for all titles (capitalize only the first word and proper nouns)
- **No type prefixes**: Never include type prefixes in titles like `Bug:`, `Feature:`, `[Bug]`, `Example:`, `RFC:`, `Chore:`, `perf:`. Use GitHub issue types instead.
- **Imperative mood for enhancements**: Use imperative verbs for feature requests and enhancements (e.g., "Add padding option to zoomToFit" not "Adding padding option")
- **Descriptive for bugs**: Describe the symptom clearly (e.g., "Arrow bindings break with rotated shapes" not "arrow bug")
- **Specific and actionable**: Titles should describe what the issue is about specifically enough that someone can understand it without reading the body

### Examples

**Good titles:**

- `Arrow bindings break with rotated shapes` (bug - describes the symptom)
- `Add padding option to zoomToFit method` (enhancement - imperative mood)
- `Pinch zoom resets selection on Safari` (bug - specific browser/behavior)
- `Support hot-loading documents without editor remount` (feature - clear capability)
- `Custom shape with screen reader description` (example - describes what it demonstrates)

**Bad titles:**

- `Bug: arrow bug` (has prefix, vague)
- `[Feature] Add new feature` (has prefix, vague)
- `Not working` (vague, no context)
- `Problem with shapes` (vague)
- `Feature Request: Adding padding` (has prefix, wrong verb form)
- `BUG: something is broken` (has prefix, vague, wrong case)

### Title transformations

When cleaning up titles, apply these transformations:

1. Remove prefixes: `Bug: X` → `X`, `Feature: X` → `X`, `[Bug] X` → `X`
2. Fix capitalization: `Add Padding Option` → `Add padding option`
3. Use imperative: `Adding feature X` → `Add feature X`
4. Be specific: `Problem` → `[Describe the actual problem]`
5. Translate non-English: Translate to English if the title is in another language

## Issue types

Every issue should have a **type** set via the `--type` flag when creating with `gh issue create`:

| Type      | Use for                             |
| --------- | ----------------------------------- |
| `Bug`     | Something isn't working as expected |
| `Feature` | New capability or improvement       |
| `Example` | Request for a new SDK example       |
| `Task`    | Internal task or chore              |

These types are defined in `.github/ISSUE_TEMPLATE/` and are separate from labels.

## Labels

Labels are used for additional metadata, not for categorizing issue types.

### Common labels

| Label              | Use for                                             |
| ------------------ | --------------------------------------------------- |
| `good first issue` | Good for newcomers                                  |
| `More Info Needed` | Issue requires additional information from reporter |
| `sdk`              | Affects the tldraw SDK                              |
| `dotcom`           | Related to tldraw.com                               |
| `a11y`             | Related to accessibility                            |
| `performance`      | Improve performance of an existing feature          |
| `docs`             | Changes only affect documentation                   |
| `api`              | API change                                          |
| `e2e-tests`        | Related to end-to-end tests                         |
| `translations`     | Updating translations                               |

### Automation labels (do not apply manually to issues)

Labels with `⚙️` in their description are automation triggers, primarily for pull requests:

- `keep` - Prevents issue from being marked stale or closed
- `stale` - Applied automatically to issues inactive for 150 days
- `update-snapshots` - Regenerates Playwright snapshots
- `publish-packages` - Publishes branch packages to npm
- `major`, `minor`, `skip-release` - Version control
- `internal`, `other` - Changelog categorization
- Various deploy triggers (`*-hotfix-please`, `*-preview-please`)

### Label best practices

- Don't over-label: 1-2 labels per issue is ideal
- Use `More Info Needed` and comment asking for details if issue is incomplete
- Apply `good first issue` to well-scoped issues with clear acceptance criteria

## Issue body standards

### Bug reports should include

1. **Clear description** of what's wrong
2. **Steps to reproduce** the issue
3. **Expected behavior** vs **actual behavior**
4. **Environment details** (browser, OS, tldraw version) when relevant
5. **Screenshots or recordings** when applicable

### Feature requests should include

1. **Problem statement**: What problem does this solve?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: What other approaches exist?
4. **Use cases**: Who would benefit and how?

### Example requests should include

1. **What should be demonstrated**: The specific API or pattern
2. **Why it's useful**: When developers would need this
3. **Suggested approach**: Rough code outline if possible
4. **Category**: Which example category it belongs to

## Triage workflow

### New issues

1. Verify the issue has enough information to act on
2. Ensure the issue has the appropriate type set
3. Clean up title if needed (remove prefixes, fix case, improve clarity)
4. Add `More Info Needed` label and comment if details are missing
5. Add `good first issue` if appropriate

### Stale issues

1. Review if still relevant
2. Close if no longer applicable
3. Add `keep` label if should remain open despite inactivity
4. Request updates from reporter if waiting on information

## Common cleanup patterns

### Prefix removal

| Before                       | After                                         |
| ---------------------------- | --------------------------------------------- |
| `Bug: canvas goes blank`     | `Canvas goes blank when editing text`         |
| `Feature: add zoom padding`  | `Add padding option to zoomToFit`             |
| `[Enhancement] better icons` | `Improve icon exposure for custom UIs`        |
| `Example: custom shape`      | `Custom shape with screen reader description` |
| `RFC: new snapping API`      | `Centralize grid snapping API`                |
| `perf: explore WebGL`        | `Explore WebGL for indicator rendering`       |
| `Chore: cleanup deps`        | `Clean up unused dependencies`                |

### Vague title improvement

| Before        | After                                           |
| ------------- | ----------------------------------------------- |
| `Not working` | `[Read issue body and describe actual problem]` |
| `Problem`     | `[Read issue body and describe actual problem]` |
| `Bug`         | `[Read issue body and describe actual problem]` |
| `Help needed` | `[Read issue body and describe actual problem]` |

### Capitalization fixes

| Before                            | After                                       |
| --------------------------------- | ------------------------------------------- |
| `Add Padding Option To ZoomToFit` | `Add padding option to zoomToFit`           |
| `ARROW BINDINGS BROKEN`           | `Arrow bindings broken with rotated shapes` |
| `custom Shape Example`            | `Custom shape example`                      |

## Sources

- [Best practices for using GitHub issues](https://rewind.com/blog/best-practices-for-using-github-issues/)
- [GitHub Issues tagging best practices](https://robinpowered.com/blog/best-practice-system-for-organizing-and-tagging-github-issues)
- [Mastering GitHub Issues](https://gitprotect.io/blog/mastering-github-issues-best-practices-and-pro-tips/)
- [GitHub Labels guide](https://flavor365.com/mastering-github-labels-for-issues-pull-requests/)
