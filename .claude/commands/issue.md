---
description: Create a GitHub issue from a description
argument-hint: [description]
allowed-tools: Bash(gh:*), Bash(git:*), Bash(yarn dev), Bash(yarn dev-app), Bash(yarn dev-docs)
model: opus
---

# Create and research a GitHub issue

Create a new GitHub issue on the `tldraw/tldraw` repo based on the user's description, then research it thoroughly.

## Context

- User's issue description: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Recent issues: !`gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`

## Instructions

### Step 1: Initial investigation

First, do a quick investigation of the codebase to understand the problem area:

- Search for relevant files, functions, or patterns mentioned in the issue description
- Identify the likely affected code areas
- Note any obvious causes or related code

### Step 2: Capture screenshots (for bugs)

If this is a bug report and it can be visually demonstrated, try to capture screenshots:

1. **Check if dev server is running** (or start it):
   - `localhost:5420` - Examples app (`yarn dev`)
   - `localhost:3000` - tldraw.com app (`yarn dev-app`)
   - `localhost:3001` - Docs site (`yarn dev-docs`)

2. **Ask the user to provide screenshots** if they can reproduce the issue:
   - Describe what page/example to visit
   - Explain what steps to take to reproduce
   - Note what visual evidence would be helpful

3. **Upload screenshots** to the issue:
   - Use `gh issue edit` to add images after creating the issue, or
   - Upload to GitHub and include the URL in the issue body

If screenshots aren't feasible (e.g., the bug is non-visual, or reproduction is complex), skip this step and note in the issue what behavior to look for.

### Step 3: Create the issue

Create the issue on GitHub following the standards in @.claude/skills/write-issue/SKILL.md.

1. **Determine the issue type**:
   - `Bug` - Something isn't working as expected
   - `Feature` - New capability or improvement
   - `Example` - Request for a new SDK example
   - `Task` - Internal task or chore

2. **Write a clear title** following these rules:
   - Use sentence case (capitalize only first word and proper nouns)
   - No type prefixes like `Bug:`, `Feature:`, `[Bug]`
   - For bugs: describe the symptom (e.g., "Arrow bindings break with rotated shapes")
   - For features/enhancements: use imperative mood (e.g., "Add padding option to zoomToFit")

3. **Write a descriptive body**:

   For **bugs**:
   - Clear description of what's wrong
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (browser, OS, tldraw version) when relevant
   - Screenshots or recordings if applicable

   For **features/enhancements**:
   - Problem statement: What problem does this solve?
   - Proposed solution: How should it work?
   - Alternatives considered
   - Use cases: Who benefits and how?

   For **examples**:
   - What API or pattern should be demonstrated
   - Why it's useful / when developers need this
   - Suggested approach if possible

4. **Create the issue** using `gh issue create`:

```bash
gh issue create --repo tldraw/tldraw \
  --title "Your title here" \
  --body "Your body here"
```

5. **Set the issue type** via the GitHub API (the `--type` flag is not supported in all gh versions):

```bash
# Get the issue number from the URL returned by gh issue create
# Then set the type using the GraphQL API:
gh api graphql -f query='
  mutation {
    updateIssue(input: {
      id: "<issue-node-id>",
      issueTypeId: "<type-id>"
    }) {
      issue { id }
    }
  }
'
```

To get the issue node ID and available type IDs:

```bash
# Get issue node ID
gh issue view <issue-number> --repo tldraw/tldraw --json id --jq '.id'

# List available issue types for the repo
gh api graphql -f query='
  query {
    repository(owner: "tldraw", name: "tldraw") {
      issueTypes(first: 10) {
        nodes { id name }
      }
    }
  }
'
```

6. **Assign a milestone** (if appropriate):

If the issue clearly fits one of these milestones, assign it. Otherwise, leave the milestone empty.

Available milestones:

- **Improve developer resources**: For examples, documentation, improved code comments, starter kits, and `npm create tldraw` improvements
- **Improve automations**: For GitHub Actions, review bots, CI/CD, and other automation improvements

```bash
gh issue edit <issue-number> --repo tldraw/tldraw --milestone "Milestone Name"
```

Only assign a milestone if there's a clear fit. Most issues won't need a milestone.

**Important**: NEVER include "Generated with Claude Code", "Co-Authored-By: Claude", or any other AI attribution notes in the issue title or body.

7. **Share the issue URL** with the user immediately after creation

### Step 4: Deep research

After creating the issue and sharing the link, do a thorough investigation:

- Search comprehensively for all code related to this issue
- Identify the exact files and line numbers involved
- Look for similar patterns, past fixes, or related issues
- Understand the architecture and data flow
- Consider edge cases and potential side effects
- Brainstorm possible solutions with tradeoffs

### Step 5: Comment on the issue with findings

Once the research is complete, add a comment to the issue with the findings:

```bash
gh issue comment <issue-number> --repo tldraw/tldraw --body "Research findings..."
```

The comment should include:

- **Relevant files**: List specific files and line numbers
- **Root cause analysis**: What's causing the issue (for bugs)
- **Architecture context**: How the affected system works
- **Potential solutions**: 2-3 approaches with tradeoffs
- **Related code**: Links to relevant functions, types, or patterns
- **Considerations**: Edge cases, breaking changes, testing needs

Format the comment as a helpful research summary that would help someone pick up this issue.

## Notes

- Always create the issue first, then do the deep research
- Share the issue link immediately so the user can track it
- The research comment should be thorough but actionable
- Use code blocks and file:line references for easy navigation
