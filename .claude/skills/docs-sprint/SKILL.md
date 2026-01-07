---
name: docs-sprint
description: Autonomous loop for evaluating and improving SDK documentation. Runs iteratively until all articles meet quality threshold.
---

# Docs sprint

An autonomous Ralph-style loop for systematically improving SDK documentation.

## Quick start

**Run the loop manually:**

```bash
while :; do
  cat .claude/skills/docs-sprint/prompt.md | claude --continue
done
```

**Or use the ralph-wiggum plugin:**

```bash
/ralph-loop "$(cat .claude/skills/docs-sprint/prompt.md)" --completion-promise "DOCS_COMPLETE" --max-iterations 100
```

## How it works

The loop evaluates and improves documentation articles one at a time:

1. **Evaluate** - Score article on readability, voice, completeness, accuracy
2. **Improve** - If any score < threshold, make targeted improvements
3. **Re-evaluate** - Check if improvements raised scores
4. **Repeat** - Continue until article passes, then move to next
5. **Complete** - When all articles pass, output `<promise>DOCS_COMPLETE</promise>`

## Configuration

Edit `assets/config.json`:

```json
{
	"threshold": 8,
	"articles": ["sdk-features/actions.mdx"]
}
```

- `threshold` - Minimum score for ALL dimensions (default: 8)
- `articles` - Specific articles to process (empty = all in evaluations.json)

## State files

| File                      | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `prompt.md`               | Agent instructions (fed each iteration) |
| `assets/config.json`      | Threshold and article filter            |
| `assets/evaluations.json` | Scores and status per article           |
| `assets/progress.txt`     | Learning log (optional)                 |

## Scoring

Each article is scored on 4 dimensions (0-10):

- **readability** - Clear writing, logical flow, scannable structure
- **voice** - Matches tldraw style (see write-docs skill)
- **completeness** - Covers key concepts appropriately
- **accuracy** - Code works, APIs correct

An article passes when ALL scores >= threshold.

## Adding articles

Add to `assets/evaluations.json`:

```json
{
	"sdk-features/new-article.mdx": { "status": null }
}
```

## Completion

The loop stops when:

- All articles have `status: "passing"` in evaluations.json
- Agent outputs `<promise>DOCS_COMPLETE</promise>`
- Max iterations reached (if using ralph-wiggum plugin)
