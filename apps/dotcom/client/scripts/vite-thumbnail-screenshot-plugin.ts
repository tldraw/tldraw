import type { Browser } from '@playwright/test'
import type { Plugin } from 'vite'

// Stands in for Cloudflare Browser Rendering while developing. The sync worker's screenshot surfaces
// (the MCP tool, the OG queue) need a browser to visit the render page, and local dev has no way to
// reach Browser Run: the dev `BROWSER` binding is deliberately non-functional and `[env.dev]` pins a
// `compatibility_date` older than the `quickAction` method needs. The worker isolate cannot drive a
// browser itself, but this dev server is a Node process that already depends on Playwright, so it
// can — the worker POSTs here and gets the PNG back.
//
// The request body is exactly what the worker would send Browser Run's `/screenshot` Quick Action
// (`getThumbnailScreenshotRequestBody`), so the wait strategy, capture target, and timeout come from
// the same place production gets them and cannot drift here. Note this file is imported by
// `vite.config.ts`, which Node loads directly, so it must not import `@tldraw/dotcom-shared`: that
// package's entry re-exports extensionless paths Node cannot resolve.
//
// This is NOT Browser Run: different Chrome build, different flags, no billing headers. It makes the
// local path work; it is not evidence that a render will succeed in production.
export const LOCAL_SCREENSHOT_PATH = '/__screenshot'

// The only page this will ever open. Deliberately asserted here rather than taken from the request:
// an allowlist the caller supplies is not an allowlist. Mirrors THUMBNAIL_RENDER_PATH.
const RENDER_PATH = '/__thumbnail-render'

export function thumbnailScreenshotPlugin(): Plugin {
	// Chromium takes about a second to start, so it is launched once for the dev server's lifetime
	// rather than per request.
	let browserPromise: Promise<Browser> | undefined

	// Assigns the promise synchronously, so concurrent first requests share one launch instead of
	// each starting a Chromium and orphaning all but the last. Anything that leaves the cached
	// browser unusable — a failed launch, or a crash later on — clears it, so the next request
	// starts a new one rather than every request failing until the dev server restarts.
	function getBrowser() {
		if (!browserPromise) {
			browserPromise = import('@playwright/test')
				.then(({ chromium }) => chromium.launch())
				.then((browser) => {
					browser.on('disconnected', () => {
						browserPromise = undefined
					})
					return browser
				})
				.catch((error) => {
					browserPromise = undefined
					throw error
				})
		}
		return browserPromise
	}

	return {
		name: 'thumbnail-screenshot',
		// Dev server only: this never exists in a built client.
		apply: 'serve',
		configureServer(server) {
			server.httpServer?.on('close', () => {
				browserPromise?.then((browser) => browser.close()).catch(() => {})
				browserPromise = undefined
			})

			server.middlewares.use(LOCAL_SCREENSHOT_PATH, async (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Use POST')
					return
				}
				try {
					const request = parseRequest(JSON.parse(await readBody(req)), req.headers.host)
					const png = await capture(await getBrowser(), request)
					res.statusCode = 200
					res.setHeader('content-type', 'image/png')
					res.end(png)
				} catch (error) {
					// The worker turns any non-200 into a render failure, so this body is only ever read
					// by a developer looking at why a local thumbnail did not appear.
					res.statusCode = 500
					res.end(error instanceof Error ? error.message : String(error))
				}
			})
		},
	}
}

interface ScreenshotRequest {
	captureSelector: string
	height: number
	settledSelector: string
	timeoutMs: number
	url: string
	width: number
}

// Reads the Browser Run `/screenshot` request body the worker sends. Only the render page is
// reachable, and only on this origin: the caller's host is discarded and the path is fixed, so this
// cannot be pointed at an arbitrary URL — the same property production has, where Browser Run is
// never handed a caller-supplied URL.
function parseRequest(body: any, host: string | undefined): ScreenshotRequest {
	if (typeof body?.url !== 'string') throw new Error('url is required')
	const { pathname, search } = new URL(body.url)
	if (pathname !== RENDER_PATH) {
		throw new Error(`Only ${RENDER_PATH} can be captured, got ${pathname}`)
	}

	const settledSelector = body.waitForSelector?.selector
	const captureSelector = body.selector
	const timeoutMs = body.gotoOptions?.timeout
	const { width, height } = body.viewport ?? {}
	if (!settledSelector || !captureSelector || !timeoutMs || !width || !height) {
		throw new Error('Request is not a thumbnail screenshot request body')
	}

	return {
		captureSelector,
		height,
		settledSelector,
		timeoutMs,
		url: new URL(`${RENDER_PATH}${search}`, `http://${host ?? '127.0.0.1'}`).toString(),
		width,
	}
}

// Settle on either terminal marker, then capture the success-only element — the same sequence the
// Quick Action request body asks Browser Run for, so a failed render fails as soon as the page says
// so instead of burning the timeout.
async function capture(browser: Browser, request: ScreenshotRequest) {
	const page = await browser.newPage({
		viewport: { width: request.width, height: request.height },
		deviceScaleFactor: 1,
	})
	try {
		await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: request.timeoutMs })
		await page.waitForSelector(request.settledSelector, { timeout: request.timeoutMs })
		const target = await page.$(request.captureSelector)
		if (!target) {
			const reason = await page.evaluate(() => document.body.dataset.thumbnailError)
			throw new Error(`Render page failed: ${reason || '(no message)'}`)
		}
		return await target.screenshot({ type: 'png' })
	} finally {
		await page.close()
	}
}

function readBody(req: { on(event: string, fn: (chunk?: any) => void): void }) {
	return new Promise<string>((resolve, reject) => {
		let body = ''
		req.on('data', (chunk) => (body += chunk))
		req.on('end', () => resolve(body))
		req.on('error', reject)
	})
}
