# BUG-50: Workspace Card Click Crashes Browser Context

**Status:** Backlog
**Priority:** Critical
**Ticket:** NAV-03
**Created:** 2025-10-07

## Description

All workspace browser navigation tests (7/7) are failing because clicking on a workspace card after creation causes the browser page/context to close unexpectedly, resulting in test timeouts.

## Error Details

**Error Pattern:**
```
Test timeout of 30000ms exceeded.
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid^="workspace-card-"]').first()
```

**Failure Location:**
All tests fail when attempting to navigate to a workspace by clicking the workspace card element.

## Affected Tests

All tests in `simple-client/e2e/workspace-browser.spec.ts`:
1. Folder Tree Navigation › should display folder tree in sidebar (line 15)
2. Folder Tree Navigation › should allow creating folders from sidebar (line 45)
3. Folder Tree Navigation › should select folder and filter documents (line 83)
4. Breadcrumb Navigation › should display breadcrumbs for folder navigation (line 142)
5. Archive Link › should display archive link in sidebar (line 184)
6. Document Creation in Folders › should create document in selected folder (line 221)
7. Responsive Layout › should display two-pane layout on desktop (line 275)

## Steps to Reproduce

1. Run: `cd simple-client && npx playwright test e2e/workspace-browser.spec.ts --project=chromium`
2. Tests create workspace successfully
3. Tests attempt to click workspace card: `page.locator('[data-testid^="workspace-card-"]').first().click()`
4. Browser context crashes/closes immediately
5. Tests timeout after 30 seconds

## Observations

- Workspace creation succeeds (workspace appears in sidebar)
- The workspace card element is rendered and visible
- The crash happens during or immediately after the click action
- This affects the workspace card link/click handler, not workspace creation

## Test Code Pattern

```typescript
const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
await workspaceCard.click()  // <- Fails here with context closed
await page.waitForURL('**/workspace/**')
```

## Possible Causes

1. Navigation handler in workspace card component causing page crash
2. Client-side error during route transition to `/workspace/[id]`
3. Unhandled exception in workspace page component initialization
4. React rendering error when loading workspace browser

## Files Involved

- `simple-client/e2e/workspace-browser.spec.ts` - Test file
- `simple-client/src/app/dashboard/dashboard-client.tsx` - Likely contains workspace card component
- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx` - Target page that may be crashing

## Next Steps

1. Check browser console logs for JavaScript errors during navigation
2. Review workspace card click handler and navigation logic
3. Check if workspace browser page has initialization errors
4. Run single test with `--debug` flag to see exact failure point
5. Review recent changes to dashboard and workspace browser components
