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
│  INITIALIZE: Create state file to track issues               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  EVALUATE (parallel)                                         │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │ Style Agent         │    │ Content Agent               │  │
│  │ (readability+voice) │    │ (completeness+accuracy)     │  │
│  └─────────────────────┘    └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  UPDATE STATE: Add new issues, verify fixed issues           │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  SUMMARIZE: Present findings, ask user for next step         │
└──────────────────────────────────────────────────────────────┘
                              ↓
           ┌──────────────────┼──────────────────┐
           ↓                  ↓                  ↓
    [User: improve]   [User: complete]    [User: done]
           ↓                  ↓                  ↓
┌──────────────────┐  ┌──────────────────┐    EXIT
│  IMPROVE         │  │  COMPLETE        │
│  (fix issues)    │  │  (fix all, exit) │
└──────────────────┘  └──────────────────┘
           ↓                  ↓
  LOOP → EVALUATE          EXIT
```

## State file

Create a state file in the scratchpad directory to track all issues across rounds. This prevents re-discovering the same issues and allows verification of fixes.

**Path**: `<scratchpad>/review-<filename>.md`

**Format**:

```markdown
# Review tracker: [filename]

## Issue tracker

Status values: `pending` | `fixed` | `verified-fixed` | `not-fixed` | `wont-fix`

| ID  | Issue         | Type                        | Status         | Round | Notes            |
| --- | ------------- | --------------------------- | -------------- | ----- | ---------------- |
| 1   | [description] | Style/Accuracy/Completeness | pending        | 1     | [details]        |
| 2   | [description] | Accuracy                    | verified-fixed | 1     | Fixed in round 1 |
| 3   | [description] | Completeness                | wont-fix       | 2     | Out of scope     |

## Round history

### Round 1

- Style: X/10, Voice: X/10, Completeness: X/10, Accuracy: X/10
- **Total: X/40**
```

**Status definitions**:

- `pending`: Issue discovered, not yet addressed
- `fixed`: Improvement agent claims to have fixed it, needs verification
- `verified-fixed`: Evaluation confirmed the fix was applied correctly
- `not-fixed`: Evaluation found the fix wasn't applied correctly
- `wont-fix`: False alarm, out of scope, or intentional (e.g., completeness issues that require documentation expansion)

## Step 1: Initial evaluation

For the **first round**, launch two subagents **in parallel** using the Task tool:

```
// Single message with two Task tool calls:
Task(subagent_type="general-purpose", model="opus", prompt="Style evaluation...")
Task(subagent_type="general-purpose", model="opus", prompt="Content evaluation...")
```

### Style agent prompt (round 1)

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

Important! Include as many high-priority fixes as needed.

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
4. ...
```

### Content agent prompt (round 1)

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

Important! Include as many high-priority fixes as needed. Make sure that all accuracy issues are flagged.

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

After round 1, **create the state file** with all discovered issues.

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
- **Complete and finish**: Fix all remaining issues and exit (no re-evaluation)
- **Done**: Exit the loop without making changes

## Step 3: Triage (before improvement)

Before running the improvement agent, review the pending issues with the user. Mark completeness issues that require adding new sections as `wont-fix` - these are documentation expansion, not review fixes.

Per CLAUDE.md guidance:

> "Do what has been asked; nothing more, nothing less."
> "Don't add features, refactor code, or make 'improvements' beyond what was asked."

The review skill improves existing content. Adding new sections is a separate task.

## Step 4: Improve

Launch a single improvement agent targeting **only pending issues**:

```
Task(subagent_type="general-purpose", model="opus", prompt="Improve documentation...")
```

### Improvement agent prompt

```
Improve documentation based on specific tracked issues: $ARGUMENTS

Fix ONLY these pending issues:

| ID | Issue | Type | Notes |
|----|-------|------|-------|
[paste pending issues from state file]

Instructions:
1. Read .claude/skills/shared/writing-guide.md
2. Read .claude/skills/shared/docs-guide.md
3. Read $ARGUMENTS

4. For each accuracy fix:
   - Read the source file referenced in the notes
   - Verify the correct API/behavior from the source
   - Apply the fix based on what the source code actually shows

5. Apply style fixes

6. Run prettier: yarn prettier --write $ARGUMENTS

DO NOT:
- Add new sections
- Expand the document
- Fix issues not in the list above

Return a summary:

CHANGES MADE:

| ID | Fix applied | Verification |
|----|-------------|--------------|
| X | [description] | [source file:line checked] |
| Y | [description] | n/a |
```

After improvement, update the state file to mark issues as `fixed`.

## Step 4b: Complete and finish (alternative to Step 4)

If the user selects "Complete and finish", fix all remaining pending issues **without re-evaluating**. This is useful when the evaluation is satisfactory and the user wants to apply fixes and move on.

**Workflow**:

1. Run triage (same as Step 3) to mark out-of-scope items as `wont-fix`
2. Launch the improvement agent (same prompt as Step 4)
3. Update state file to mark issues as `fixed`
4. **Exit the loop** - do not re-evaluate

This path trusts the improvement agent to apply fixes correctly and skips the verification cycle. Use when:

- The issues are straightforward style fixes
- Time is limited and re-evaluation isn't worth the cost
- Scores are already acceptable and only minor polish remains

## Step 5: Verification evaluation

For **subsequent rounds**, evaluation agents verify fixes AND find new issues:

### Style agent prompt (verification)

```
Verify fixes and evaluate documentation: $ARGUMENTS

Read the state file first: [path to state file]

Then read:
1. .claude/skills/shared/writing-guide.md
2. .claude/skills/shared/docs-guide.md
3. $ARGUMENTS

Your job:
1. VERIFY fixes marked as "fixed" in the state file - confirm they were actually applied
2. Score style dimensions (do NOT re-flag wont-fix issues)
3. Flag only NEW issues not already in the state file

VERIFY THESE FIXES:
[paste fixed style issues from state file]

Return in this format:

VERIFICATION REPORT:

| ID | Status | Notes |
|----|--------|-------|
| X | verified-fixed / not-fixed | [what you found] |

STYLE SCORES:
READABILITY: [score]/10
VOICE: [score]/10

NEW ISSUES (not already in state file):
- [issue] or "None found"
```

### Content agent prompt (verification)

```
Verify fixes and evaluate documentation content: $ARGUMENTS

Read the state file first: [path to state file]

Then read $ARGUMENTS and verify claims against source code in packages/tldraw/.

Your job:
1. VERIFY accuracy fixes marked as "fixed" in the state file
2. Score content dimensions (do NOT re-flag wont-fix issues)
3. Flag only NEW accuracy issues not already in the state file

VERIFY THESE FIXES:
[paste fixed accuracy issues from state file]

Return in this format:

VERIFICATION REPORT:

| ID | Status | Notes |
|----|--------|-------|
| X | verified-fixed / not-fixed | [what you found in doc AND source] |

CONTENT SCORES:
COMPLETENESS: [score]/10 (score existing content only, ignore wont-fix items)
ACCURACY: [score]/10

NEW ACCURACY ISSUES (not already in state file):
- [issue with source file:line] or "None found"
```

After verification, update the state file with new statuses and any new issues.

## Step 6: Loop

Continue the loop until:

- User chooses "Done" (exit without changes)
- User chooses "Complete and finish" (apply fixes, then exit)
- Scores reach acceptable levels (32/40 or higher)
- All issues are `verified-fixed` or `wont-fix`

## Notes

- The state file prevents re-discovering the same issues across rounds
- Evaluation agents verify previous fixes before scoring
- `wont-fix` is appropriate for completeness issues requiring new sections
- **Accuracy verification is critical**: The improvement agent must read actual source code before applying any accuracy fix
- Style and content evaluations always run in parallel for efficiency
