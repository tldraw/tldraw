---
name: improve-nugget
description: Improve a nugget draft based on its evaluation scores. Use this when a draft has scores below 8 in any dimension.
---

# Improving nuggets

This skill improves a nugget draft based on its evaluation scores.

## When to improve

Improve a draft when any score is below 8. Read the frontmatter to see current scores and notes:

```yaml
readability: 7
voice: 6
potential: 8
accuracy: 10
notes: 'Bolded section labels feel ChatGPT-ish. Opening could be punchier.'
```

## Before improving

1. Read the current draft and its frontmatter notes
2. Read [write-nuggets.md](./write-nuggets.md) for voice and structure guidelines
3. Read source files to verify any accuracy concerns

## Fixing common issues

### Low readability (< 8)

**Weak opening**: The first paragraph should ground the reader in a concrete problem or scenario. Don't start with abstract claims or definitions.

Before:

> Arc arrows are a fundamental component of tldraw's arrow system that provides stable curvature.

After:

> Draw an arrow with a gentle curve between two rectangles. Now drag one rectangle across the canvas. What should happen to the curve?

**Poor flow**: Each paragraph should connect to the next. If you're jumping between topics, add a transitional sentence or reorder sections.

**Dense code blocks**: If code dominates a section, add prose that explains what to look for. Don't just show code and expect the reader to parse it.

### Low voice (< 8)

**Wrong opening pattern**: Nuggets should open with our experience, not definitions.

Before:

> Circular arcs provide stable curvature for connected shapes.

After:

> When we added curved arrows to tldraw, we wanted them to stay stable as shapes moved.

**AI tells to remove**:

| Pattern                            | Fix                             |
| ---------------------------------- | ------------------------------- |
| "serves as a testament to"         | Delete or rewrite concretely    |
| "plays a crucial role"             | Just say what it does           |
| "Moreover," / "Furthermore,"       | Delete or use "And," / "But,"   |
| "ensuring optimal performance"     | Delete trailing gerund          |
| "robust," "seamless," "empowers"   | Use plain language              |
| Bullet lists with **bold headers** | Convert to prose or plain table |

**Wrong pronouns**: Use "we" for tldraw decisions, "you" for the reader. Don't use "I" or passive voice that hides the actor.

### Low potential (< 8)

**No genuine insight**: The article documents implementation but doesn't reveal something surprising or applicable elsewhere. Ask: what would a developer outside tldraw learn from this?

**Obvious solution**: If the solution is what anyone would try first, there's no story. Find the part where the obvious approach failed, or explain why the constraints made this harder than expected.

**Too narrow**: Some articles are inherently niche. Consider whether there's a broader pattern worth highlighting, but don't force it—a strained "broader applicability" section is worse than none.

### Low accuracy (< 8)

**Code doesn't match**: Verify code examples against actual source files. Update examples to reflect current implementation.

**Wrong file paths**: Check that "Key files" links point to files that exist and contain the relevant code.

**Misleading claims**: If the article says "we do X because Y" but the source tells a different story, fix it. Be honest about tradeoffs and limitations.

## Output

Save the improved draft as the next numbered file (e.g., if improving `arc-arrows-2.md`, create `arc-arrows-3.md`).

The improved draft should then be evaluated fresh using the evaluate-nugget skill. Use a separate evaluation pass—don't self-evaluate immediately after improving.

## Improvement cycle

```
Draft → Evaluate → Improve → New Draft → Evaluate → ...
```

Continue until all scores reach 8+. Each draft is preserved so you can compare versions and see what changed.
