Improve the documentation article at: $ARGUMENTS

Follow this exact workflow:

## Step 1: Gather context

First, read these files to understand the current state:

1. Read the article to be improved: $ARGUMENTS
2. Read the documentation standards guide: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/HOW_TO_WRITE_DOCUMENTATION.md
3. Read the quality report to find current scores and feedback: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/DOCS_QUALITY_REPORT.md

From the quality report, extract:
- Current Readability, Structure, and Conformance scores
- Current notes/feedback about the article
- The category this article belongs to (packages, tooling, etc.)

## Step 2: Improve the article

Launch a subagent (using Task tool with subagent_type="general-purpose") to rewrite the article. Provide the subagent with:

- The current file path
- Current scores and notes from the quality report
- The full documentation guide content or path
- If it's a package doc, the package's CONTEXT.md path if it exists

The subagent prompt should include:
- The current scores and specific feedback from the quality report
- The expected sections for this document type (from HOW_TO_WRITE_DOCUMENTATION.md)
- Instructions to read source files if needed to understand the topic
- Clear instruction to rewrite the documentation following the guide

## Step 3: Evaluate the improved article

Launch **two fresh subagents in parallel** (two separate Task calls in the same message) to evaluate the improved article. These must be different subagents than the one that made improvements. Running two independent evaluators helps ensure consistent, reliable scores.

Use this exact evaluation prompt for both:
```
You are evaluating documentation quality. Read the HOW_TO_WRITE_DOCUMENTATION.md guide at /Users/stephenruiz/Documents/GitHub/tldraw/documentation/HOW_TO_WRITE_DOCUMENTATION.md first to understand the standards.

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

After both evaluators complete, **average their scores** for each dimension (Readability, Structure, Conformance). Use these averaged scores in the quality report.

## Step 4: Update the quality report

Edit /Users/stephenruiz/Documents/GitHub/tldraw/documentation/DOCS_QUALITY_REPORT.md:

1. Update the article's row in the appropriate category table with new scores and notes
2. Recalculate the category's average scores in the Summary statistics table
3. If the article moved above/below score thresholds, update the "Highest rated" or "Needs improvement" sections
4. Update the "Generated" date if needed

## Step 5: Report results

Tell me:
- Before scores (R/S/C) and total
- After scores (R/S/C) and total
- Point improvement
- Key changes made
- Any remaining issues noted by the evaluator
