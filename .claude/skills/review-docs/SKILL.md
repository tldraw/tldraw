---
name: review-docs
description: Review and improve documentation with parallel evaluation and iterative improvement loop.
argument-hint: <path to document>
model: opus
disable-model-invocation: true
---

# Review documentation

This skill runs an evaluation and improvement loop on a documentation file.

**Target**: $ARGUMENTS

**Relevant skills**: `write-docs`

## Workflow overview

```
┌──────────────────────────────────────────────────────────────┐
│  EVALUATE (parallel)                                         │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │ Style Agent         │    │ Content Agent               │  │
│  │ (readability+voice) │    │ (completeness+accuracy)     │  │
│  └─────────────────────┘    └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  SUMMARIZE: Present findings, ask user for next step         │
└──────────────────────────────────────────────────────────────┘
                              ↓
           ┌──────────────────┴──────────────────┐
           ↓                                     ↓
    [User: improve]                       [User: done]
           ↓                                     ↓
┌──────────────────────┐                      EXIT
│  IMPROVE             │
│  Improvement Agent   │
│  (apply fixes)       │
└──────────────────────┘
           ↓
        LOOP → back to EVALUATE
```

## Step 1: Parallel evaluation

Launch two subagents **in parallel** using the Task tool. Both calls must be in a single message to run concurrently:

```
// Single message with two Task tool calls:
Task(subagent_type="general-purpose", model="opus", prompt="Style evaluation...")
Task(subagent_type="general-purpose", model="opus", prompt="Content evaluation...")
```

### Style agent prompt

Use this exact prompt, substituting `$ARGUMENTS` for the file path:

```
Evaluate documentation style for: $ARGUMENTS

Read these files:
1. .claude/skills/shared/writing-guide.md
2. .claude/skills/shared/docs-guide.md
3. $ARGUMENTS

Score these dimensions (0-10):

READABILITY - How clear and easy to understand is the writing?
- Clear, direct sentences
- Logical flow between sections
- Appropriate use of code snippets and links
- No unnecessary jargon

VOICE - How well does it follow the writing guide?
- Confident assertions (no hedging)
- Active voice, present tense
- No AI writing tells (hollow importance, trailing gerunds, formulaic transitions)
- Appropriate tone (expert-to-developer)
- Sentence case headings

Return in this exact format:

STYLE REPORT: [filename]

READABILITY: [score]/10
- [specific issue or strength]
- [specific issue or strength]

VOICE: [score]/10
- [specific issue or strength]
- [specific issue or strength]

PRIORITY FIXES:
1. [Most important style issue]
2. [Second most important]
3. [Third most important]
```

### Content agent prompt

Use this exact prompt, substituting `$ARGUMENTS` for the file path:

```
Evaluate documentation content for: $ARGUMENTS

Read $ARGUMENTS, then verify claims against the source code in packages/editor/ and packages/tldraw/.

Score these dimensions (0-10):

COMPLETENESS - How thorough is the coverage?
- Overview establishes purpose before mechanism
- Key concepts explained with enough depth
- Illustrative code snippets where needed
- Links to relevant examples in apps/examples (if applicable)

ACCURACY - Is the technical content correct?
- Code snippets are syntactically correct and use valid APIs
- API references match actual implementation
- Described behavior matches the code
- No outdated information

For accuracy issues, include file:line references to the source code.

Return in this exact format:

CONTENT REPORT: [filename]

COMPLETENESS: [score]/10
- [specific issue or strength]
- [specific issue or strength]

ACCURACY: [score]/10
- [specific issue with file:line reference if inaccurate]
- [specific issue or strength]

PRIORITY FIXES:
1. [Most important content issue]
2. [Second most important]
3. [Third most important]
4. ...
```

Include as many priority fixes as needed. Accuracy issues are always important: make sure that all accuracy issues are flagged.

## Step 2: Summarize and prompt user

After both agents return, synthesize their reports into a summary:

```markdown
## Evaluation: [filename]

| Dimension    | Score | Key issue   |
| ------------ | ----- | ----------- |
| Readability  | X/10  | [one-liner] |
| Voice        | X/10  | [one-liner] |
| Completeness | X/10  | [one-liner] |
| Accuracy     | X/10  | [one-liner] |
| **Total**    | X/40  |             |

### Priority fixes

1. [Combined priority 1 from both reports]
2. [Combined priority 2]
3. [Combined priority 3]
4. [Combined priority 4]
5. [Combined priority 5]
6. ...
```

Then ask the user using AskUserQuestion:

- **Improve**: Make improvements based on findings, then re-evaluate
- **Done**: Exit the loop

## Step 3: Improve (if user chooses)

Launch a single improvement agent using the Task tool:

```
Task(subagent_type="general-purpose", model="opus", prompt="Improve documentation...")
```

### Improvement agent prompt

Use this prompt, substituting the file path and pasting the evaluation reports:

```
Improve documentation based on evaluation findings: $ARGUMENTS

STYLE REPORT:
[paste the full style report from the style agent]

CONTENT REPORT:
[paste the full content report from the content agent]

Instructions:
1. Read .claude/skills/shared/writing-guide.md
2. Read .claude/skills/shared/docs-guide.md
3. Read $ARGUMENTS
4. For accuracy fixes, read the relevant source code
5. Apply fixes in priority order
6. Run prettier: yarn prettier --write $ARGUMENTS

DO NOT:
- Over-explain or add unnecessary sections
- Add features the document doesn't need
- Change accurate content unnecessarily

Return a brief summary of changes made.
```

## Step 4: Loop

After improvement completes, **return to Step 1** with fresh evaluation agents.

Continue the loop until the user chooses "Done" or scores reach acceptable levels (32/40 or higher).

## Notes

- Each evaluation round uses fresh subagents for unbiased scoring
- Style and content evaluations run in parallel for efficiency
- The improvement agent receives both reports to make informed fixes
- Multiple iterations may be needed for significant improvements
