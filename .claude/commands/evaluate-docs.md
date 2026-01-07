---
description: Review a documentation file.
argument-hint: <path to document>
model: opus
---

Review and improve the documentation at: $ARGUMENTS

Relevant skills: `write-docs`.

## Instructions

You are evaluating documentation quality.

**Read these files first:**

1. `.claude/skills/write-docs.md` - the voice and style guide
2. $ARGUMENTS - the document to evaluate

**Score these dimensions (0-10 each):**

1. **Readability**: How clear and easy to understand is the writing?
   - Clear, direct sentences
   - Logical flow between sections
   - Appropriate use of code snippets and links to examples
   - No unnecessary jargon

2. **Voice compliance**: How well does it follow the voice skill?
   - Confident assertions (no hedging)
   - Active voice, present tense
   - Sentence case headings
   - No AI writing tells (hollow importance claims, trailing gerunds, formulaic transitions)
   - Appropriate tone (expert-to-developer, not chatty or academic)

3. **Completeness**: How thorough is the coverage?
   - Overview establishes purpose before mechanism
   - Key concepts explained with enough depth
   - Illustrative code snippets where needed (not full examples)
   - Links to relevant examples in `apps/examples` (if applicable)

4. **Accuracy**: Is the technical content correct?
   - Code snippets are syntactically correct and demonstrate valid API usage
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

Write your scores into the frontmatter of the document under the `readability`, `voice`, `completeness`, and `accuracy` properties. Write your notes (<200 words) into the frontmatter of the document under the `notes` property. Your notes should be focused on additional areas for improvement, especially inaccuracies.

Report back to the user your results.
