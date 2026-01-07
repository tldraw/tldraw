Run the autonomous documentation improvement loop.

## Overview

This command runs an iterative loop that works through documentation tasks defined in `scripts/docs-sprint/prd.json`. Each iteration evaluates, improves, or writes documentation, commits progress, and moves to the next task.

## Before Running

Ensure the docs sprint is initialized:
- `scripts/docs-sprint/prd.json` exists with tasks
- `scripts/docs-sprint/progress.txt` exists
- Tasks are defined with `passes: false`

## The Loop

### Step 1: Read context

```bash
cat scripts/docs-sprint/progress.txt
cat scripts/docs-sprint/prd.json
```

Check accumulated learnings and find the next work item:
1. **Read all files in `required_reading` array** - These contain essential guidelines (e.g., the write-docs voice guide)
2. Look at stories in priority order
3. For each story, find an article where `status[article] = false`
4. If the story has `depends_on`, check that the dependency story has `status[article] = true` for the same article
5. Work on the first eligible (story, article) pair

### Step 2: Execute the task

Based on the task `type`:

**evaluate**: Score the document on readability, voice, completeness, accuracy. Write scores to frontmatter.

**improve**: Address evaluation notes, improve lowest scores, re-evaluate after.

**write**: Create new documentation after researching the codebase.

**update**: Update doc to reflect recent code changes.

**apply-style**: Fix style guide violations across documents.

For each task:
1. Read `scripts/docs-sprint/prompt.md` for detailed instructions
2. Follow the workflow for that task type
3. Verify accuracy against actual source code
4. Run `yarn prettier --write [file]` after editing

### Step 3: Commit

```bash
git add -A
git commit -m "docs([article]): [story] - [brief description]

🤖 Generated with Claude Code"
```

Example: `docs(actions): evaluate - scored 8/8/9/8`

### Step 4: Update progress

1. Edit `prd.json`: Set `stories[story].status[article]` to `true`
2. Append to `progress.txt` with this format:

```markdown
## [DATE] - [STORY-ID]: [Title]
- **Document**: [path]
- **Action**: [evaluated/improved/written/updated]
- **Scores**: [before] → [after] (if applicable)
- **Changes made**:
  - [Change 1]
  - [Change 2]
- **Learnings**:
  - [Pattern discovered]
---
```

### Step 5: Continue or complete

- If there are more incomplete (story, article) pairs, continue to the next iteration
- If ALL articles in ALL stories have `status: true`, output: `<promise>DOCS_SPRINT_COMPLETE</promise>`

## Arguments

- `$ARGUMENTS` can specify:
  - A maximum number of iterations (e.g., `3` to do only 3 tasks)
  - A specific story ID to work on (e.g., `EVAL-001`)

## Notes

- Each iteration runs in the same context window
- Progress persists through `prd.json` and `progress.txt`
- If you hit context limits, the next `/docs-loop` will continue where you left off
- Quality over speed - verify code snippets against actual APIs
