import { chromium } from 'playwright'

const errors = []
const consoleErrors = []

const browser = await chromium.launch({
	executablePath:
		'/Users/anikrishnan/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const page = await browser.newPage()

page.on('pageerror', (err) => {
	errors.push(`pageerror: ${err.message}`)
})
page.on('console', (msg) => {
	if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`)
})

await page.goto('http://localhost:5420/svg-to-freehand', {
	waitUntil: 'networkidle',
	timeout: 30000,
})
await page.waitForSelector('.tl-canvas', { timeout: 15000 }).catch(() => null)

const starBtn = await page.$('button:has-text("Draw star")')
if (!starBtn) {
	errors.push('Star button not found')
} else {
	// Disable animation for the test (faster, deterministic)
	const animateCheckbox = await page.$('input[type="checkbox"]')
	if (animateCheckbox) await animateCheckbox.uncheck()

	await starBtn.click()
	await page.waitForTimeout(500)

	const heartBtn = await page.$('button:has-text("Draw heart")')
	if (heartBtn) {
		await heartBtn.click()
		await page.waitForTimeout(500)
	}

	const houseBtn = await page.$('button:has-text("Draw house")')
	if (houseBtn) {
		await houseBtn.click()
		await page.waitForTimeout(500)
	}
}

const shapeCount = await page.evaluate(() => document.querySelectorAll('.tl-svg-container').length)
const drawShapeCount = await page.evaluate(
	() => document.querySelectorAll('[data-shape-type="draw"]').length
)

console.log(JSON.stringify({ errors, consoleErrors, shapeCount, drawShapeCount }, null, 2))

await browser.close()
