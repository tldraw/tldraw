---
name: generate-nugget
description: Generate a nugget draft from raw notes. Use this when creating a new draft in documentation/nuggets/.
---

# Generating nuggets

This command creates a nugget draft from raw notes.

## Input files

Each nugget lives in a folder (e.g., `documentation/nuggets/arc-arrows/`) containing:

- `{topic}-raw.md` — Raw notes, research, code snippets, and source material
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

## Two-step process

### Step 1: Create the research document

If `{topic}-raw.md` doesn't exist, create it first. This document should contain comprehensive research that future generate-nugget or improve-nugget operations can use to quickly rebuild content.

The research document should include:

1. **Problem description** — What problem or challenge does this address? What makes it interesting or difficult?

2. **Solution overview** — What's the key insight or approach? What makes this solution work?

3. **Implementation details** — Code snippets with file paths and line numbers showing how it's implemented. Include:
   - Key algorithms and logic
   - Important functions and classes
   - Edge cases and special handling
   - Constants and configuration

4. **Architecture and patterns** — How the pieces fit together. Any notable design patterns or techniques used.

5. **Key source files** — List of files where the implementation lives, with line counts

#### Research document frontmatter

```yaml
---
title: {Topic name} - raw notes
created_at: {date}
updated_at: {date}
keywords:
  - {keyword1}
  - {keyword2}
status: draft
---
```

#### Research gathering process

1. Search the codebase for relevant files and functions
2. Read source files thoroughly to understand the implementation
3. Extract code snippets showing key logic (with file paths and line numbers)
4. Document algorithms, patterns, and tradeoffs
5. Note edge cases and special handling
6. Create a comprehensive reference that captures all technical details

The goal is to create a research document thorough enough that you or another agent could regenerate the nugget draft from scratch without re-reading source files.

#### Code snippet format

When including code snippets in the research document, use this format:

````markdown
**Description of what this code does:**
From `file-path.ts:line-start-line-end`:

\```typescript
// code here
\```
````

For example:

````markdown
**Edge blocking logic:**
From `getElbowArrowInfo.tsx:560-581`:

\```typescript
if (isWithinRange(aValue, bRange)) {
const subtracted = subtractRange(aCrossRange, bCrossRange)
// ...
}
\```
````

This format makes it easy to:

- Locate the code in the actual source files
- Understand what the code does
- Verify accuracy during evaluation

### Step 2: Generate the draft

Read the raw notes and produce the next numbered draft.

## Before writing

1. Read the raw notes thoroughly
2. Read [write-nuggets.md](./write-nuggets.md) for voice and structure guidelines
3. Read source files mentioned in the raw notes to verify accuracy

## Writing the draft

### Required frontmatter

Every draft must have frontmatter:

```yaml
---
title: Arc arrows
created_at: 12/20/2024
updated_at: 12/21/2024
keywords:
  - arrows
  - arcs
  - bezier
---
```

### Structure

Follow the structure from write-nuggets.md:

1. **Frame the problem** — What's this about? What problem did we encounter? Why was it hard or interesting?
2. **Show the insight** — What's the key idea that makes the solution work?
3. **Walk through the implementation** — Code and explanation, building up complexity
4. **Wrap up** — Tradeoffs, where this lives in the codebase, links to files

### Voice checklist

- Open with our experience ("When we added...", "We wanted...")
- Use "we" for tldraw decisions, "you" for the reader
- No hollow importance claims ("serves as a testament", "plays a crucial role")
- No trailing gerund phrases ("...ensuring optimal performance")
- No formulaic transitions ("Moreover," "Furthermore,")
- No rule-of-three lists unless the count is actually three
- No promotional language ("robust," "seamless," "empowers")
- Em dashes used sparingly

### What to avoid

- Announcing insights ("The key insight is...")
- Formulaic section headers ("**The tradeoff:**", "**The result:**")
- Forced broader applicability sections
- Conclusions that just summarize

## Output

Save the draft as the next numbered file (e.g., if `arc-arrows-2.md` exists, create `arc-arrows-3.md`).

The draft is ready for evaluation using the evaluate-nugget skill.
