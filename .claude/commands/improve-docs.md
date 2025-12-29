Review and improve the documentation at: $ARGUMENTS

This command evaluates a document, improves it based on the evaluation, then re-evaluates to measure improvement.

## Step 1: Review the current scores

Review the article's frontmatter from notes from the previous evaluation.

## Step 2: Improve the document

After reviewing the evaluation, improve the document yourself (do not use a subagent for this step).

**Focus on the priority fixes first**, then address other issues by score (lowest scores first).

When improving:

1. Read relevant source code to ensure accuracy
2. Follow the write-docs skill guidelines strictly (`.claude/skills/write-docs.md`)
3. Verify code snippets are syntactically correct and use valid APIs
4. Run prettier on the file when done: `yarn prettier --write [file]`

**Do not:**

- Over-explain or add unnecessary sections
- Add features the document doesn't need
- Change accurate content unnecessarily

## Step 3: Re-evaluate the improved document

Launch a **fresh subagent** to re-evaluate the improved document using the `evaluate-docs` slash command.

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
- Documentation should contain illustrative snippets, not full runnable examples
- Full examples belong in `apps/examples` - link to them rather than embedding complete code
- After completing the review, note if new examples are needed in `apps/examples`
