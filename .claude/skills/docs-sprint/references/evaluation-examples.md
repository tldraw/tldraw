# Evaluation examples

Reference examples showing how to evaluate and score documentation.

Evaluations are stored in `assets/evaluations.json`, not in document frontmatter. This keeps published docs clean and provides a single source of truth for all scores.

## Example evaluation: signals.mdx

This document scored well across all dimensions:

```json
"sdk-features/signals.mdx": {
  "readability": 9,
  "voice": 9,
  "completeness": 9,
  "accuracy": 8,
  "evaluated_at": "01/07/2026",
  "notes": "Excellent coverage with improved debugging examples showing console output. isComputed listed in API table but not exported from @tldraw/state. Good use of unsafe__withoutCapture section.",
  "evaluator_notes": null
}
```

**Why it scored well**:

- Clear section progression from basic concepts to advanced usage
- Code examples are minimal and illustrative
- API reference table at the end
- Links to related examples
- One accuracy issue noted for follow-up

## Example evaluation: tools.mdx

```json
"sdk-features/tools.mdx": {
  "readability": 8,
  "voice": 8,
  "completeness": 9,
  "accuracy": 8,
  "evaluated_at": "01/07/2026",
  "notes": "Well-structured with good code examples. StateNode properties table helpful. Dynamic tool registration example is accurate. Minor inconsistency at line 56 about custom root state vs tools prop.",
  "evaluator_notes": null
}
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

When any score is below 8, identify fixes in the `notes` field:

```
PRIORITY_FIXES:
1. Fix broken code example at line 45
2. Remove hedging language in overview
3. Add link to related example
```

## Evaluation JSON schema

Write evaluations to `assets/evaluations.json`:

```json
{
	"sdk-features/feature-name.mdx": {
		"readability": 8,
		"voice": 7,
		"completeness": 9,
		"accuracy": 8,
		"evaluated_at": "01/07/2026",
		"notes": "Agent assessment. What works, what needs improvement. Include PRIORITY_FIXES if any score < 8.",
		"evaluator_notes": "Human reviewer comments (optional, added manually)."
	}
}
```

**Fields**:

- `readability`, `voice`, `completeness`, `accuracy` — Scores 0-10
- `evaluated_at` — Date of evaluation (MM/DD/YYYY)
- `notes` — Agent's assessment from the evaluation
- `evaluator_notes` — Human reviewer notes (null until manually added)
