---
title: 'Take Issue'
description: 'Take an issue from planning/issues to implement'
argument-hint: '[issue number or description]'
model: opus
---

# Take Issue

You are taking up an issue from `planning/issues/` to implement it.

**User's input:** $ARGUMENTS

## Workflow

### Step 1: Find the Issue

The user may reference an issue in various ways:

- Direct number: "0001", "issue 0001", "#0001"
- Description: "dirty tracking", "rename file", "dark mode"
- Partial match: "rename", "sync", "persistence"

First, list all issues in `planning/issues/`:

```bash
ls planning/issues/
```

Then find the matching issue:

1. **If the input contains a number** (like "0001" or "#5"), look for the file starting with that number
2. **If the input is descriptive**, search issue filenames and contents for matches

If you find exactly one match, proceed to Step 2.

If you find multiple potential matches, ask the user to clarify which one they meant, listing the options.

If you find **no matching issue**, ask the user:

```
I couldn't find an issue matching "$ARGUMENTS".

Would you like me to create a new issue for this instead?
- Yes, create a new issue for: [restate what they asked for]
- No, let me clarify what I'm looking for
```

If they say yes, invoke the `/issue` skill with their original description.

### Step 2: Read and Understand the Issue

Read the full issue file. Pay attention to:

- **Type**: bug, feature, enhancement, cleanup, docs
- **Description**: What needs to be done
- **Acceptance Criteria**: Definition of done
- **Technical Notes**: Affected files, implementation hints
- **Implementation Plan**: Step-by-step guide (if filled in)

If the Implementation Plan section just contains "..." or is empty, use the Task tool with `subagent_type="Explore"` and `model="opus"` to create one before proceeding.

### Step 3: Update Issue Status

Edit the issue file to change:

```
**Status:** `open`
```

to:

```
**Status:** `in-progress`
```

### Step 4: Create Implementation Todo List

Use an Opus subagent with Plan Mode to create a detailed Plan based on:

1. The Implementation Plan (if available)
2. The Acceptance Criteria
3. Your understanding of the changes needed

### Step 5: Implement the Changes

Work through the todo list systematically:

1. **Read before editing** - Always read files before modifying them
2. **Follow existing patterns** - Match the codebase's style and conventions
3. **Make focused changes** - Don't over-engineer or add unrequested features
4. **Update todos** - Mark items complete as you finish them

For each change:

- Understand the existing code first
- Make the minimal change needed
- Verify the change makes sense in context

### Step 6: Verify the Implementation

After implementing:

1. **Run type checking**:

   ```bash
   npm run typecheck
   ```

2. **Run linting**:

   ```bash
   npm run lint
   ```

3. **Fix any errors** before proceeding

4. **Write e2e test** - For most issues, write a small but meaningful e2e test that tests the most relevant behavior. Run ONLY this test (with npm run e2e -g <test name>`) to validate that it passes. Once it has passed, run the other tests.

5. **Suggest further manual testing if needed** - For UI changes, suggest running `npm run dev` to verify

### Step 7: Update the Issue

Once all acceptance criteria are met:

1. Edit the issue file to change status:

   ```
   **Status:** `in-progress`
   ```

   to:

   ```
   **Status:** `closed`
   ```

2. Check off completed acceptance criteria in the issue file

### Step 8: Summarize

Provide a summary of:

- What issue was implemented
- Key changes made (files modified)
- Manual testing steps
- Any acceptance criteria that couldn't be met (and why)
- Suggestions for testing or follow-up work

Write this below the implementation plan in the `## Implementation Notes` section, then communicate it to the user.

Finally, if the issue is closed, move the closed issue to the `planning/issues/closed` folder.

## Important Notes

- **Ask questions** if requirements are unclear - use AskUserQuestion
- **Don't guess** at implementation details that aren't specified
- **Keep changes focused** on the issue at hand
- **Commit separately** - Don't auto-commit; let the user decide when to commit
