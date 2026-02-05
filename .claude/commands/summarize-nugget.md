---
name: summarize-nugget
description: Generate a bullet-point summary of a nugget from raw notes. Use this to quickly outline key points before writing a full draft.
---

# Summarizing nuggets

This command creates a concise bullet-point summary from raw notes.

## Before writing

1. Read the raw notes (`{topic}-raw.md`) thoroughly
2. Identify the core problem, solution, and key insights

## Output format

Generate a markdown file with this structure:

```markdown
---
title: {Topic} - Summary
created_at: {date}
---

# {Topic}

## The problem

- [1-2 bullets describing what goes wrong or what's hard]

## The solution

- [2-4 bullets describing the approach]

## Key insight

- [1-2 bullets capturing the "aha" moment]

## Implementation notes

- [3-5 bullets with specific details: files, values, code patterns]

## Why this matters

- [1-2 bullets on user-facing impact]
```

## Guidelines

- Each bullet should be a single sentence
- Lead with the most important information
- Include specific values (e.g., "150ms delay" not "short delay")
- Reference file paths where relevant
- Skip sections that don't apply to the topic

## Output

Save the summary as `{topic}-summary.md` in the nugget folder.
