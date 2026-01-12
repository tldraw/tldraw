---
description: Trace git history of code for a nugget topic. Creates a {topic}-history.md file documenting how the code evolved over time.
argument-hint: <topic-name>
allowed-tools: Bash(git:*), Read, Write, Glob, Grep
---

# Trace nugget code history

This command creates a history file documenting how the **code** for a nugget topic evolved through git commits.

## Context

- Topic: $ARGUMENTS
- Nugget folder: `documentation/nuggets/$ARGUMENTS/`

## Purpose

The history file captures how the actual implementation evolved over time, showing:

- When major features or rewrites happened
- What bugs were fixed and why
- Key architectural decisions and their motivations
- The problems that drove each change

This is useful for:

- Understanding *why* the code works the way it does
- Providing historical context for the nugget article
- Identifying interesting stories about bugs, rewrites, or design decisions
- Complementing the raw notes (current implementation) with evolution context

## Input

The nugget topic name (e.g., `hit-testing`, `back-to-content`).

The nugget folder should exist at `documentation/nuggets/{topic}/`.

## Process

1. **Read the raw notes** at `documentation/nuggets/{topic}/{topic}-raw.md` to understand what code files and concepts are involved

2. **Search git history** for relevant commits:
   ```bash
   # Search for commits mentioning key functions/classes
   git log --oneline --all -S "functionName" -- "*.ts"

   # Search for commits in relevant files
   git log --oneline --follow -- packages/editor/src/lib/relevant/file.ts
   ```

3. **For significant commits**, get details:
   ```bash
   git log --format="%H|%ad|%s" --date=short {hash} -1
   git log --format="%B" -1 {hash}  # Full commit message
   ```

4. **Identify meaningful changes**:
   - Major rewrites or new implementations
   - Bug fixes that reveal edge cases
   - Performance optimizations
   - API changes
   - Skip minor refactors, formatting, or unrelated changes

5. **Document the evolution** chronologically with context from commit messages

## Output format

Create `documentation/nuggets/{topic}/{topic}-history.md` with this structure:

```markdown
---
title: {Topic name} - code history
created_at: {date}
updated_at: {date}
keywords:
  - history
  - {topic keywords}
status: reference
---

# {Topic name} - code history

This document traces the evolution of tldraw's {topic} implementation through its git history.

## Timeline

### {YYYY-MM-DD} - {Brief description}
Commit: {short-hash} ({PR title or commit message})

**What changed:**
- {Key changes}

**Why this mattered:**
{Context from commit message or code analysis}

**Code example (if relevant):**
```typescript
// Relevant snippet
```

---

### {YYYY-MM-DD} - {Next significant change}
...continue for each significant commit...

---

## Key architectural decisions

### {Decision name}
{Explanation of the design choice and its implications}

---

## Problems solved along the way

| Date | Problem | Solution |
|------|---------|----------|
| {date} | {problem description} | {how it was fixed} |

---

## Source files

- {Description}: `{file path}`
```

## Task

For the topic `$ARGUMENTS`:

1. Read the raw notes to understand what code is involved
2. Search git history for relevant commits affecting that code
3. Identify 5-15 significant commits that show meaningful evolution
4. Create `documentation/nuggets/$ARGUMENTS/$ARGUMENTS-history.md`

## Notes

- Focus on *code* evolution, not nugget draft evolution
- Prioritize commits with good commit messages that explain *why*
- Include code snippets when they illustrate key changes
- The history complements the raw file: raw = current state, history = how we got here
- Look for PR descriptions which often have more context than commit messages
