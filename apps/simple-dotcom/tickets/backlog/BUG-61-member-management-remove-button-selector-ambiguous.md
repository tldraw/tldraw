# [BUG-61]: Member Management Remove Button Selector Resolves to Multiple Elements

Date reported: 2025-10-09
Date last updated: 2025-10-09
Date resolved:

## Status

- [x] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Priority

**P3 (Low) - Nice to Have**

**Rationale:**
- **Test bug only** - Application functionality works correctly
- **Affects 1 test** (member management remove test)
- **No user impact** - Users can remove members successfully
- **Simple fix**: Add data-testid attributes and update test selector
- **Low urgency**: Does not block any features or other bugs

**Why P3:**
- Application code is working fine
- Only E2E test needs fixing
- Easy fix but low priority compared to actual functionality bugs
- Can be batched with other test improvements

**Suggested Fix:**
1. Add `data-testid="remove-member-{memberId}"` to remove buttons in members list
2. Update test to use: `await page.click(\`[data-testid="remove-member-${memberId}"]\`)`
3. Consider adding similar test IDs to other member management actions

**Good First Issue:** This would be a good ticket for improving E2E test patterns

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [x] Infrastructure

## Environment

- Browser: Chromium (Playwright E2E tests)
- OS: macOS
- Environment: local
- Affected version/commit: current (2025-10-09)

## Description

**This is a TEST BUG, not an application bug.** The E2E test for removing workspace members uses a selector that is too broad and matches multiple "Remove" buttons on the page instead of uniquely identifying the target member's remove button. This causes a Playwright "strict mode violation" error.

The test attempts to remove a member by filtering for "Member User" and clicking the "Remove" button, but the selector matches both the owner's row and the member's row, resulting in 2 matching elements.

## Steps to Reproduce

1. Run test: `npx playwright test e2e/member-management.spec.ts`
2. Test creates workspace with owner and adds one member
3. Test attempts to click Remove button for "Member User"
4. Selector matches 2 elements (owner's Remove button + member's Remove button)
5. Playwright throws strict mode violation error

## Expected Behavior

- Test selector should uniquely identify the member's "Remove" button
- Only 1 element should match the selector
- Click should succeed and remove the member

## Actual Behavior

- Selector matches 2 elements:
  1. Owner's "Remove" button (even though label says "Owner User(You)")
  2. Member's "Remove" button (correct target)
- Playwright cannot determine which button to click
- Test fails with strict mode violation

## Error Messages/Logs

```
Error: locator.click: Error: strict mode violation: locator('div')
  .filter({ hasText: 'Member User' })
  .filter({ has: locator('button:has-text("Remove")') })
  .first()
  .locator('button:has-text("Remove")')
  resolved to 2 elements:

1) <button class="...">Remove</button>
   aka getByRole('row', { name: 'Owner User(You) test-worker-0' }).getByRole('button')

2) <button class="...">Remove</button>
   aka getByRole('row', { name: 'Member User member-' }).getByRole('button')

Call log:
  - waiting for locator('div')
      .filter({ hasText: 'Member User' })
      .filter({ has: locator('button:has-text("Remove")') })
      .first()
      .locator('button:has-text("Remove")')

  48 | 		.filter({ has: page.locator('button:has-text("Remove")') })
  49 | 		.first()
> 50 | 	await memberRow.locator('button:has-text("Remove")').click()
     | 	                                                     ^
```

## Related Files/Components

**Test File:**
- `e2e/member-management.spec.ts:50` - line with failing selector

**Members Page:**
- `src/app/workspace/[workspaceId]/members/page.tsx` - members list UI
- Shows owner with "(You)" label and "Remove" button (should be disabled)
- Shows members with "Remove" button

## Possible Cause

The test selector logic is flawed:

```typescript
// Current (broken) selector:
const memberRow = page
  .locator('div')
  .filter({ hasText: 'Member User' })
  .filter({ has: page.locator('button:has-text("Remove")') })
  .first()

await memberRow.locator('button:has-text("Remove")').click()
```

Issues:
1. Uses overly generic `div` selector
2. Filters by text "Member User" but owner row may contain this text
3. Uses `.first()` but then re-selects button, causing ambiguity
4. Should use `data-testid` attributes for reliable selection

## Proposed Solution

### Option 1: Use data-testid attributes (Recommended)

**Update UI to add test IDs:**
```tsx
// In member list component
<button
  data-testid={`remove-member-${member.id}`}
  onClick={() => handleRemove(member.id)}
>
  Remove
</button>
```

**Update test:**
```typescript
await page.click(`[data-testid="remove-member-${memberId}"]`)
```

### Option 2: Use table row structure

**Update test to use table semantics:**
```typescript
// Click Remove button in the row containing member email
await page
  .getByRole('row', { name: new RegExp(memberEmail) })
  .getByRole('button', { name: 'Remove' })
  .click()
```

### Option 3: Fix existing selector

**More specific filtering:**
```typescript
// Filter by member email instead of name to avoid ambiguity
const memberRow = page
  .getByRole('row')
  .filter({ hasText: memberEmail })
  .filter({ hasNot: page.locator('text=(You)') }) // Exclude owner row

await memberRow.getByRole('button', { name: 'Remove' }).click()
```

### Recommended Implementation:

Use Option 1 (data-testid) as it follows E2E testing best practices:

1. **Add data-testid to Remove buttons** in members list component
2. **Update test** to use specific test IDs
3. **Add similar test IDs** to other action buttons for consistency

## Related Issues

- Pattern: Similar selector issues may exist in other tests
- Best Practice: All interactive elements should have data-testid attributes
- Documentation: E2E testing guidelines should emphasize using data-testid

## Acceptance Criteria

- [ ] Remove button has unique data-testid attribute
- [ ] Test uses data-testid selector instead of text-based filtering
- [ ] Test passes without strict mode violations
- [ ] Member is successfully removed
- [ ] Success message is displayed

## Worklog

**2025-10-09:**
- Identified selector ambiguity during E2E test review
- This is a test bug, not application bug
- Application functionality works correctly in manual testing
- Created bug ticket for test fix

## Resolution

(To be filled when resolved)
