---
description: Create a bug report by investigating user's issue description
---

Create a comprehensive bug report ticket in the tickets/ folder by investigating the user's description and available logs.

**Investigation Workflow:**

1. **Analyze user input**: Parse the user's description (even if casual like "got an error creating workspace")

2. **Check recent logs automatically**:
   - Examine `.logs/` directory for recent log files
   - Look for errors, stack traces, or relevant events matching the timeframe and user's description
   - Extract error messages, API failures, database issues, etc.

3. **Determine bug number**: Check tickets/ directory for next available bug number (BUG-01, BUG-02, etc.)

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

6. **Create bug report ticket**: Generate `tickets/BUG-XX-description-slug.md` with:
   - All information gathered from investigation
   - Today's date as "Date reported"
   - Status set to "New"
   - Full error logs and stack traces in appropriate sections
   - Analysis of possible cause
   - Related files identified from stack traces

7. **Confirm creation**: Show the ticket path and a brief summary of findings

**Resolving Bug Tickets:**

When fixing or closing a bug, update the ticket and move it to the resolved folder:

1. Update the bug ticket:
   - Check the appropriate status (Resolved/Cannot Reproduce/Won't Fix)
   - Fill in "Date resolved" field
   - Complete the "Resolution" section with details

2. Move to resolved folder:
   ```bash
   git mv tickets/BUG-XX-description.md tickets/resolved/
   ```

This keeps the main `tickets/` folder focused on active work.

**Example usage:**
- User: "got an error when creating a workspace"
- You: [checks logs, finds error, analyzes, creates tickets/BUG-01-workspace-creation-fails.md]
- Output: Created bug report ticket with full details from logs showing database constraint violation on workspace insert

The filename pattern: `BUG-XX-brief-description-slug.md` (zero-padded number, kebab-case slug)
