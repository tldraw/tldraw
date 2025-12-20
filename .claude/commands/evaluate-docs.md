Evaluate the documentation article at: $ARGUMENTS

Follow this exact workflow:

## Step 1: Gather context

Read these files:

1. Read the documentation standards guide: ./documentation/HOW_TO_WRITE_DOCUMENTATION.md
2. Read the article to evaluate: $ARGUMENTS

## Step 2: Evaluate the article

Launch **two fresh subagents in parallel** (two separate Task calls in the same message) to evaluate the article. Running two independent evaluators helps ensure consistent, reliable scores.

Use this exact evaluation prompt for both:

```
You are evaluating documentation quality. Read the HOW_TO_WRITE_DOCUMENTATION.md guide at ./documentation/HOW_TO_WRITE_DOCUMENTATION.md first to understand the standards.

Then read and evaluate this documentation file:
[article path]

Provide:
- Readability score (0-10): How clear and easy to understand is the writing?
- Structure score (0-10): Does it follow proper document structure (Overview, sections, Key files, Related)?
- Conformance score (0-10): How well does it follow the HOW_TO_WRITE_DOCUMENTATION.md guide (sentence case headings, frontmatter, active voice, conciseness)?

Be strict. Check for:
- Proper frontmatter (title, created_at, updated_at, keywords)
- Overview section (1-2 paragraphs establishing function and role)
- Required sections for this document type
- Key concepts with PROSE explanations (not just bullet points)
- All headings in sentence case
- Active voice and present tense
- Minimal, focused code examples
- Key files and Related sections

Return in this format:
FILE: [relative path]
READABILITY: [score]
STRUCTURE: [score]
CONFORMANCE: [score]
NOTES: [brief notes on issues or strengths]
```

## Step 3: Calculate final scores

After both evaluators complete, **average their scores** for each dimension (Readability, Structure, Conformance).

## Step 4: Report results

Report the evaluation results in this format:

```
## Evaluation: [article filename]

| Dimension   | Score |
|-------------|-------|
| Readability | X/10  |
| Structure   | X/10  |
| Conformance | X/10  |
| **Total**   | X/30  |

### Notes
[Combined notes from both evaluators, highlighting key issues or strengths]
```

If both evaluators had significantly different scores (>2 points apart on any dimension), note this discrepancy and explain the reasoning.

## Step 5: Update the quality report

Update ./documentation/DOCS_QUALITY_REPORT.md with the averaged scores and notes for the article.
