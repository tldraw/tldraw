---
title: Evaluating nuggets
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - EVALUATE
---

# Evaluating nuggets

This guide explains how to evaluate a nugget draft and record scores in its frontmatter.

## Scoring criteria

Each draft is scored on four dimensions (0-10):

### Readability

How clear and easy to understand is the writing?

**9-10**: Clear opening that grounds the reader. Smooth transitions. Technical terms explained or linked. Code examples clarify rather than overwhelm.

**7-8**: Generally clear with minor rough spots. Some transitions could be smoother.

**5-6**: Understandable but requires effort. Some sections confusing or poorly organized.

**Below 5**: Hard to follow. Major clarity issues.

### Voice

Does it sound like tldraw? Check [VOICE.md](./VOICE.md) for the full guide.

**9-10**: Opens with our experience ("When we added...", "We wanted..."). Uses "we" for tldraw decisions, "you" for the reader. No AI tells.

**7-8**: Mostly good voice with minor issues. Perhaps one or two AI tells or slightly awkward phrasing.

**5-6**: Noticeable AI patterns. Hollow importance claims, trailing gerunds, or formulaic transitions.

**Below 5**: Reads like AI-generated content. Multiple obvious tells.

AI tells to check for:
- Hollow importance claims ("serves as a testament", "plays a crucial role")
- Trailing gerund phrases ("...ensuring optimal performance")
- Formulaic transitions ("Moreover," "Furthermore," "It's important to note")
- Rule-of-three lists where the count isn't actually three
- Promotional language ("robust," "seamless," "empowers")
- Em dash overuse
- Bullet points with bolded headers (ChatGPT signature)

### Potential

How well would this do on a technical blog or Hacker News?

**9-10**: Genuine insight developers can apply elsewhere. Problem harder than it looks. Decision that challenges conventional wisdom. Would generate interesting discussion.

**7-8**: Solid technical content. Interesting to developers working on similar problems.

**5-6**: Useful but narrow. Mainly interesting to tldraw contributors.

**Below 5**: Implementation details without broader insight.

### Accuracy

Is the story true to the source code and documentation?

**9-10**: Technical claims verified against source. Code examples match actual implementation. Tradeoffs honestly represented. Key files point to correct locations.

**7-8**: Mostly accurate with minor imprecisions.

**5-6**: Some claims don't match the source code or are misleading.

**Below 5**: Significant factual errors.

## Evaluation process

1. Read the draft thoroughly
2. Read [VOICE.md](./VOICE.md) to calibrate on voice criteria
3. Read [index.md](./index.md) to check structure
4. Read source files mentioned in the draft's "Key files" section to verify accuracy
5. Score each dimension
6. Write brief notes explaining the scores

## Recording scores

Update the draft's frontmatter with scores and notes:

```yaml
---
title: Arc arrows
created_at: 12/20/2024
updated_at: 12/21/2024
keywords:
  - arrows
  - arcs
  - bezier
readability: 9
voice: 9
potential: 8
accuracy: 10
notes: "Strong opening with bezier failure mode. Uses 'we' appropriately. No AI tells."
---
```

Notes should be brief (1-2 sentences) identifying:
- Key strengths
- Specific issues to fix (if any)
- Any accuracy concerns found when checking source files

## What to verify for accuracy

- Do code examples match the actual implementation?
- Are file paths in "Key files" correct?
- Do technical claims match what the code actually does?
- Are tradeoffs and limitations honestly represented?
- If the nugget says "we do X because Y", does the source confirm this?

## Next steps

If scores are below 8 in any dimension, the draft should be improved using [IMPROVE.md](./IMPROVE.md).

Drafts scoring 8+ across all dimensions are ready for final review.
