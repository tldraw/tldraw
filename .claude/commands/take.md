---
description: Take an issue from the GitHub repo and implement it.
argument-hint: [issue number or description]
allowed-tools: Bash(git:*), Bash(gh:*)
model: opus
---

## Context

- User's input: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`

## Task

Take an issue from the `tldraw/tldraw` repo and implement it.

## Workflow

### Step 1: Find the issue

The user may reference an issue in various ways:

- Direct number: "123", "issue 123", "#123"
- GitHub URL: "https://github.com/tldraw/tldraw/issues/123"
- Description: "dirty tracking", "rename file", "dark mode"
- Partial match: "rename", "sync", "persistence"

Find the matching issue on GitHub:

1. **If the input contains a number or URL**, fetch that specific issue:

   ```bash
   gh issue view 123 --repo tldraw/tldraw
   ```

2. **If the input is descriptive**, search for matching issues:

   ```bash
   # Search open issues by keyword
   gh issue list --repo tldraw/tldraw --search "dark mode" --state open --limit 10

   # Include closed issues if no open matches
   gh issue list --repo tldraw/tldraw --search "dark mode" --state all --limit 10
   ```

3. **Review search results** and match against the user's intent.

If you find exactly one match, proceed to Step 2.

If you find multiple potential matches, ask the user to clarify which one they meant, listing the options with issue numbers and titles.

If you find **no matching issue**, ask the user:

```
I couldn't find an issue matching "$ARGUMENTS".

Would you like me to create a new issue for this instead?
- Yes, create a new issue for: [restate what they asked for]
- No, let me clarify what I'm looking for
```

If they say yes, invoke the `/issue` skill with their original description.

### Step 2: Read and understand the issue

Read the full issue on GitHub. Pay attention to:

- **Type**: bug, feature, enhancement, cleanup, docs
- **Description**: What needs to be done
- **Acceptance criteria**: Definition of done
- **Technical notes**: Affected files, implementation hints
- **Comments**: Any discussion or clarifications

If the issue lacks detail, explore the codebase to understand the scope before proceeding.

### Step 3: Assign the issue

Assign the issue to the current user on GitHub. If there is a user already, ask the user whether to proceed.

### Step 4: Create implementation plan

Create a detailed implementation plan based on:

1. The issue description and any technical notes
2. The acceptance criteria (definition of done)
3. Your exploration of the affected code areas

Use the TodoWrite tool to track each step.

### Step 5: Implement the Changes

Create a new branch (based always on `main`) for the issue.

Work through the todo list systematically:

1. **Read before editing** - Always read files before modifying them
2. **Follow existing patterns** - Match the codebase's style and conventions
3. **Make focused changes** - Don't over-engineer or add unrequested features
4. **Update todos** - Mark items complete in the issue as you finish them

For each change:

- Understand the existing code first
- Make the minimal change needed
- Verify the change makes sense in context

### Step 6: Verify the Implementation

After implementing:

1. **Run type checking**:

   ```bash
   yarn typecheck
   ```

2. **Run linting**:

   ```bash
   yarn lint
   ```

3. **Fix any errors** before proceeding

4. **Suggest further manual testing if needed** - For UI changes, suggest running `yarn dev` to verify

### Step 7: Create pull request

Create a PR that links to the issue:

1. Use the `/pr` skill to commit changes and create the PR
2. Include `Closes #<issue-number>` in the PR description to auto-close the issue when merged
3. Reference any relevant context from the issue discussion

### Step 8: Summarize

Provide a summary of:

- What issue was implemented
- Key changes made (files modified)
- Link to the PR
- Manual testing steps
- Any acceptance criteria that couldn't be met (and why)

## Important notes

- **Ask questions** if requirements are unclear - use AskUserQuestion
- **Don't guess** at implementation details that aren't specified
- **Keep changes focused** on the issue at hand
