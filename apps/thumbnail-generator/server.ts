import express from 'express'
import { existsSync, readdirSync } from 'fs'
import { Browser, chromium } from 'playwright-core'

const VIEWER_URL = process.env.VIEWER_URL ?? 'http://localhost:5421'
const PORT = parseInt(process.env.PORT ?? '5422', 10)

// Comma-separated list of allowed URL patterns for the /api/screenshot endpoint.
// Supports exact origins or wildcard subdomains (e.g. "https://*.example.com").
// If empty, only the VIEWER_URL origin is allowed.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean)

let browser: Browser

function isUrlAllowed(url: string): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return false
	}

	// Block non-http(s) schemes
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return false
	}

	// Block requests to private/internal IPs
	const hostname = parsed.hostname
	if (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		hostname === '0.0.0.0' ||
		hostname.startsWith('10.') ||
		hostname.startsWith('192.168.') ||
		hostname.startsWith('172.') ||
		hostname === '169.254.169.254' ||
		hostname.endsWith('.internal') ||
		hostname.endsWith('.local')
	) {
		return false
	}

	// If no allowlist configured, block all (screenshot endpoint is opt-in)
	if (ALLOWED_ORIGINS.length === 0) {
		return false
	}

	const origin = parsed.origin
	for (const pattern of ALLOWED_ORIGINS) {
		if (pattern.includes('*')) {
			// Wildcard match: "https://*.example.com" matches "https://foo.example.com"
			const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$')
			if (regex.test(origin)) return true
		} else {
			if (origin === pattern) return true
		}
	}

	return false
}

/**
 * Find a Chromium executable. Checks Playwright cache directories, then
 * falls back to common system paths.
 */
function findChromiumExecutable(): string | undefined {
	const cacheDir =
		process.env.PLAYWRIGHT_BROWSERS_PATH ?? `${process.env.HOME}/.cache/ms-playwright`

	const candidates = [
		// Prefer headless shell for server-side rendering (smaller, faster)
		...(() => {
			try {
				const dirs = readdirSync(cacheDir)
				return dirs
					.filter((d: string) => d.startsWith('chromium_headless_shell-'))
					.sort()
					.reverse()
					.map((d: string) => `${cacheDir}/${d}/chrome-linux/headless_shell`)
			} catch {
				return []
			}
		})(),
		// Fall back to full chromium
		...(() => {
			try {
				const dirs = readdirSync(cacheDir)
				return dirs
					.filter((d: string) => d.startsWith('chromium-'))
					.sort()
					.reverse()
					.map((d: string) => `${cacheDir}/${d}/chrome-linux/chrome`)
			} catch {
				return []
			}
		})(),
		// Common system locations
		'/usr/bin/chromium-browser',
		'/usr/bin/chromium',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
	]

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate
		}
	}
	return undefined
}

async function init() {
	const executablePath = findChromiumExecutable()

	if (executablePath) {
		console.log(`Using Chromium at: ${executablePath}`)
	} else {
		console.log(`No Chromium found, letting Playwright find its own.`)
	}

	browser = await chromium.launch({
		executablePath,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-gpu',
			'--disable-web-security',
		],
	})
	console.log(`Browser launched`)
	console.log(`Viewer URL: ${VIEWER_URL}`)
}

const app = express()
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/health', (_req, res) => {
	res.json({ ok: true, viewer: VIEWER_URL })
})

/**
 * Generate a thumbnail from a tldraw snapshot.
 *
 * POST /api/thumbnail
 * Body: {
 *   snapshot: TLEditorSnapshot (required) - the tldraw document snapshot
 *   pageId?: string - which page to render (defaults to first page)
 *   bounds?: { x, y, w, h } - specific viewport bounds (defaults to zoom-to-fit)
 *   width?: number - viewport width in pixels (default 1200)
 *   height?: number - viewport height in pixels (default 630)
 *   scale?: number - device pixel ratio for higher-res output (default 2)
 * }
 *
 * Returns: PNG image
 */
app.post('/api/thumbnail', async (req, res) => {
	const startTime = Date.now()

	try {
		const { snapshot, pageId, bounds, width = 1200, height = 630, scale = 2 } = req.body

		if (!snapshot) {
			res.status(400).json({ error: 'snapshot is required in request body' })
			return
		}

		// Create a context with the desired device scale factor for high-DPI output.
		// Declared outside try so the finally block can always clean it up,
		// even if newPage() fails after context creation.
		let context
		try {
			context = await browser.newContext({
				viewport: { width, height },
				deviceScaleFactor: scale,
			})
			const page = await context.newPage()

			// Navigate to the viewer
			await page.goto(VIEWER_URL, { waitUntil: 'domcontentloaded' })
			await page.waitForFunction(() => window.__tldraw_ready === true, undefined, {
				timeout: 15000,
			})

			// Load the snapshot into the tldraw editor
			await page.evaluate(
				({ snapshot, pageId, bounds }) => {
					window.__tldraw_loadSnapshot(snapshot, { pageId, bounds })
				},
				{ snapshot, pageId, bounds }
			)

			// Give tldraw time to render. This is crude but works for the prototype.
			// In production, you'd want a more robust signal (e.g. checking that all
			// shapes have rendered, images have loaded, etc.)
			await page.waitForTimeout(500)

			// Take the screenshot
			const screenshot = await page.screenshot({ type: 'png' })

			const elapsed = Date.now() - startTime
			console.log(`Thumbnail generated in ${elapsed}ms (${width}x${height} @ ${scale}x)`)

			res.set('Content-Type', 'image/png')
			res.set('X-Generation-Time', `${elapsed}ms`)
			res.send(screenshot)
		} finally {
			await context?.close()
		}
	} catch (err) {
		console.error('Error generating thumbnail:', err)
		res.status(500).json({ error: 'Failed to generate thumbnail', details: String(err) })
	}
})

/**
 * Generate a thumbnail by visiting a URL directly.
 * Useful for generating thumbnails from a live multiplayer room.
 *
 * GET /api/screenshot?url=<url>&width=<w>&height=<h>&scale=<s>
 */
app.get('/api/screenshot', async (req, res) => {
	const startTime = Date.now()

	try {
		const url = req.query.url as string
		const width = parseInt((req.query.width as string) ?? '1200', 10)
		const height = parseInt((req.query.height as string) ?? '630', 10)
		const scale = parseInt((req.query.scale as string) ?? '2', 10)

		if (!url) {
			res.status(400).json({ error: 'url query parameter is required' })
			return
		}

		if (!isUrlAllowed(url)) {
			res.status(403).json({
				error: 'URL not allowed',
				details:
					'Configure ALLOWED_ORIGINS env var with permitted origins (e.g. "https://example.com,https://*.tldraw.com")',
			})
			return
		}

		let context
		try {
			context = await browser.newContext({
				viewport: { width, height },
				deviceScaleFactor: scale,
			})
			const page = await context.newPage()

			await page.goto(url, { waitUntil: 'networkidle' })
			await page.waitForTimeout(2000)

			const screenshot = await page.screenshot({ type: 'png' })

			const elapsed = Date.now() - startTime
			console.log(`Screenshot of ${url} generated in ${elapsed}ms`)

			res.set('Content-Type', 'image/png')
			res.set('X-Generation-Time', `${elapsed}ms`)
			res.send(screenshot)
		} finally {
			await context?.close()
		}
	} catch (err) {
		console.error('Error taking screenshot:', err)
		res.status(500).json({ error: 'Failed to take screenshot', details: String(err) })
	}
})

init().then(() => {
	app.listen(PORT, () => {
		console.log(`Thumbnail server running at http://localhost:${PORT}`)
		console.log(``)
		console.log(`Endpoints:`)
		console.log(`  POST /api/thumbnail   - Generate thumbnail from a snapshot`)
		console.log(`  GET  /api/screenshot  - Screenshot any URL`)
		console.log(`  GET  /health          - Health check`)
	})
})
