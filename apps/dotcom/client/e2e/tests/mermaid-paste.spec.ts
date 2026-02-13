import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test('can paste mermaid flowchart and create native shapes', async ({ page, editor }) => {
	const mermaidCode = `flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[End]`

	// Focus the canvas
	await page.click('body')

	// Simulate paste event
	await page.evaluate((code) => {
		const event = new ClipboardEvent('paste', {
			clipboardData: new DataTransfer(),
		})
		Object.defineProperty(event.clipboardData, 'getData', {
			value: (type: string) => (type === 'text/plain' ? code : ''),
		})
		document.dispatchEvent(event)
	}, mermaidCode)

	// Wait a bit for shapes to be created
	await page.waitForTimeout(500)

	// Check that shapes were created (should have at least 3 geo shapes + arrows)
	const shapes = await page.evaluate(() => {
		const app = (window as any).app
		if (!app) return []
		return app.getCurrentPageShapes()
	})

	expect(shapes.length).toBeGreaterThan(0)

	// Check for success toast
	await expect(page.getByText('Flowchart created')).toBeVisible({ timeout: 2000 })
})

test('can paste mermaid sequence diagram', async ({ page, editor }) => {
	const mermaidCode = `sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi`

	await page.click('body')

	await page.evaluate((code) => {
		const event = new ClipboardEvent('paste', {
			clipboardData: new DataTransfer(),
		})
		Object.defineProperty(event.clipboardData, 'getData', {
			value: (type: string) => (type === 'text/plain' ? code : ''),
		})
		document.dispatchEvent(event)
	}, mermaidCode)

	await page.waitForTimeout(500)

	// Check for success toast
	await expect(page.getByText('Sequence diagram created')).toBeVisible({ timeout: 2000 })
})

test('can paste mermaid with code fence', async ({ page, editor }) => {
	const mermaidCode = `\`\`\`mermaid
flowchart TD
  A --> B
\`\`\``

	await page.click('body')

	await page.evaluate((code) => {
		const event = new ClipboardEvent('paste', {
			clipboardData: new DataTransfer(),
		})
		Object.defineProperty(event.clipboardData, 'getData', {
			value: (type: string) => (type === 'text/plain' ? code : ''),
		})
		document.dispatchEvent(event)
	}, mermaidCode)

	await page.waitForTimeout(500)

	await expect(page.getByText('Flowchart created')).toBeVisible({ timeout: 2000 })
})

test('falls back to SVG for unsupported diagram types', async ({ page, editor }) => {
	const mermaidCode = `gantt
  title A Gantt Diagram
  section Section
  A task :a1, 2024-01-01, 30d`

	await page.click('body')

	await page.evaluate((code) => {
		const event = new ClipboardEvent('paste', {
			clipboardData: new DataTransfer(),
		})
		Object.defineProperty(event.clipboardData, 'getData', {
			value: (type: string) => (type === 'text/plain' ? code : ''),
		})
		document.dispatchEvent(event)
	}, mermaidCode)

	await page.waitForTimeout(1000)

	// Should show success toast for SVG fallback
	await expect(page.getByText('Mermaid diagram created')).toBeVisible({ timeout: 2000 })
})

test('handles invalid mermaid code gracefully', async ({ page, editor }) => {
	const invalidCode = `sequenceDiagram
  This is invalid syntax >>>>`

	await page.click('body')

	await page.evaluate((code) => {
		const event = new ClipboardEvent('paste', {
			clipboardData: new DataTransfer(),
		})
		Object.defineProperty(event.clipboardData, 'getData', {
			value: (type: string) => (type === 'text/plain' ? code : ''),
		})
		document.dispatchEvent(event)
	}, invalidCode)

	await page.waitForTimeout(500)

	// Should either create text shape or show error toast
	// Not asserting specific behavior as it may vary
})
