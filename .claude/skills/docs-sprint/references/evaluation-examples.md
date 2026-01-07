# Evaluation examples

Reference examples showing how to evaluate and score documentation.

## Example evaluation: signals.mdx

This document scored well across all dimensions:

```yaml
readability: 9
voice: 9
completeness: 9
accuracy: 8
notes: 'Excellent coverage with improved debugging examples showing console output. isComputed listed in API table but not exported from @tldraw/state. Good use of unsafe__withoutCapture section.'
```

**Why it scored well**:
- Clear section progression from basic concepts to advanced usage
- Code examples are minimal and illustrative
- API reference table at the end
- Links to related examples
- One accuracy issue noted for follow-up

## Example evaluation: tools.mdx

```yaml
readability: 8
voice: 8
completeness: 9
accuracy: 8
notes: 'Well-structured with good code examples. StateNode properties table helpful. Dynamic tool registration example is accurate. Minor inconsistency at line 56 about custom root state vs tools prop.'
```

**What kept it from 9+**:
- Minor voice issues (some hedging)
- One inconsistency flagged for accuracy

## Scoring breakdown

### Readability

**9-10**: Flows naturally, scannable, perfect structure
```markdown
// Good: Clear, direct
Groups are logical containers that combine shapes into a single unit.
Unlike frames, groups have no visual representation.

// Below standard: Wordy, unclear
Groups can be described as a type of container mechanism that is used
to logically combine multiple shapes together into what becomes a
single unit that can be selected.
```

**7-8**: Generally clear, minor flow issues
**5-6**: Confusing sections, poor organization

### Voice

**9-10**: Perfect tldraw voice, no AI tells
```markdown
// Good: Direct, code-first
Need to group shapes? Use `editor.groupShapes()`:

// AI tell: Hollow importance claim
Grouping plays a crucial role in organizing shapes effectively.
```

**7-8**: Mostly good, occasional hedging
**5-6**: Frequent AI patterns, promotional language

### Completeness

**9-10**: Comprehensive coverage, good examples, links to more
```markdown
// Good: Shows the key concepts, links to examples
## Related examples

- **[Custom tools](link)** - Creating a custom drawing tool
```

**7-8**: Covers basics, missing some advanced topics
**5-6**: Major gaps, no examples

### Accuracy

**9-10**: All code works, APIs verified against source
```markdown
// Verify against actual source
// packages/editor/src/lib/editor/Editor.ts:1234
groupShapes(shapes: TLShape[] | TLShapeId[]): this
```

**7-8**: Mostly accurate, minor discrepancies
**5-6**: Outdated APIs, broken code snippets

## Priority fixes format

When any score is below 8, identify fixes:

```
PRIORITY_FIXES:

1. [Most impactful fix] - e.g., "Fix broken code example at line 45"
2. [Second priority] - e.g., "Remove hedging language in overview"
3. [Third priority] - e.g., "Add link to related example"
```

## Frontmatter format

Always write scores and notes to frontmatter:

```yaml
---
title: Feature name
created_at: MM/DD/YYYY
updated_at: MM/DD/YYYY
keywords:
  - keyword1
status: published
date: MM/DD/YYYY
readability: 8
voice: 7
completeness: 9
accuracy: 8
notes: 'Brief assessment. What works, what needs improvement. Max 120 words.'
---
```
