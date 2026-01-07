Check the status of the current documentation sprint.

## Overview

This command shows the progress of the docs sprint without modifying anything.

## Output

Read the sprint files and report:

```
## Docs sprint status

**Branch**: [current branch]
**Project**: [from prd.json]
**Articles**: X total

### Story progress

| Story    | Done | Remaining | Blocked |
|----------|------|-----------|---------|
| evaluate | 2    | 1         | 0       |
| improve  | 1    | 1         | 1       |
| update   | 0    | 0         | 3       |

### Article status matrix

| Article      | evaluate | improve | update |
|--------------|----------|---------|--------|
| actions.mdx  | ✓        | ✓       | -      |
| groups.mdx   | ✓        | pending | -      |
| bindings.mdx | pending  | blocked | -      |

### Next work item
**Story**: evaluate | **Article**: bindings.mdx

### Recent learnings (from progress.txt)
- [Last 2-3 learnings logged]

### Document scores

| Article      | Read | Voice | Comp | Acc | Total |
|--------------|------|-------|------|-----|-------|
| actions.mdx  | 8    | 7     | 8    | 9   | 32    |
| groups.mdx   | 8    | 8     | 9    | 8   | 33    |
| bindings.mdx | -    | -     | -    | -   | -     |

Run `/docs-loop` to continue the sprint.
```

## Implementation

1. Read `scripts/docs-sprint/prd.json`
2. Build the article × story matrix from status objects
3. Count completed/pending/blocked per story
4. Identify next eligible work item (respecting dependencies)
5. Read `scripts/docs-sprint/progress.txt` for recent learnings
6. Scan sdk-features frontmatter for current scores
7. Present summary

## Notes

- This is a read-only operation
- Useful for checking progress before continuing work
- Shows which tasks are blocked by dependencies
