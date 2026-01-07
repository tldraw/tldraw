---
name: docs-sprint
description: Autonomous agent for evaluating and improving SDK documentation. Runs iteratively through task lists, tracking progress across sessions. Use for batch documentation work.
---

# Docs sprint agent

An autonomous loop for systematically improving SDK documentation quality.

## Overview

The docs sprint system enables batch documentation work through an iterative agent pattern. Tasks are defined in `scripts/docs-sprint/prd.json`, learnings persist in `scripts/docs-sprint/progress.txt`, and the agent works through tasks methodically, committing after each one.

## Core workflow

```
┌──────────────────────────────────────────────────────────┐
│                    ITERATION CYCLE                       │
├──────────────────────────────────────────────────────────┤
│  1. Read progress.txt  → Get accumulated learnings       │
│  2. Read prd.json      → Find next (story, article) pair │
│  3. Execute task       → Evaluate, improve, or write     │
│  4. Commit changes     → Preserve work in git            │
│  5. Update status      → Set status[article] = true      │
│  6. Repeat or complete → Continue until all done         │
└──────────────────────────────────────────────────────────┘
```

## Task structure

The prd.json uses a matrix: stories × articles. Each story tracks status per article.

```json
{
  "articles": ["sdk-features/actions.mdx", "sdk-features/groups.mdx"],
  "stories": [
    {
      "id": "evaluate",
      "priority": 1,
      "status": { "sdk-features/actions.mdx": false, "sdk-features/groups.mdx": true }
    },
    {
      "id": "improve",
      "priority": 2,
      "depends_on": "evaluate",
      "status": { "sdk-features/actions.mdx": false, "sdk-features/groups.mdx": false }
    }
  ]
}
```

**Selection algorithm**:
1. Iterate stories by priority (lowest first)
2. For each story, find articles where `status[article] = false`
3. If `depends_on` exists, skip articles where the dependency still has `status[article] = false`
4. Work on the first eligible (story, article) pair

**Adding articles**: Add to `articles` array and each story's `status` object with `false`.

## Task types

### evaluate
Score a document on four dimensions and write findings to frontmatter.

**Dimensions** (0-10 each):
- **Readability**: Clear writing, logical flow, scannable structure
- **Voice**: Matches tldraw style (see `.claude/skills/write-docs/SKILL.md`)
- **Completeness**: Covers key concepts with appropriate depth
- **Accuracy**: Code works, APIs are correct, information is current

**Process**:
1. Read the document
2. Read relevant source code to verify technical claims
3. Score each dimension
4. Write scores and notes to frontmatter
5. Identify priority fixes if any score < 8

### improve
Enhance a document based on evaluation scores and notes.

**Process**:
1. Read current scores and notes from frontmatter
2. Focus on priority fixes first, then lowest scores
3. Make improvements following the voice guide
4. Verify code snippets against actual source
5. Run prettier
6. Re-evaluate (spawn fresh subagent for unbiased scoring)
7. Report before/after comparison

### write
Create new documentation from scratch.

**Process**:
1. Research thoroughly:
   - Search `packages/editor/` and `packages/tldraw/`
   - Read CONTEXT.md in relevant packages
   - Find examples in `apps/examples/`
   - Check existing docs for related content
2. Write following the voice guide
3. Include illustrative code snippets (not full examples)
4. Link to relevant examples
5. Evaluate the new document

### update
Refresh documentation to match current codebase.

**Process**:
1. Identify what changed (git log, grep for API changes)
2. Compare doc content to current implementation
3. Update outdated sections
4. Verify all code snippets still work
5. Update `updated_at` frontmatter

### apply-style
Apply style guide updates across documents.

**Process**:
1. Read current style guide
2. Scan for violations: hedging, passive voice, AI tells, Title Case
3. Fix issues while preserving accuracy
4. Run prettier

## Voice guide reference

The tldraw documentation voice is defined in `.claude/skills/write-docs/SKILL.md`. Key points:

**Characteristic patterns**:
- Direct address with "you" and "let's"
- Questions as transitions
- Jump straight to code, explain around it
- Short sentences between code blocks

**Avoid AI tells**:
- Hollow claims ("plays a crucial role")
- Trailing gerunds ("...ensuring optimal performance")
- Formulaic transitions ("Moreover,", "Furthermore,")
- Promotional language ("robust", "seamless")
- Hedging ("can be used to")

**Mechanics**:
- Sentence case headings
- Active voice, present tense
- Use contractions naturally

## File locations

**Sprint system**:
- `scripts/docs-sprint/prd.json` - Task definitions
- `scripts/docs-sprint/progress.txt` - Learnings log
- `scripts/docs-sprint/prompt.md` - Agent instructions

**Documentation**:
- `apps/docs/content/sdk-features/` - SDK feature docs
- `apps/docs/content/docs/` - Core guides

**Source code** (for verification):
- `packages/editor/src/lib/editor/Editor.ts` - Editor API
- `packages/tldraw/src/lib/shapes/` - Shape utilities
- `packages/tldraw/src/lib/tools/` - Tools

**Style guides**:
- `.claude/skills/write-docs/SKILL.md` - Voice and style
- `.claude/commands/evaluate-docs.md` - Evaluation criteria

## Scoring guidelines

| Score | Meaning |
|-------|---------|
| 10    | Exceptional - exemplary quality |
| 9     | Excellent - minor polish only |
| 8     | Good - meets standards |
| 7     | Acceptable - needs attention |
| 6     | Below standard - notable issues |
| ≤5    | Significant rewrite needed |

**Target**: All scores 8+ before marking improvement complete.

## Commands

- `/docs-init` - Initialize a new sprint with tasks
- `/docs-loop` - Run the autonomous improvement loop
- `/docs-status` - Check sprint progress

## Completion signal

When all articles in all stories have `status: true`, output:
```
<promise>DOCS_SPRINT_COMPLETE</promise>
```

## Notes

- Always verify code snippets against actual source
- Quality over speed - take time for accuracy checks
- Learnings persist in progress.txt across sessions
- Each commit preserves incremental progress
