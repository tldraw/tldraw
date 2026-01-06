---
name: write-e2e-tests
description: Writing Playwright E2E tests for tldraw. Use when creating browser tests, testing UI interactions, or adding E2E coverage in apps/examples/e2e or apps/dotcom/client/e2e.
---

# Writing E2E tests

E2E tests use Playwright. Located in `apps/examples/e2e/` (SDK examples) and `apps/dotcom/client/e2e/` (tldraw.com).

## Test file structure

```
apps/examples/e2e/
├── fixtures/
│   ├── fixtures.ts        # Test fixtures (toolbar, menus, etc.)
│   └── menus/             # Page object models
├── tests/
│   └── test-*.spec.ts     # Test files
└── shared-e2e.ts          # Shared utilities
```

Name test files `test-<feature>.spec.ts`.

## Required declarations

When using `page.evaluate()` to access the editor or UI events:

```typescript
import { Editor } from 'tldraw'

declare const editor: Editor
declare const __tldraw_ui_event: { name: string; data?: any }
```

## Basic test structure

```typescript
import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setupOrReset } from '../shared-e2e'

test.describe('Feature name', () => {
	test.beforeEach(setupOrReset)

	test('does something', async ({ page, toolbar }) => {
		// Test implementation
	})
})
```

## Setup patterns

### Standard setup (recommended)

```typescript
test.beforeEach(setupOrReset) // Smart: navigates first run, fast reset after
```

### Shared page for performance

For tests that don't need full isolation:

```typescript
let page: Page

test.describe('Feature', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test.beforeEach(async () => {
		await hardResetEditor(page)
	})
})
```

### Setup with shapes

```typescript
import { setupPageWithShapes, hardResetWithShapes } from '../shared-e2e'

test.beforeEach(async ({ browser }) => {
	if (!page) {
		page = await browser.newPage()
		await setupPage(page)
	} else {
		await hardResetEditor(page)
	}
	await setupPageWithShapes(page)
})
```

## Available fixtures

```typescript
test('example', async ({
	page, // Playwright page
	toolbar, // Toolbar page object
	stylePanel, // Style panel
	actionsMenu, // Actions menu
	mainMenu, // Main menu
	pageMenu, // Page menu
	navigationPanel, // Navigation panel
	richTextToolbar, // Rich text toolbar
	api, // tldrawApi methods
	isMobile, // Mobile viewport check
	isMac, // Mac platform check
}) => {})
```

## Interacting with the editor

### Via page.evaluate

```typescript
// Execute code in browser context
await page.evaluate(() => {
	editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

// Fast reset (faster than keyboard shortcuts)
await page.evaluate(() => {
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
	editor.setCurrentTool('select')
})

// Get data from editor
const shape = await page.evaluate(() => editor.getOnlySelectedShape())
expect(shape).toMatchObject({ type: 'geo', x: 100, y: 100 })
```

### Testing UI events

```typescript
await page.keyboard.press('Control+a')
expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
	name: 'select-all-shapes',
	data: { source: 'kbd' },
})
```

## Selecting tools and UI elements

### By test ID

```typescript
await page.getByTestId('tools.rectangle').click()
await page.getByTestId('tools.more.cloud').click() // In popover
await expect(page.getByTestId('tools.select')).toHaveAttribute('aria-pressed', 'true')
```

### Via toolbar fixture

```typescript
const { select, draw, arrow, rectangle } = toolbar.tools
await rectangle.click()
await toolbar.isSelected(rectangle)
await toolbar.isNotSelected(select)

// More tools popover
await toolbar.moreToolsButton.click()
await toolbar.popOverTools.popoverCloud.click()
```

## Menu interactions

```typescript
import { clickMenu, withMenu } from '../shared-e2e'

// Click a menu item
await clickMenu(page, 'main-menu.edit.copy')
await clickMenu(page, 'context-menu.copy-as.copy-as-png')

// Focus and interact with menu item
await page.mouse.click(200, 200, { button: 'right' })
await withMenu(page, 'context-menu.arrange.distribute-horizontal', (item) => item.focus())
await page.keyboard.press('Enter')
```

## Data-driven tests

```typescript
const tools = [
	{ tool: 'rectangle', shape: 'geo' },
	{ tool: 'arrow', shape: 'arrow' },
	{ tool: 'draw', shape: 'draw' },
]

test('creates shapes with tools', async ({ page, toolbar }) => {
	for (const { tool, shape } of tools) {
		await page.getByTestId(`tools.${tool}`).click()
		await page.mouse.click(200, 200)
		expect(await getAllShapeTypes(page)).toContain(shape)

		// Reset for next iteration
		await page.evaluate(() => {
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		})
	}
})
```

## Platform-specific handling

### Modifier keys

```typescript
test('copy paste', async ({ page, isMac }) => {
	const modifier = isMac ? 'Meta' : 'Control'
	await page.keyboard.down(modifier)
	await page.keyboard.press('KeyC')
	await page.keyboard.press('KeyV')
	await page.keyboard.up(modifier)
})
```

### Skip on mobile

```typescript
test('desktop only feature', async ({ isMobile }) => {
	if (isMobile) return
	// Desktop-specific test
})
```

## Helper functions

```typescript
import { getAllShapeTypes, getAllShapeLabels, sleep, sleepFrames } from '../shared-e2e'

// Get shape types on canvas
const shapes = await getAllShapeTypes(page)
expect(shapes).toEqual(['geo', 'arrow'])

// Wait for async operations
await sleep(100)
await sleepFrames(2) // Wait for animation frames
```

## Assertions

```typescript
// Shape assertions
expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
	type: 'geo',
	props: { w: 100, h: 100 },
})

// Attribute assertions
await expect(page.getByTestId('tools.select')).toHaveAttribute('aria-pressed', 'true')

// CSS assertions (for selection state)
await expect(tool).toHaveCSS('color', 'rgb(255, 255, 255)')

// Visibility
await expect(toolbar.moreToolsPopover).toBeVisible()
await expect(toolbar.toolLock).toBeHidden()
```

## Skipping flaky tests

```typescript
test.describe.skip('clipboard tests', () => {
	// Skipped because flaky in CI
})

test.skip('known issue', async () => {})
```

## Running E2E tests

```bash
yarn e2e                    # Examples E2E
yarn e2e-dotcom            # Dotcom E2E
yarn e2e-ui                # With Playwright UI
yarn e2e -- --grep "toolbar"  # Filter by pattern
```

## Key patterns summary

- Use `setupOrReset` in `beforeEach` for test isolation
- Declare `editor` and `__tldraw_ui_event` for `page.evaluate()`
- Use `page.evaluate()` for fast editor manipulation (faster than keyboard)
- Use `getByTestId()` with `tools.<name>` pattern for tool selection
- Use `clickMenu()` / `withMenu()` for menu interactions
- Handle platform differences with `isMac` and `isMobile` fixtures
- Test against `localhost:5420/end-to-end` example
