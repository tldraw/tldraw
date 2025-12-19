---
title: Testing
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - testing
  - vitest
  - playwright
  - e2e
  - guide
---

This guide explains how to test tldraw applications and how to run tests in the tldraw monorepo.

## Unit testing with Vitest

### Test setup

tldraw uses Vitest for unit and integration testing. Tests are located alongside source files with `.test.ts` suffix.

```typescript
// MyComponent.test.ts
import { describe, it, expect } from 'vitest'
import { Editor, createTLStore } from 'tldraw'

describe('MyComponent', () => {
	it('should do something', () => {
		const store = createTLStore()
		const editor = new Editor({ store })

		// Test logic
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})
})
```

### Running tests

```bash
# From workspace directory
cd packages/editor
yarn test run

# Run specific test file
yarn test run src/lib/Editor.test.ts

# Filter tests by name
yarn test run --grep "selection"

# Watch mode
yarn test

# With coverage
yarn test run --coverage
```

### Test editor setup

For integration tests, use the test utilities:

```typescript
import { TestEditor } from '@tldraw/tldraw/src/test/TestEditor'

describe('Editor integration', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	it('should create shapes', () => {
		editor.createShape({ type: 'geo', x: 100, y: 100 })
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
	})

	it('should select shapes', () => {
		const id = editor.createShape({ type: 'geo', x: 100, y: 100 })
		editor.select(id)
		expect(editor.getSelectedShapeIds()).toContain(id)
	})
})
```

### Testing custom shapes

```typescript
import { TestEditor } from '@tldraw/tldraw/src/test/TestEditor'
import { MyShapeUtil } from './MyShapeUtil'

describe('MyShapeUtil', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor({
			shapeUtils: [MyShapeUtil],
		})
	})

	it('should create my shape', () => {
		editor.createShape({
			type: 'my-shape',
			props: { text: 'Hello' },
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes[0].type).toBe('my-shape')
		expect(shapes[0].props.text).toBe('Hello')
	})
})
```

### Pointer and keyboard simulation

```typescript
it('should draw with the draw tool', () => {
	editor.setCurrentTool('draw')

	// Simulate pointer down
	editor.pointerDown(100, 100)

	// Simulate pointer move
	editor.pointerMove(150, 150)
	editor.pointerMove(200, 100)

	// Simulate pointer up
	editor.pointerUp()

	const shapes = editor.getCurrentPageShapes()
	expect(shapes[0].type).toBe('draw')
})

it('should handle keyboard shortcuts', () => {
	editor.createShape({ type: 'geo', x: 100, y: 100 })
	editor.selectAll()

	// Simulate delete key
	editor.keyDown('Delete')

	expect(editor.getCurrentPageShapes()).toHaveLength(0)
})
```

## E2E testing with Playwright

### Test setup

E2E tests are located in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`.

```typescript
// example.spec.ts
import { test, expect } from '@playwright/test'

test('should load the editor', async ({ page }) => {
	await page.goto('http://localhost:5420/examples/basic')

	// Wait for editor to load
	await page.waitForSelector('.tldraw__editor')

	// Check that canvas is visible
	const canvas = page.locator('.tl-canvas')
	await expect(canvas).toBeVisible()
})
```

### Running E2E tests

```bash
# Run examples E2E tests
yarn e2e

# Run tldraw.com E2E tests
yarn e2e-dotcom

# Run with UI
yarn e2e --ui

# Run specific test file
yarn e2e tests/example.spec.ts
```

### Testing interactions

```typescript
test('should create a rectangle', async ({ page }) => {
	await page.goto('http://localhost:5420/examples/basic')

	// Click the rectangle tool
	await page.click('[data-testid="tools.rectangle"]')

	// Draw a rectangle
	const canvas = page.locator('.tl-canvas')
	await canvas.click({ position: { x: 100, y: 100 } })
	await page.mouse.down()
	await page.mouse.move(300, 200)
	await page.mouse.up()

	// Verify shape created
	// ...
})
```

### Testing with fixtures

```typescript
import { test, expect, Page } from '@playwright/test'

class TldrawPage {
	constructor(public readonly page: Page) {}

	async goto(example: string) {
		await this.page.goto(`http://localhost:5420/examples/${example}`)
		await this.page.waitForSelector('.tldraw__editor')
	}

	async selectTool(tool: string) {
		await this.page.click(`[data-testid="tools.${tool}"]`)
	}

	async draw(from: { x: number; y: number }, to: { x: number; y: number }) {
		const canvas = this.page.locator('.tl-canvas')
		await canvas.click({ position: from })
		await this.page.mouse.down()
		await this.page.mouse.move(to.x, to.y)
		await this.page.mouse.up()
	}
}

test('drawing test', async ({ page }) => {
	const tldraw = new TldrawPage(page)
	await tldraw.goto('basic')
	await tldraw.selectTool('draw')
	await tldraw.draw({ x: 100, y: 100 }, { x: 200, y: 200 })
})
```

## Best practices

### Test isolation

```typescript
// Each test should start fresh
beforeEach(() => {
	editor = new TestEditor()
})

// Don't rely on state from previous tests
afterEach(() => {
	editor.dispose()
})
```

### Testing async operations

```typescript
it('should handle async operations', async () => {
	editor.createShape({ type: 'image', props: { src: 'test.png' } })

	// Wait for image to load
	await editor.waitForAssetToLoad()

	const shape = editor.getCurrentPageShapes()[0]
	expect(shape.props.w).toBeGreaterThan(0)
})
```

### Snapshot testing

```typescript
it('should match snapshot', () => {
	editor.createShape({ type: 'geo', x: 100, y: 100 })
	editor.createShape({ type: 'text', x: 200, y: 100, props: { text: 'Hello' } })

	const snapshot = editor.store.getSnapshot()
	expect(snapshot).toMatchSnapshot()
})
```

### Testing store changes

```typescript
it('should track store changes', () => {
	const changes: any[] = []

	editor.store.listen((entry) => {
		changes.push(entry)
	})

	editor.createShape({ type: 'geo' })

	expect(changes).toHaveLength(1)
	expect(changes[0].changes.added).toBeDefined()
})
```

## Common patterns

### Testing selection

```typescript
it('should select shapes', () => {
	const id1 = editor.createShape({ type: 'geo', x: 0, y: 0 })
	const id2 = editor.createShape({ type: 'geo', x: 100, y: 0 })

	editor.select(id1)
	expect(editor.getSelectedShapeIds()).toEqual([id1])

	editor.select(id1, id2)
	expect(editor.getSelectedShapeIds()).toEqual([id1, id2])

	editor.selectNone()
	expect(editor.getSelectedShapeIds()).toEqual([])
})
```

### Testing undo/redo

```typescript
it('should support undo/redo', () => {
	editor.mark('before-create')
	editor.createShape({ type: 'geo' })

	expect(editor.getCurrentPageShapes()).toHaveLength(1)

	editor.undo()
	expect(editor.getCurrentPageShapes()).toHaveLength(0)

	editor.redo()
	expect(editor.getCurrentPageShapes()).toHaveLength(1)
})
```

## Related

- [Commands reference](../reference/commands.md) - Test commands
- [Editor API](../packages/editor.md) - Editor methods
