# Review old release QA projects

Review ./release-project-items.md. This file contains items from historical release QA projects. Work in batches of 5 items, using parallel haiku subagents to investigate each unticked item.

## Instructions

For each unticked `- [ ]` item:

1. **Skip** items that are already ticked `[x]` or have GitHub issue links
2. **Investigate** using a haiku subagent to search the codebase and git history
3. **Categorize** as one of:
   - **FIXED** → Mark as `[x]` with note: `(Fixed in #1234)` or `(Fixed via mechanism)`
   - **OBSOLETE** → Mark as `[x]` with note: `(Obsolete - reason)`
   - **STILL AN ISSUE** → Create GitHub issue on tldraw/tldraw with description, expected behavior, and code location
   - **CANNOT DETERMINE** → Leave unticked for manual review

## Haiku agent prompt template

```
Investigate whether this bug still exists in the tldraw codebase:

"[BUG DESCRIPTION]"

1. Search for related code using Grep and Glob
2. Check git history for fixes
3. Report: FIXED (with evidence), OBSOLETE (with reason), STILL AN ISSUE, or CANNOT DETERMINE

This is from Release [DATE] project.
```

## GitHub issue format

When creating issues for bugs that still exist:

```
gh issue create --repo tldraw/tldraw --type "Bug" --title "[description in sentence case]" --body "$(cat <<'EOF'
## Description
[What the bug is]

## Expected behavior
[What should happen]

## Code location
[File paths and line numbers if found]

## Source
From Release QA project: [DATE]
EOF
)"
```

## Notes

- Items from 2023/early 2024 are likely fixed or obsolete
- dotcom-specific items before Sept 2024 TLA rewrite are likely obsolete
- UX improvements and edge cases in exports/clipboard/touch may still exist
- If rate limited, note remaining items in the "Pending issues" section below

## Pending issues

Items that still need GitHub issues (update as you work):

_None currently pending_

## Useful scripts

### Search the codebase

```bash
# Search for keywords in code
rg "KEYWORD" --type ts

# Search in specific directories
rg "KEYWORD" packages/editor/src
rg "KEYWORD" packages/tldraw/src

# Search for function/class definitions
rg "function FUNCTION_NAME|class CLASS_NAME" --type ts
```

### Check git history

```bash
# Search commit messages for keywords
git log --oneline --grep="KEYWORD" --since="2024-01-01"

# Search for changes to specific code patterns
git log -p --all -S "CODE_PATTERN" --since="2024-01-01" -- "*.ts" "*.tsx"

# Find commits that modified a specific file
git log --oneline -- path/to/file.ts

# Show recent commits in a directory
git log --oneline -20 -- packages/editor/src/
```

### Search for related issues and PRs

```bash
# Search open issues by keyword
gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state open --limit 20

# Search closed issues by keyword
gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state closed --limit 20

# Search merged PRs by keyword
gh pr list --repo tldraw/tldraw --search "KEYWORDS" --state merged --limit 20
```

### Create a GitHub issue

```bash
# Create issue for a bug that still exists
gh issue create --repo tldraw/tldraw --type "Bug" --title "[description in sentence case]" --body "$(cat <<'EOF'
## Description
[What the bug is]

## Expected behavior
[What should happen]

## Code location
[File paths and line numbers if found]

## Source
From Release QA project: [DATE]
EOF
)"
```

### Mark items in the file

```bash
# Find all unticked items
grep -n "^\- \[ \]" ./release-project-items.md

# Count remaining items
grep -c "^\- \[ \]" ./release-project-items.md

# Count completed items
grep -c "^\- \[x\]" ./release-project-items.md
```

### View file changes over time

```bash
# See when a file was last modified
git log -1 --format="%ai %s" -- path/to/file.ts

# Compare file between dates
git diff $(git rev-list -1 --before="2024-06-01" main)..HEAD -- path/to/file.ts

# Find who last modified specific code
git blame path/to/file.ts | grep "PATTERN"
```
