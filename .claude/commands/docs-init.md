Initialize or reset a documentation sprint.

## Overview

This command sets up the docs sprint system for autonomous documentation work. It creates or updates task definitions based on what you want to accomplish.

## Usage

```
/docs-init [scope]
```

**Scopes**:
- `evaluate-all` - Create tasks to evaluate all sdk-features docs without scores
- `improve-low` - Create tasks to improve docs with any score below 8
- `custom` - Interactive: specify which docs and what to do

## Process

### Step 1: Determine scope

If no argument provided, ask the user what they want to accomplish:
- Evaluate docs that haven't been scored
- Improve docs below a certain quality threshold
- Write new documentation on specific topics
- Update docs based on recent code changes
- Apply style guide updates

### Step 2: Scan current state

Read the sdk-features docs to understand current status:

```bash
# Find docs without scores
grep -L "^readability:" apps/docs/content/sdk-features/*.mdx

# Find docs with low scores
grep -l "readability: [0-7]" apps/docs/content/sdk-features/*.mdx
```

### Step 3: Generate task structure

Create `scripts/docs-sprint/prd.json` with the matrix structure:

```json
{
  "articles": ["sdk-features/actions.mdx", "sdk-features/groups.mdx"],
  "stories": [
    {
      "id": "evaluate",
      "priority": 1,
      "status": {
        "sdk-features/actions.mdx": false,
        "sdk-features/groups.mdx": false
      }
    },
    {
      "id": "improve",
      "priority": 2,
      "depends_on": "evaluate",
      "status": {
        "sdk-features/actions.mdx": false,
        "sdk-features/groups.mdx": false
      }
    }
  ]
}
```

- **For evaluate scope**: Add all unscored docs to `articles`, create evaluate story with all false
- **For improve scope**: Add low-scoring docs, create evaluate + improve stories
- **For custom scope**: Build based on user input

### Step 4: Initialize progress file

Reset or create `scripts/docs-sprint/progress.txt` with fresh header.

### Step 5: Create branch

```bash
git checkout -b docs/sprint-[date]
```

### Step 6: Report

Output a summary:
```
## Docs sprint initialized

**Branch**: docs/sprint-001
**Total tasks**: X
- Evaluate: X
- Improve: X
- Write: X
- Update: X

**First task**: [STORY-ID] - [Title]

Run `/docs-loop` to begin.
```

## Task Priority Guidelines

1. Evaluate tasks before improve tasks (need scores first)
2. Core docs first (editor, shapes, tools, store)
3. Frequently used features before edge cases
4. Dependencies honored (improve after evaluate)

## Adding articles to an existing sprint

To add a new article to an ongoing sprint:

1. Add the article path to the `articles` array
2. Add `"path": false` to each story's `status` object

Example:
```bash
# Add sdk-features/new-doc.mdx to an existing sprint
```

The loop will automatically pick up the new article.

## Notes

- Running `/docs-init` resets the sprint - in-progress work is preserved in git history
- The prd.json file is the source of truth for remaining work
- Progress.txt accumulates learnings across all sprints
- Adding articles is additive - just extend the arrays/objects
