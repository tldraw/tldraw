import { expect, test, type Page } from '@playwright/test'

function penPath(page: Page) {
	return page.locator('.tl-shape[data-shape-type="pen-path"] > svg > path[stroke-linecap="round"]')
}

async function segmentCount(page: Page) {
	return ((await penPath(page).getAttribute('d'))?.match(/C/g) ?? []).length
}

async function samplePath(page: Page) {
	return penPath(page).evaluate((element: SVGPathElement) =>
		Array.from({ length: 21 }, (_, i) => {
			const { x, y } = element.getPointAtLength((element.getTotalLength() * i) / 20)
			return { x, y }
		})
	)
}

async function drawCornerPath(page: Page) {
	await page.mouse.click(100, 300)
	await page.mouse.click(300, 300)
	await page.mouse.click(300, 500)
}

test.describe('Pen tool', () => {
	test.beforeEach(async ({ page, isMobile }) => {
		test.skip(isMobile, 'These interactions exercise desktop modifier keys.')
		await page.goto('http://localhost:5420/pen-tool/full')
		await expect(page.getByRole('button', { name: 'Pen — P', exact: true })).toBeVisible()
	})

	test('draws smooth points and finishes an open path with Enter', async ({ page }) => {
		await page.mouse.click(100, 300)
		await page.mouse.move(300, 300)
		await page.mouse.down()
		await page.mouse.move(350, 250, { steps: 5 })
		await page.mouse.up()
		await page.mouse.click(500, 500)
		await page.keyboard.press('Enter')
		await expect(page.getByRole('button', { name: 'Select — V', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
		await expect(penPath(page)).toHaveAttribute('fill', 'none')
		await expect(penPath(page)).toHaveAttribute(
			'd',
			'M 0 0 C 0 0 150 50 200 0 C 250 -50 400 200 400 200'
		)
		const before = await samplePath(page)
		await page.mouse.dblclick(181.25, 318.75)
		await page.mouse.dblclick(418.75, 381.25)
		await expect.poll(() => segmentCount(page)).toBe(3)
		const after = await samplePath(page)
		for (let i = 0; i < before.length; i++) {
			expect(Math.hypot(after[i].x - before[i].x, after[i].y - before[i].y)).toBeLessThan(0.05)
		}
	})

	test('closes and fills a path; undo reopens it', async ({ page }) => {
		await drawCornerPath(page)
		await page.mouse.click(100, 300)
		await expect.poll(() => segmentCount(page)).toBe(3)
		await expect(penPath(page)).not.toHaveAttribute('fill', 'none')
		await page.keyboard.press('ControlOrMeta+z')
		await expect.poll(() => segmentCount(page)).toBe(2)
		await expect(penPath(page)).toHaveAttribute('fill', 'none')
		await page.keyboard.press('ControlOrMeta+Shift+z')
		await expect.poll(() => segmentCount(page)).toBe(3)
		await expect(penPath(page)).not.toHaveAttribute('fill', 'none')
	})

	test('enters editing without inserting, then inserts and removes with undo and redo', async ({
		page,
	}) => {
		await drawCornerPath(page)
		await page.keyboard.press('Enter')
		const original = await penPath(page).getAttribute('d')
		await page.mouse.dblclick(300, 400)
		await expect(page.getByText('Edit points', { exact: true })).toBeVisible()
		await expect(penPath(page)).toHaveAttribute('d', original!)
		await page.mouse.dblclick(200, 300)
		await expect.poll(() => segmentCount(page)).toBe(3)
		const inserted = await penPath(page).getAttribute('d')
		await page.keyboard.down('ControlOrMeta')
		await page.mouse.click(200, 300)
		await page.keyboard.up('ControlOrMeta')
		await expect.poll(() => segmentCount(page)).toBe(2)
		const removed = await penPath(page).getAttribute('d')
		await page.keyboard.press('ControlOrMeta+z')
		await expect(penPath(page)).toHaveAttribute('d', inserted!)
		await expect(page.getByText('Edit points', { exact: true })).toBeVisible()
		await page.keyboard.press('ControlOrMeta+Shift+z')
		await expect(penPath(page)).toHaveAttribute('d', removed!)
	})

	test('toggles handles and moves one independently with Alt', async ({ page }) => {
		await drawCornerPath(page)
		await page.keyboard.press('Enter')
		await page.mouse.dblclick(300, 400)
		await page.keyboard.down('Alt')
		await page.mouse.click(300, 300)
		await page.keyboard.up('Alt')
		const smooth = await penPath(page).getAttribute('d')
		await expect(penPath(page)).toHaveAttribute(
			'd',
			/166\.6667 -33\.3333 200 0 C 233\.3333 33\.3333/
		)
		await page.keyboard.down('Alt')
		await page.mouse.move(333.3333, 333.3333)
		await page.mouse.down()
		await page.mouse.move(370, 360, { steps: 5 })
		await page.mouse.up()
		await page.keyboard.up('Alt')
		await expect(penPath(page)).toHaveAttribute('d', /166\.6667 -33\.3333 200 0 C 270 60/)
		await page.keyboard.press('ControlOrMeta+z')
		await expect(penPath(page)).toHaveAttribute('d', smooth!)
	})

	test('Escape exits editing, cancels a drag, and discards a single unfinished point', async ({
		page,
	}) => {
		await drawCornerPath(page)
		await page.keyboard.press('Enter')
		await page.mouse.dblclick(300, 400)
		await expect(page.getByText('Edit points', { exact: true })).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByRole('button', { name: 'Select — V', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
		await expect(page.getByText('Edit points', { exact: true })).toBeHidden()
		await page.mouse.dblclick(300, 400)
		const original = await penPath(page).getAttribute('d')
		await page.mouse.move(300, 300)
		await page.mouse.down()
		await page.mouse.move(350, 350, { steps: 5 })
		await expect(penPath(page)).not.toHaveAttribute('d', original!)
		await page.keyboard.press('Escape')
		await page.mouse.up()
		await expect(penPath(page)).toHaveAttribute('d', original!)
		await expect(page.getByRole('button', { name: 'Select — V', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
		await expect(page.getByText('Edit points', { exact: true })).toBeHidden()
		await page.getByRole('button', { name: 'Pen — P', exact: true }).click()
		await page.mouse.click(600, 300)
		await page.keyboard.press('Escape')
		await expect(penPath(page)).toHaveCount(1)
	})
})
