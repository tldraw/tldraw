import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const VIEWPORTS = {
	desktop: { width: 1200, height: 800 },
	tablet: { width: 1199, height: 800 },
	mobile: { width: 809, height: 600 },
}

interface PageConfig {
	path: string
	name: string
}

const PAGES: PageConfig[] = [
	{ path: '/', name: 'home' },
	{ path: '/careers', name: 'careers' },
	{ path: '/blog', name: 'blog' },
	{ path: '/blog/category/product', name: 'blog-category-product' },
	{
		path: '/blog/engineering-imperfection-with-draw-shapes',
		name: 'blog-article-engineering-imperfection',
	},
	{ path: '/events', name: 'events' },
	{ path: '/partner', name: 'partner' },
	{ path: '/faq', name: 'faq' },
	{ path: '/pricing', name: 'pricing' },
	{ path: '/showcase', name: 'showcase' },
]

interface BoundingBox {
	x: number
	y: number
	width: number | 'auto'
	height: number | 'auto'
}

interface BoundingBoxConfig {
	desktop?: BoundingBox
	tablet?: BoundingBox
	mobile?: BoundingBox
	default?: BoundingBox
}

interface ComparisonResult {
	page: string
	viewport: string
	productionUrl: string
	localUrl: string
	productionSize: { width: number; height: number }
	localSize: { width: number; height: number }
	pixelDifference: number
	percentDifference: number
	diffImagePath: string
	notes: string[]
	boundingBox?: BoundingBox
}

async function dismissCookieBanner(page: any) {
	try {
		await page.waitForTimeout(1000)
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
				// Continue to next selector
			}
		}
	} catch (e) {
		// No cookie banner
	}
}

async function takeFullPageScreenshot(page: any, url: string): Promise<Buffer> {
	await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(5000) // Allow content to settle (fonts, canvas, animations)
	await dismissCookieBanner(page)
	await page.waitForTimeout(2000)
	await page.evaluate(() => window.scrollTo(0, 0)) // Ensure both start from top
	await page.waitForTimeout(500) // Brief pause after scroll

	return await page.screenshot({ fullPage: true, type: 'png' })
}

async function compareImages(
	prodBuffer: Buffer,
	localBuffer: Buffer,
	outputPath: string,
	boundingBox?: BoundingBox
): Promise<{ pixelDiff: number; percentDiff: number; notes: string[] }> {
	const notes: string[] = []

	let prodImage = sharp(prodBuffer)
	let localImage = sharp(localBuffer)

	const prodMeta = await prodImage.metadata()
	const localMeta = await localImage.metadata()

	let prodWidth = prodMeta.width!
	let prodHeight = prodMeta.height!
	let localWidth = localMeta.width!
	let localHeight = localMeta.height!

	// Apply bounding box crop if specified
	if (boundingBox) {
		const { x, y } = boundingBox
		const width = boundingBox.width === 'auto' ? prodWidth - x : boundingBox.width
		const height = boundingBox.height === 'auto' ? prodHeight - y : boundingBox.height

		// Validate and adjust bounding box for production image
		const prodCropWidth = Math.min(width, prodWidth - x)
		const prodCropHeight = Math.min(height, prodHeight - y)
		if (x < prodWidth && y < prodHeight && prodCropWidth > 0 && prodCropHeight > 0) {
			prodImage = sharp(prodBuffer).extract({
				left: x,
				top: y,
				width: prodCropWidth,
				height: prodCropHeight,
			})
			prodWidth = prodCropWidth
			prodHeight = prodCropHeight
		} else {
			notes.push(
				`Warning: Bounding box (${x},${y},${width},${height}) is out of bounds for production image (${prodWidth}x${prodHeight})`
			)
		}

		// Validate and adjust bounding box for local image
		const localCropWidth = Math.min(width, localWidth - x)
		const localCropHeight = Math.min(height, localHeight - y)
		if (x < localWidth && y < localHeight && localCropWidth > 0 && localCropHeight > 0) {
			localImage = sharp(localBuffer).extract({
				left: x,
				top: y,
				width: localCropWidth,
				height: localCropHeight,
			})
			localWidth = localCropWidth
			localHeight = localCropHeight
		} else {
			notes.push(
				`Warning: Bounding box (${x},${y},${width},${height}) is out of bounds for local image (${localWidth}x${localHeight})`
			)
		}

		const widthStr = boundingBox.width === 'auto' ? 'auto' : boundingBox.width
		const heightStr = boundingBox.height === 'auto' ? 'auto' : boundingBox.height
		notes.push(`Comparing region: x=${x}, y=${y}, width=${widthStr}, height=${heightStr}`)
	}

	if (prodWidth !== localWidth) {
		notes.push(`Width difference: production ${prodWidth}px vs local ${localWidth}px`)
	}
	if (prodHeight !== localHeight) {
		notes.push(`Height difference: production ${prodHeight}px vs local ${localHeight}px`)
	}

	// Resize images to match dimensions for comparison (use smaller of the two)
	const compareWidth = Math.min(prodWidth, localWidth)
	const compareHeight = Math.min(prodHeight, localHeight)

	// position: 'top' ensures top-alignment when cropping images of different heights
	const resizeOpts = { fit: 'cover' as const, position: 'top' as const }

	const prodResized = await prodImage
		.resize(compareWidth, compareHeight, resizeOpts)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const localResized = await localImage
		.resize(compareWidth, compareHeight, resizeOpts)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	// Calculate pixel differences (RGBA = 4 channels)
	let pixelDiff = 0
	const threshold = 10 // Allow small color variations

	for (let i = 0; i < prodResized.data.length; i += 4) {
		const rDiff = Math.abs(prodResized.data[i] - localResized.data[i])
		const gDiff = Math.abs(prodResized.data[i + 1] - localResized.data[i + 1])
		const bDiff = Math.abs(prodResized.data[i + 2] - localResized.data[i + 2])

		if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
			pixelDiff++
		}
	}

	const totalPixels = (prodResized.data.length / 4) | 0
	const percentDiff = (pixelDiff / totalPixels) * 100

	// Create visual diff image
	const diffBuffer = Buffer.alloc(prodResized.data.length)
	for (let i = 0; i < prodResized.data.length; i += 4) {
		const rDiff = Math.abs(prodResized.data[i] - localResized.data[i])
		const gDiff = Math.abs(prodResized.data[i + 1] - localResized.data[i + 1])
		const bDiff = Math.abs(prodResized.data[i + 2] - localResized.data[i + 2])

		if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
			// Highlight differences in red
			diffBuffer[i] = 255
			diffBuffer[i + 1] = 0
			diffBuffer[i + 2] = 0
			diffBuffer[i + 3] = 255 // Alpha
		} else {
			// Show grayscale for matching areas
			const gray = (prodResized.data[i] + prodResized.data[i + 1] + prodResized.data[i + 2]) / 3
			diffBuffer[i] = gray
			diffBuffer[i + 1] = gray
			diffBuffer[i + 2] = gray
			diffBuffer[i + 3] = 255 // Alpha
		}
	}

	// Save diff image
	await sharp(diffBuffer, {
		raw: {
			width: compareWidth,
			height: compareHeight,
			channels: 4,
		},
	})
		.png()
		.toFile(outputPath)

	// Create side-by-side comparison
	const sideBySidePath = outputPath.replace('diff.png', 'sidebyside.png')

	const prodResizedPng = await prodImage
		.resize(compareWidth, compareHeight, resizeOpts)
		.png()
		.toBuffer()

	const localResizedPng = await localImage
		.resize(compareWidth, compareHeight, resizeOpts)
		.png()
		.toBuffer()

	await sharp({
		create: {
			width: compareWidth * 2,
			height: compareHeight,
			channels: 4,
			background: { r: 255, g: 255, b: 255, alpha: 1 },
		},
	})
		.composite([
			{ input: prodResizedPng, left: 0, top: 0 },
			{ input: localResizedPng, left: compareWidth, top: 0 },
		])
		.png()
		.toFile(sideBySidePath)

	return { pixelDiff, percentDiff, notes }
}

async function compareScreenshots(
	productionUrl: string,
	localUrl: string,
	pages: PageConfig[] = PAGES,
	boundingBoxConfig?: BoundingBoxConfig
): Promise<ComparisonResult[]> {
	const results: ComparisonResult[] = []
	const browser = await chromium.launch({ headless: true })

	const outputDir = join(process.cwd(), '_comparison')
	mkdirSync(outputDir, { recursive: true })

	for (const pageConfig of pages) {
		console.log(`\n🔍 Comparing ${pageConfig.name}...`)

		for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
			console.log(`  ${viewportName} (${viewport.width}x${viewport.height})`)

			const context = await browser.newContext({ viewport })
			const page = await context.newPage()

			try {
				const prodUrl = `${productionUrl}${pageConfig.path}`
				const locUrl = `${localUrl}${pageConfig.path}`

				console.log(`    Production: ${prodUrl}`)
				const prodScreenshot = await takeFullPageScreenshot(page, prodUrl)
				const prodMeta = await sharp(prodScreenshot).metadata()

				console.log(`    Local: ${locUrl}`)
				const localScreenshot = await takeFullPageScreenshot(page, locUrl)
				const localMeta = await sharp(localScreenshot).metadata()

				// Save original screenshots for reference
				const pageDir = join(outputDir, pageConfig.name, viewportName)
				mkdirSync(pageDir, { recursive: true })

				const prodPath = join(pageDir, 'production.png')
				const localPath = join(pageDir, 'local.png')
				const diffPath = join(pageDir, 'diff.png')

				writeFileSync(prodPath, prodScreenshot)
				writeFileSync(localPath, localScreenshot)

				// Select bounding box for this viewport
				const boundingBox = boundingBoxConfig
					? (boundingBoxConfig[viewportName as keyof typeof VIEWPORTS] ??
						boundingBoxConfig.default)
					: undefined

				console.log(`    Comparing...`)
				const comparison = await compareImages(prodScreenshot, localScreenshot, diffPath, boundingBox)

				const result: ComparisonResult = {
					page: pageConfig.name,
					viewport: viewportName,
					productionUrl: prodUrl,
					localUrl: locUrl,
					productionSize: { width: prodMeta.width!, height: prodMeta.height! },
					localSize: { width: localMeta.width!, height: localMeta.height! },
					pixelDifference: comparison.pixelDiff,
					percentDifference: comparison.percentDiff,
					diffImagePath: diffPath,
					notes: comparison.notes,
					boundingBox,
				}

				results.push(result)

				const status = comparison.percentDiff < 1 ? '✅' : comparison.percentDiff < 5 ? '⚠️' : '❌'
				console.log(
					`    ${status} Difference: ${comparison.percentDiff.toFixed(2)}% (${comparison.pixelDiff} pixels)`
				)

				if (comparison.notes.length > 0) {
					comparison.notes.forEach((note) => console.log(`      - ${note}`))
				}
			} catch (error) {
				console.error(`    ❌ Error: ${error}`)
			}

			await context.close()
		}
	}

	await browser.close()

	// Generate summary report
	const reportPath = join(outputDir, 'comparison-report.json')
	writeFileSync(reportPath, JSON.stringify(results, null, 2))
	console.log(`\n📄 Full report saved to: ${reportPath}`)

	// Generate human-readable summary
	const summaryPath = join(outputDir, 'summary.md')
	const summary = generateSummary(results)
	writeFileSync(summaryPath, summary)
	console.log(`📄 Summary saved to: ${summaryPath}`)

	return results
}

function generateSummary(results: ComparisonResult[]): string {
	let md = '# Screenshot Comparison Summary\n\n'

	const perfect = results.filter((r) => r.percentDifference < 1)
	const minor = results.filter((r) => r.percentDifference >= 1 && r.percentDifference < 5)
	const major = results.filter((r) => r.percentDifference >= 5)

	md += `## Overview\n\n`
	md += `- Total comparisons: ${results.length}\n`
	md += `- ✅ Perfect matches (< 1% diff): ${perfect.length}\n`
	md += `- ⚠️ Minor differences (1-5% diff): ${minor.length}\n`
	md += `- ❌ Major differences (> 5% diff): ${major.length}\n`

	// Check if any bounding boxes were used
	const boundingBoxUsed = results.some((r) => r.boundingBox)
	if (boundingBoxUsed) {
		md += `\n**Bounding boxes applied**:\n`
		const bboxesByViewport = new Map<string, BoundingBox>()
		for (const result of results) {
			if (result.boundingBox && !bboxesByViewport.has(result.viewport)) {
				bboxesByViewport.set(result.viewport, result.boundingBox)
			}
		}
		Array.from(bboxesByViewport.entries()).forEach(([viewport, bbox]) => {
			md += `- ${viewport}: x=${bbox.x}, y=${bbox.y}, width=${bbox.width}, height=${bbox.height}\n`
		})
	}

	md += `\n`

	md += `## Details by Page\n\n`

	const byPage = new Map<string, ComparisonResult[]>()
	for (const result of results) {
		if (!byPage.has(result.page)) {
			byPage.set(result.page, [])
		}
		byPage.get(result.page)!.push(result)
	}

	for (const [pageName, pageResults] of byPage) {
		md += `### ${pageName}\n\n`

		for (const result of pageResults) {
			const status =
				result.percentDifference < 1 ? '✅' : result.percentDifference < 5 ? '⚠️' : '❌'
			md += `- **${result.viewport}** ${status}: ${result.percentDifference.toFixed(2)}% difference\n`

			if (result.productionSize.width !== result.localSize.width) {
				md += `  - Width: production ${result.productionSize.width}px → local ${result.localSize.width}px\n`
			}
			if (result.productionSize.height !== result.localSize.height) {
				md += `  - Height: production ${result.productionSize.height}px → local ${result.localSize.height}px\n`
			}

			if (result.notes.length > 0) {
				result.notes.forEach((note) => md += `  - ${note}\n`)
			}
		}
		md += '\n'
	}

	md += `## Files Generated\n\n`
	md += `For each page and viewport:\n`
	md += `- \`production.png\` - Screenshot from production site\n`
	md += `- \`local.png\` - Screenshot from local development\n`
	md += `- \`diff.png\` - Visual diff (red = differences, grayscale = matches)\n`
	md += `- \`sidebyside.png\` - Side-by-side comparison\n\n`

	md += `## AI Guidance\n\n`
	md += `When duplicating the site, focus on:\n\n`

	if (major.length > 0) {
		md += `### Major differences found:\n\n`
		for (const result of major) {
			md += `- **${result.page}** (${result.viewport}): ${result.percentDifference.toFixed(2)}% different\n`
			md += `  - Check: Layout, spacing, typography, colors, component positioning\n`
			md += `  - Visual diff available at: \`${result.diffImagePath}\`\n`
		}
		md += '\n'
	}

	if (minor.length > 0) {
		md += `### Minor differences (may be acceptable):\n\n`
		for (const result of minor) {
			md += `- **${result.page}** (${result.viewport}): ${result.percentDifference.toFixed(2)}% different\n`
		}
		md += '\n'
	}

	return md
}

// Parse command-line arguments
function parseBoundingBox(bboxArg: string): BoundingBox {
	const parts = bboxArg.split(',').map((p) => p.trim())
	if (parts.length !== 4) {
		console.error(`\n❌ Error: Invalid bounding box format: ${bboxArg}`)
		console.log(`\nExpected format: x,y,width,height (e.g., 0,1000,auto,1000)`)
		process.exit(1)
	}

	const x = parseInt(parts[0], 10)
	const y = parseInt(parts[1], 10)
	const width = parts[2] === 'auto' ? 'auto' : parseInt(parts[2], 10)
	const height = parts[3] === 'auto' ? 'auto' : parseInt(parts[3], 10)

	if (isNaN(x) || isNaN(y) || (width !== 'auto' && isNaN(width)) || (height !== 'auto' && isNaN(height))) {
		console.error(`\n❌ Error: Invalid bounding box format: ${bboxArg}`)
		console.log(`\nExpected format: x,y,width,height where width/height can be numbers or "auto"`)
		process.exit(1)
	}

	return { x, y, width, height }
}

function parseArgs() {
	const args = process.argv.slice(2)
	let productionUrl = 'https://tldraw.dev'
	let localUrl = 'http://localhost:3002'
	let pageFilter: string | undefined
	const boundingBoxConfig: BoundingBoxConfig = {}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]

		if (arg === '--bbox' || arg === '--crop') {
			const bboxArg = args[++i]
			if (!bboxArg) {
				console.error(`\n❌ Error: ${arg} requires a value in format: x,y,width,height`)
				console.log(`\nExample: --bbox 0,1000,auto,1000`)
				process.exit(1)
			}
			boundingBoxConfig.default = parseBoundingBox(bboxArg)
		} else if (arg === '--bbox-desktop') {
			const bboxArg = args[++i]
			if (!bboxArg) {
				console.error(`\n❌ Error: ${arg} requires a value in format: x,y,width,height`)
				process.exit(1)
			}
			boundingBoxConfig.desktop = parseBoundingBox(bboxArg)
		} else if (arg === '--bbox-tablet') {
			const bboxArg = args[++i]
			if (!bboxArg) {
				console.error(`\n❌ Error: ${arg} requires a value in format: x,y,width,height`)
				process.exit(1)
			}
			boundingBoxConfig.tablet = parseBoundingBox(bboxArg)
		} else if (arg === '--bbox-mobile') {
			const bboxArg = args[++i]
			if (!bboxArg) {
				console.error(`\n❌ Error: ${arg} requires a value in format: x,y,width,height`)
				process.exit(1)
			}
			boundingBoxConfig.mobile = parseBoundingBox(bboxArg)
		} else if (arg === '--page' || arg === '-p') {
			pageFilter = args[++i]
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Usage: tsx scripts/compare-screenshots.ts [production-url] [local-url] [options]

Arguments:
  production-url        Production URL to compare against (default: https://tldraw.dev)
  local-url            Local development URL (default: http://localhost:3002)

Options:
  --page, -p <name>    Compare only a specific page

  --bbox, --crop <x,y,width,height>
                       Compare only a specific region (applies to all viewports)
                       Use "auto" for width/height to use full viewport dimension
                       Example: --bbox 0,1000,auto,1000

  --bbox-desktop <x,y,width,height>
  --bbox-tablet <x,y,width,height>
  --bbox-mobile <x,y,width,height>
                       Viewport-specific bounding boxes
                       Desktop: 1200px wide, Tablet: 1199px, Mobile: 809px

  --help, -h           Show this help message

Examples:
  # Compare all pages
  tsx scripts/compare-screenshots.ts

  # Compare specific URLs
  tsx scripts/compare-screenshots.ts https://tldraw.dev http://localhost:3000

  # Compare only the home page
  tsx scripts/compare-screenshots.ts --page home

  # Compare a vertical slice from 1000px to 2000px (auto width adapts to viewport)
  tsx scripts/compare-screenshots.ts --bbox 0,1000,auto,1000

  # Compare different regions for each viewport
  tsx scripts/compare-screenshots.ts \\
    --bbox-desktop 0,1000,1200,1000 \\
    --bbox-tablet 0,1000,1199,1000 \\
    --bbox-mobile 0,500,809,800

  # Compare a specific region on a specific page
  tsx scripts/compare-screenshots.ts --page blog --bbox 100,500,800,600
`)
			process.exit(0)
		} else if (!arg.startsWith('--') && !arg.startsWith('-')) {
			// Positional arguments
			if (!productionUrl || productionUrl === 'https://tldraw.dev') {
				productionUrl = arg
			} else if (!localUrl || localUrl === 'http://localhost:3002') {
				localUrl = arg
			} else if (!pageFilter) {
				pageFilter = arg
			}
		}
	}

	return { productionUrl, localUrl, pageFilter, boundingBoxConfig }
}

const { productionUrl, localUrl, pageFilter, boundingBoxConfig } = parseArgs()

// Filter pages if a specific page is requested
const pagesToCompare = pageFilter ? PAGES.filter((p) => p.name === pageFilter) : PAGES

if (pageFilter && pagesToCompare.length === 0) {
	console.error(`\n❌ Error: Page "${pageFilter}" not found`)
	console.log(`\nAvailable pages:`)
	PAGES.forEach((p) => console.log(`  - ${p.name}`))
	process.exit(1)
}

console.log(`\n🔬 Comparing screenshots`)
console.log(`Production: ${productionUrl}`)
console.log(`Local: ${localUrl}`)
if (pageFilter) {
	console.log(`Page filter: ${pageFilter} (${pagesToCompare.length} page)`)
}

// Display bounding box configuration
const hasBoundingBox = Object.keys(boundingBoxConfig).length > 0
if (hasBoundingBox) {
	console.log(`Bounding boxes configured:`)
	if (boundingBoxConfig.default) {
		const bb = boundingBoxConfig.default
		console.log(`  All viewports: x=${bb.x}, y=${bb.y}, width=${bb.width}, height=${bb.height}`)
	}
	if (boundingBoxConfig.desktop) {
		const bb = boundingBoxConfig.desktop
		console.log(`  Desktop: x=${bb.x}, y=${bb.y}, width=${bb.width}, height=${bb.height}`)
	}
	if (boundingBoxConfig.tablet) {
		const bb = boundingBoxConfig.tablet
		console.log(`  Tablet: x=${bb.x}, y=${bb.y}, width=${bb.width}, height=${bb.height}`)
	}
	if (boundingBoxConfig.mobile) {
		const bb = boundingBoxConfig.mobile
		console.log(`  Mobile: x=${bb.x}, y=${bb.y}, width=${bb.width}, height=${bb.height}`)
	}
}
console.log()

compareScreenshots(productionUrl, localUrl, pagesToCompare, hasBoundingBox ? boundingBoxConfig : undefined).catch(console.error)
