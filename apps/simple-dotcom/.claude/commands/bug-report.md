---
description: Create a bug report by investigating user's issue description
---

Create a comprehensive bug report ticket in the tickets/backlog/ folder by investigating the user's description and available logs.

**Investigation Workflow:**

1. **Analyze user input**: Parse the user's description (even if casual like "got an error creating workspace")

2. **Check recent logs automatically**:
   - Examine `.logs/` directory for recent log files
   - Look for errors, stack traces, or relevant events matching the timeframe and user's description
   - Extract error messages, API failures, database issues, etc.

3. **Determine bug number**: Check tickets/backlog/ directory for next available bug number (BUG-01, BUG-02, etc.)

4. **Build the case**: Based on user description + logs, automatically determine:
   - Severity (Critical/High/Medium/Low) based on error type
   - Category (Authentication/Workspaces/Documents/etc.) from context
   - Steps to reproduce (infer from user description)
   - Expected vs actual behavior
   - Error messages and stack traces (from logs)
   - Affected files/components (from stack traces)
   - Possible cause (analyze the error)

5. **Minimize follow-up questions**: Only ask for clarification if:
   - The issue is completely unclear from description + logs
   - Critical reproduction steps are missing and can't be inferred
   - Environment details are needed and not in logs

6. **Create bug report ticket**: Generate `tickets/backlog/BUG-XX-description-slug.md` with:
   - All information gathered from investigation
   - Today's date as "Date reported"
   - Status set to "New"
   - Full error logs and stack traces in appropriate sections
   - Analysis of possible cause
   - Related files identified from stack traces

7. **Confirm creation**: Show the ticket path and a brief summary of findings

**Bug Ticket Workflow:**

Bugs move through these folders as they progress:

1. **New bugs**: Created in `tickets/backlog/BUG-XX-description.md`

2. **Active work**: When starting work on a bug, move it from backlog to main tickets folder:
   ```bash
   git mv tickets/backlog/BUG-XX-description.md tickets/
   ```

3. **Resolved**: When fixing or closing a bug, update and move to resolved folder:
   - Update the ticket status (Resolved/Cannot Reproduce/Won't Fix)
   - Fill in "Date resolved" field
   - Complete the "Resolution" section with details
   - Move to resolved:
   ```bash
   git mv tickets/BUG-XX-description.md tickets/resolved/
   ```

This keeps the main `tickets/` folder focused on active work only.

**Example usage:**
- User: "got an error when creating a workspace"
- You: [checks logs, finds error, analyzes, creates tickets/backlog/BUG-01-workspace-creation-fails.md]
- Output: Created bug report ticket with full details from logs showing database constraint violation on workspace insert

The filename pattern: `tickets/backlog/BUG-XX-brief-description-slug.md` (zero-padded number, kebab-case slug)
