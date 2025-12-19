---
title: Testing
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - testing
  - vitest
  - playwright
  - e2e
  - guide
---

## Overview

This guide covers unit testing with Vitest and end-to-end testing with Playwright in the tldraw monorepo.

## Unit tests (Vitest)

Tests live next to source files and use `.test.ts`.

```typescript
import { describe, it, expect } from 'vitest'
import { TestEditor } from 'tldraw/src/test/TestEditor'

describe('selection', () => {
	it('selects shapes', () => {
		const editor = new TestEditor()
		const id = editor.createShape({ type: 'geo', x: 0, y: 0 })
		editor.select(id)
		expect(editor.getSelectedShapeIds()).toContain(id)
	})
})
```

Run tests from a package directory:

```bash
yarn test run

yarn test run --grep "selection"
```

## End-to-end tests (Playwright)

E2E tests live under `apps/examples/e2e/` and `apps/dotcom/client/e2e/`.

```typescript
import { test, expect } from '@playwright/test'

test('loads the editor', async ({ page }) => {
	await page.goto('http://localhost:5420')
	await page.waitForSelector('.tldraw__editor')
	expect(await page.locator('.tl-canvas').count()).toBe(1)
})
```

Run E2E suites:

```bash
yarn e2e

yarn e2e-dotcom
```

## Key files

- apps/examples/e2e/ - Examples app E2E tests
- apps/dotcom/client/e2e/ - tldraw.com E2E tests
- packages/tldraw/src/test/TestEditor.ts - Test editor utilities

## Related

- [Code quality](../tooling/code-quality.md)
- [Examples app](../apps/examples.md)
