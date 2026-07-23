import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
} from '@tldraw/dotcom-shared'

// The fixture page owns the per-fixture snapshots and camera defaults; this script only names one.
const FIXTURE_NAMES = ['snapshot-example', 'layer-panel'] as const

// The same terminal markers the production worker waits on: the page marks success with
// data-thumbnail-ready once the export has painted, and any failure with data-thumbnail-error.
const SETTLED_SELECTOR = '[data-thumbnail-ready="true"], [data-thumbnail-error]'
const CAPTURE_SELECTOR = 'body[data-thumbnail-ready="true"]'
const CAPTURE_TIMEOUT_MS = 45_000

type FixtureName = (typeof FIXTURE_NAMES)[number]
type Mode = 'auto' | 'browser-run' | 'local'

interface Options {
	baseUrl: string
	fixture: FixtureName
	height: number
	mode: Mode
	output: string
	theme: 'light' | 'dark'
	width: number
	x?: number
	y?: number
	z?: number
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const renderUrl = buildRenderUrl(options)
	const mode = chooseMode(options.mode, options.baseUrl)

	writeLine(`Rendering ${renderUrl}`)
	writeLine(`Mode: ${mode}`)

	const png =
		mode === 'browser-run'
			? await captureWithBrowserRun(renderUrl, options)
			: await captureWithLocalPlaywright(renderUrl, options)

	const outputPath = path.resolve(options.output)
	await mkdir(path.dirname(outputPath), { recursive: true })
	await writeFile(outputPath, png)
	writeLine(`Wrote ${outputPath}`)
}

function parseArgs(args: string[]): Options {
	const options: Options = {
		baseUrl: 'http://127.0.0.1:3000',
		fixture: 'snapshot-example',
		height: DEFAULT_THUMBNAIL_HEIGHT,
		mode: 'auto',
		output: 'tmp/browser-run-thumbnail/thumbnail.png',
		theme: 'light',
		width: DEFAULT_THUMBNAIL_WIDTH,
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		const next = args[i + 1]
		switch (arg) {
			case '--base-url':
				options.baseUrl = requireValue(arg, next)
				i++
				break
			case '--fixture':
				options.fixture = requireFixture(requireValue(arg, next))
				i++
				break
			case '--mode':
				options.mode = requireMode(requireValue(arg, next))
				i++
				break
			case '--output':
				options.output = requireValue(arg, next)
				i++
				break
			case '--theme':
				options.theme = requireTheme(requireValue(arg, next))
				i++
				break
			case '--width':
				options.width = requireDimension(arg, next)
				i++
				break
			case '--height':
				options.height = requireDimension(arg, next)
				i++
				break
			case '--x':
			case '--y':
			case '--z':
				options[arg.slice(2) as 'x' | 'y' | 'z'] = requireNumber(arg, next)
				i++
				break
			case '--help':
				printHelp()
				process.exit(0)
			default:
				throw new Error(`Unknown argument: ${arg}`)
		}
	}

	return options
}

function buildRenderUrl(options: Options) {
	const url = new URL('/dev/browser-run-thumbnail', options.baseUrl)
	url.searchParams.set('fixture', options.fixture)

	// Camera params are only sent when explicitly overridden; the fixture page owns the per-fixture
	// camera defaults.
	if (options.x !== undefined) url.searchParams.set('x', String(options.x))
	if (options.y !== undefined) url.searchParams.set('y', String(options.y))
	if (options.z !== undefined) url.searchParams.set('z', String(options.z))
	url.searchParams.set('width', String(options.width))
	url.searchParams.set('height', String(options.height))
	url.searchParams.set('theme', options.theme)

	return url.toString()
}

function chooseMode(mode: Mode, baseUrl: string): Mode {
	if (mode !== 'auto') return mode
	// Browser Run executes inside Cloudflare and cannot reach a local dev server, so a loopback
	// base URL always uses the local Playwright path even when Cloudflare credentials are present.
	if (isLoopbackHost(baseUrl)) return 'local'
	if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
		return 'browser-run'
	}
	return 'local'
}

function isLoopbackHost(baseUrl: string) {
	try {
		const { hostname } = new URL(baseUrl)
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
	} catch {
		return false
	}
}

async function captureWithBrowserRun(renderUrl: string, options: Options) {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = process.env.CLOUDFLARE_API_TOKEN
	if (!accountId || !apiToken) {
		throw new Error(
			'Browser Run mode requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN with Browser Rendering - Edit permission.'
		)
	}

	const browserRunFetch = globalThis.fetch.bind(globalThis)
	const response = await browserRunFetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(getBrowserRunRequestBody(renderUrl, options)),
		}
	)

	if (!response.ok) {
		throw new Error(`Browser Run failed (${response.status}): ${await response.text()}`)
	}

	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes('image/png') && !contentType.includes('application/octet-stream')) {
		throw new Error(`Browser Run returned ${contentType}: ${await response.text()}`)
	}

	return Buffer.from(await response.arrayBuffer())
}

// Mirrors the production worker's screenshot request (see getScreenshotRequestBody in
// apps/dotcom/sync-worker/src/routes/tla/thumbnailRender.ts): navigation stops at domcontentloaded
// (waiting for `load` can stall on a single slow subresource even though the page marked itself
// ready), the wait resolves on either terminal marker so failed renders fail fast, and the capture
// targets a success-only element so an error page returns an error rather than a screenshot of it.
function getBrowserRunRequestBody(renderUrl: string, options: Options) {
	const headers = getExtraHeaders(renderUrl)
	return {
		url: renderUrl,
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		viewport: {
			width: options.width,
			height: options.height,
			deviceScaleFactor: 1,
		},
		gotoOptions: {
			waitUntil: 'domcontentloaded',
			timeout: CAPTURE_TIMEOUT_MS,
		},
		waitForSelector: {
			selector: SETTLED_SELECTOR,
			timeout: CAPTURE_TIMEOUT_MS,
		},
		selector: CAPTURE_SELECTOR,
		screenshotOptions: {
			type: 'png',
			fullPage: false,
		},
	}
}

function getExtraHeaders(renderUrl: string) {
	const { hostname } = new URL(renderUrl)
	if (hostname.endsWith('.ngrok-free.dev')) {
		return {
			'ngrok-skip-browser-warning': 'true',
		}
	}
	return null
}

// The fixture page produces the thumbnail itself with editor.toImage and exposes it as a data
// URL, so the local path reads the exact export bytes instead of screenshotting the viewport.
async function captureWithLocalPlaywright(renderUrl: string, options: Options) {
	const { chromium } = await import('@playwright/test')
	const browser = await chromium.launch()
	try {
		const page = await browser.newPage({
			viewport: { width: options.width, height: options.height },
			deviceScaleFactor: 1,
		})
		// The terminal selectors are the real completion signal; waiting for network idle is both
		// unnecessary and fragile (background app requests like replicator-status polling can keep
		// the network busy indefinitely). Waiting on the error marker too makes a failed render fail
		// immediately with the page's own message instead of timing out.
		await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: CAPTURE_TIMEOUT_MS })
		await page.waitForSelector(SETTLED_SELECTOR, { timeout: CAPTURE_TIMEOUT_MS })
		const renderError = await page.evaluate(() => document.body.dataset.thumbnailError)
		if (renderError !== undefined) {
			throw new Error(`Fixture page failed to render: ${renderError}`)
		}
		const dataUrl = await page.evaluate(
			() => (window as any).__tldrawThumbnailDataUrl as string | undefined
		)
		const prefix = 'data:image/png;base64,'
		if (!dataUrl?.startsWith(prefix)) {
			throw new Error('Fixture page did not produce a thumbnail data URL')
		}
		return Buffer.from(dataUrl.slice(prefix.length), 'base64')
	} finally {
		await browser.close()
	}
}

function requireValue(arg: string, value: string | undefined) {
	if (!value) throw new Error(`${arg} requires a value`)
	return value
}

function requireFixture(value: string): FixtureName {
	if ((FIXTURE_NAMES as readonly string[]).includes(value)) return value as FixtureName
	throw new Error(`Unknown fixture: ${value}`)
}

function requireMode(value: string): Mode {
	if (value === 'auto' || value === 'browser-run' || value === 'local') return value
	throw new Error(`Unknown mode: ${value}`)
}

function requireTheme(value: string): 'light' | 'dark' {
	if (value === 'light' || value === 'dark') return value
	throw new Error(`Unknown theme: ${value}`)
}

function requireDimension(arg: string, value: string | undefined) {
	const number = Math.floor(requireNumber(arg, value))
	if (number < MIN_THUMBNAIL_DIMENSION || number > MAX_THUMBNAIL_DIMENSION) {
		throw new Error(
			`${arg} must be between ${MIN_THUMBNAIL_DIMENSION} and ${MAX_THUMBNAIL_DIMENSION}`
		)
	}
	return number
}

function requireNumber(arg: string, value: string | undefined) {
	const number = Number(requireValue(arg, value))
	if (!Number.isFinite(number)) throw new Error(`${arg} must be a finite number`)
	return number
}

function printHelp() {
	writeLine(`Usage:
  yarn workspace dotcom browser-run-thumbnail [options]

Options:
  --base-url <url>      Origin running the dotcom client. Default: http://127.0.0.1:3000
  --fixture <name>      ${FIXTURE_NAMES.join(' | ')}. Default: snapshot-example
  --mode <mode>         auto | browser-run | local. Default: auto
  --output <path>       PNG output path. Default: tmp/browser-run-thumbnail/thumbnail.png
  --theme <theme>       light | dark. Default: light
  --width <number>      Output width, ${MIN_THUMBNAIL_DIMENSION}-${MAX_THUMBNAIL_DIMENSION}. Default: ${DEFAULT_THUMBNAIL_WIDTH}
  --height <number>     Output height, ${MIN_THUMBNAIL_DIMENSION}-${MAX_THUMBNAIL_DIMENSION}. Default: ${DEFAULT_THUMBNAIL_HEIGHT}
  --x <number>          Camera x override (defaults to the fixture's own camera)
  --y <number>          Camera y override (defaults to the fixture's own camera)
  --z <number>          Camera zoom override (defaults to the fixture's own camera)

Captures the dev-only /dev/browser-run-thumbnail fixture page for local iteration on render
behavior. The fixture page produces the image with editor.toImage; local mode reads the exact
export bytes, while browser-run mode screenshots the page after it has swapped to displaying
the export. It does not accept arbitrary screenshot URLs.`)
}

function writeLine(message: string) {
	process.stdout.write(`${message}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		process.stderr.write(
			`${error instanceof Error ? error.stack || error.message : String(error)}\n`
		)
		process.exit(1)
	})
}
