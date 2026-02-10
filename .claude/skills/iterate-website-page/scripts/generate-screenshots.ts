import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const VIEWPORTS = {
	desktop: { width: 1200, height: 800 },
	tablet: { width: 1199, height: 800 },
	mobile: { width: 809, height: 600 },
}

const SEGMENT_HEIGHT = 600

interface PageConfig {
	path: string
	name: string
	waitForSelector?: string
}

const PAGES: PageConfig[] = [
	{ path: '/careers', name: 'careers' },
	{ path: '/blog', name: 'blog' },
	{ path: '/blog/category/product', name: 'blog-category-product' },
	{
		path: '/blog/engineering-imperfection-with-draw-shapes',
		name: 'blog-article-engineering-imperfection',
	},
	{ path: '/events', name: 'events' }, // Videos/events page
	{ path: '/partner', name: 'partner' },
	// Note: Add get-a-license/trial and get-a-license/plans once pages are created
]

async function dismissCookieBanner(page: any) {
	try {
		// Wait a bit for cookie banner to appear
		await page.waitForTimeout(1000)

		// Try common cookie banner selectors
		const selectors = [
			'button:has-text("Accept")',
			'button:has-text("Accept all")',
			'button:has-text("OK")',
			'button:has-text("Got it")',
			'[aria-label*="cookie" i] button',
			'[class*="cookie" i] button',
			'#onetrust-accept-btn-handler',
		]

		for (const selector of selectors) {
			try {
				const button = await page.locator(selector).first()
				if (await button.isVisible({ timeout: 1000 })) {
					await button.click()
					await page.waitForTimeout(500)
					break
				}
			} catch (e) {
				// Selector not found, try next
			}
		}
	} catch (e) {
		// No cookie banner or couldn't dismiss, continue
	}
}

async function takeFullPageScreenshot(page: any, url: string) {
	await page.goto(url, { waitUntil: 'networkidle' })

	// Wait for page to be fully loaded
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(2000)

	// Dismiss cookie banner if present
	await dismissCookieBanner(page)

	// Take full page screenshot
	const screenshot = await page.screenshot({ fullPage: true })
	return screenshot
}

async function splitScreenshot(buffer: Buffer, pageName: string, viewport: string, width: number) {
	const image = sharp(buffer)
	const metadata = await image.metadata()
	const height = metadata.height!

	const outputDir = join(process.cwd(), '_reference', pageName, viewport)
	mkdirSync(outputDir, { recursive: true })

	// Save full screenshot
	const fullPath = join(outputDir, `tldraw-dev-${pageName}-${viewport}-${width}.png`)
	writeFileSync(fullPath, buffer)
	console.log(`Saved full screenshot: ${fullPath}`)

	// Split into segments
	const numSegments = Math.ceil(height / SEGMENT_HEIGHT)

	for (let i = 0; i < numSegments; i++) {
		const top = i * SEGMENT_HEIGHT
		const segmentHeight = Math.min(SEGMENT_HEIGHT, height - top)

		const segment = await sharp(buffer)
			.extract({ left: 0, top, width, height: segmentHeight })
			.toBuffer()

		const segmentPath = join(
			outputDir,
			`tldraw-dev-${pageName}-${viewport}-${width}-${i + 1}.png`
		)
		writeFileSync(segmentPath, segment)
		console.log(`Saved segment ${i + 1}/${numSegments}: ${segmentPath}`)
	}
}

async function generateScreenshots(baseUrl: string) {
	const browser = await chromium.launch({ headless: true })

	for (const pageConfig of PAGES) {
		console.log(`\n📸 Processing ${pageConfig.name}...`)

		for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
			console.log(`  ${viewportName} (${viewport.width}x${viewport.height})`)

			const context = await browser.newContext({ viewport })
			const page = await context.newPage()

			try {
				const url = `${baseUrl}${pageConfig.path}`
				const screenshot = await takeFullPageScreenshot(page, url)
				await splitScreenshot(screenshot, pageConfig.name, viewportName, viewport.width)
			} catch (error) {
				console.error(`  ❌ Error: ${error}`)
			}

			await context.close()
		}
	}

	await browser.close()
	console.log('\n✅ Done!')
}

// Get base URL from args or use localhost
const baseUrl = process.argv[2] || 'http://localhost:3000'
console.log(`Generating screenshots from: ${baseUrl}\n`)

generateScreenshots(baseUrl).catch(console.error)
