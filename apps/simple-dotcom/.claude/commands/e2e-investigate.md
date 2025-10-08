---
description: Run e2e test, analyze failures, and escalate scope on success
---

Run an end-to-end test based on user input, perform root cause analysis on failures, and expand scope on success.

**Workflow:**

1. **Parse user input**: Extract the test name or describe block from user's request
   - Examples: "should join workspace immediately when authenticated"
   - Examples: "Workspace Invitation Flow : Error Scenarios"
   - Examples: "invite.spec.ts"

2. **Run the specific test**:
   ```bash
   npx playwright test e2e/<file>.spec.ts --grep "<test-name>" --project=chromium
   ```
   - Use exact test name with --grep flag for specific test
   - Use describe block name for group tests
   - Use file name only for entire file

3. **Analyze results**:

   **IF TEST FAILS:**
   - Capture the full error output, stack traces, and debug logs
   - Launch the ultrathink-debugger agent to perform deep root cause analysis:
     - Investigate the test code in e2e/ directory
     - Check related application code (API routes, components, hooks)
     - Examine database queries and RLS policies if relevant
     - Analyze error messages and stack traces
     - Identify the specific code causing the failure
   - After analysis completes, invoke the bug-report-generator agent to create a ticket:
     - Use findings from root cause analysis
     - Include test name and failure details
     - Categorize as "Testing" or relevant functional area
     - Set severity based on failure type (Critical if blocking, High if affecting core flows)
   - Report to user: "Test failed. Created bug report at tickets/backlog/BUG-XX-description.md"

   **IF TEST PASSES:**
   - Determine the containing scope:
     - If user provided a specific test name: run the parent describe block
     - If user provided a describe block: run the entire test file
     - If user provided a file: report success and ask if they want to run all e2e tests
   - Run the expanded scope automatically
   - Report results with counts (X passed, Y failed)
   - If expanded scope has failures, loop back to failure workflow

4. **Report to user**:
   - Always show test execution summary (passed/failed counts, duration)
   - On failure: link to created bug ticket
   - On success with expansion: show expanded scope results
   - Be concise but complete

**Examples:**

User: "run the authenticated user join test"
’ Extract: "should join workspace immediately when authenticated"
’ Run: `npx playwright test e2e/invite.spec.ts --grep "should join workspace immediately when authenticated"`
’ Pass: Run parent describe "Authenticated User Flow"
’ Report: " All 3 tests in 'Authenticated User Flow' passed (12.4s)"

User: "test the error scenarios for invites"
’ Extract: "Error Scenarios"
’ Run: `npx playwright test e2e/invite.spec.ts --grep "Error Scenarios"`
’ Fail: 1 test failed
’ Launch ultrathink-debugger agent for root cause analysis
’ Create bug report with findings
’ Report: "L 1 test failed. Created BUG-15-invite-disabled-link-error.md"

User: "run invite.spec.ts"
’ Run entire file
’ Pass: Report " All 15 tests passed (45.2s)"
’ Ask: "All tests passed. Run full e2e suite?"

**Integration with agents:**

- Use Task tool with `subagent_type: "ultrathink-debugger"` for failure analysis
- Use SlashCommand tool with `/bug-report` for creating bug tickets
- Run agents sequentially: first debug, then report

**Working directory:**

All commands should be run from `apps/simple-dotcom/simple-client/` directory where package.json and playwright.config.ts are located.
