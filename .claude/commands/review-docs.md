Review and improve the documentation at: $ARGUMENTS

This command evaluates a document, improves it based on the evaluation, then re-evaluates to measure improvement.

## Step 1: Evaluate the document

Launch a subagent to evaluate the document. The subagent should:

1. Read the voice and style guide at `VOICE.md`
2. Read the document to evaluate: $ARGUMENTS
3. If the document references code, read relevant source files to verify accuracy

Provide this prompt to the subagent:

```
You are evaluating documentation quality.

**Read these files first:**
1. VOICE.md - the voice and style guide
2. $ARGUMENTS - the document to evaluate

**Score these dimensions (0-10 each):**

1. **Readability**: How clear and easy to understand is the writing?
   - Clear, direct sentences
   - Logical flow between sections
   - Appropriate use of examples
   - No unnecessary jargon

2. **Voice compliance**: How well does it follow VOICE.md?
   - Confident assertions (no hedging)
   - Active voice, present tense
   - Sentence case headings
   - No AI writing tells (hollow importance claims, trailing gerunds, formulaic transitions)
   - Appropriate tone (expert-to-developer, not chatty or academic)

3. **Completeness**: How thorough is the coverage?
   - Overview establishes purpose before mechanism
   - Key concepts explained with enough depth
   - Practical examples where needed
   - Key files and Related sections present (if applicable)

4. **Accuracy**: Is the technical content correct?
   - Code examples are correct and runnable
   - API references match actual implementation
   - Described behavior matches the code
   - No outdated information

**For accuracy, read the relevant source files to verify claims.**

**Return in this format:**

READABILITY: [score]
- [specific issue or strength]
- [specific issue or strength]

VOICE: [score]
- [specific issue or strength]
- [specific issue or strength]

COMPLETENESS: [score]
- [specific issue or strength]
- [specific issue or strength]

ACCURACY: [score]
- [specific issue or strength, with file:line references if inaccurate]
- [specific issue or strength]

PRIORITY_FIXES:
1. [Most important thing to fix]
2. [Second most important]
3. [Third most important]
```

## Step 2: Improve the document

After receiving the evaluation, improve the document yourself (do not use a subagent for this step).

**Focus on the priority fixes first**, then address other issues by score (lowest scores first).

When improving:

1. Read relevant source code to ensure accuracy
2. Follow `VOICE.md` guidelines strictly
3. Verify code examples compile/run correctly
4. Run prettier on the file when done: `yarn prettier --write [file]`

**Do not:**
- Over-explain or add unnecessary sections
- Add features the document doesn't need
- Change accurate content unnecessarily

## Step 3: Re-evaluate the improved document

Launch a **fresh subagent** to re-evaluate the improved document. This subagent must NOT see the original evaluation scores.

Use the same evaluation prompt as Step 1, but do NOT include any reference to the previous scores or issues.

## Step 4: Summarize results

After the re-evaluation completes, report:

```
## Review complete: [filename]

### Scores

| Dimension    | Before | After | Change |
|--------------|--------|-------|--------|
| Readability  | X      | X     | +X     |
| Voice        | X      | X     | +X     |
| Completeness | X      | X     | +X     |
| Accuracy     | X      | X     | +X     |
| **Total**    | X/40   | X/40  | +X     |

### Changes made

- [Key change 1]
- [Key change 2]
- [Key change 3]

### Remaining issues

- [Any issues noted by the re-evaluator that weren't fully addressed]
```

## Notes

- The re-evaluator should be independent to provide unbiased scoring
- If accuracy issues require significant code research, take the time to verify
- Focus on meaningful improvements, not cosmetic changes
