import { createHmac } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
	THUMBNAIL_SETTLED_SELECTOR,
	getThumbnailScreenshotRequestBody,
} from '@tldraw/dotcom-shared'

// The fixture page owns the per-fixture snapshots and camera defaults; this script only names one.
const FIXTURE_NAMES = ['snapshot-example', 'layer-panel'] as const

// The render token secret is never hardcoded here: locally it is the placeholder in the sync
// worker's `[env.dev.vars]`, and deployed environments have a real one.
const RENDER_TOKEN_SECRET_ENV = 'MCP_SCREENSHOT_TOKEN_SECRET'

type FixtureName = (typeof FIXTURE_NAMES)[number]
type Mode = 'auto' | 'browser-run' | 'local'
type BoardKind = 'published' | 'shared_file'

interface Board {
	kind: BoardKind
	slug: string
}

interface Options {
	baseUrl: string
	board?: Board
	fixture: FixtureName
	height: number
	mode: Mode
	output: string
	secret?: string
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

	// The board render URL carries a signed token, so log the board rather than the URL.
	const { board } = options
	writeLine(`Rendering ${board ? `${board.kind} board ${board.slug}` : renderUrl}`)
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
		secret: process.env[RENDER_TOKEN_SECRET_ENV],
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
			case '--board':
				options.board = parseBoard(requireValue(arg, next))
				i++
				break
			case '--secret':
				options.secret = requireValue(arg, next)
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

	// A board always renders content-fit, so a camera override would be silently dropped.
	if (options.board && (options.x ?? options.y ?? options.z) !== undefined) {
		throw new Error('--x, --y and --z are fixture-only; --board always fits the board content.')
	}

	return options
}

// A board URL (https://www.tldraw.com/p/:slug or /f/:slug) or just its path. The path prefix is what
// says which kind of board it is, so taking the whole link avoids having to name the kind separately
// — and refusing anything else means a room or snapshot link fails here rather than as a 404 later.
// Only the path is read: the capture still goes to --base-url.
function parseBoard(value: string): Board {
	let pathname = value
	if (/^https?:\/\//i.test(value)) {
		try {
			pathname = new URL(value).pathname
		} catch {
			throw new Error(`--board is not a valid URL: ${value}`)
		}
	}
	const [prefix, slug] = pathname.split('/').filter(Boolean)
	if (slug && prefix === 'p') return { kind: 'published', slug }
	if (slug && prefix === 'f') return { kind: 'shared_file', slug }
	throw new Error(`--board must be a /p/:slug or /f/:slug board link or path, got: ${value}`)
}

// The signed render job the sync-worker mints in thumbnailRender.ts, minted here so a local capture
// can drive the real render page without Cloudflare credentials. `version` only rotates the worker's
// R2 cache key and is not checked when the render page exchanges the token, so it is fixed here.
function mintRenderToken(options: Options, board: Board) {
	const secret = options.secret
	if (!secret) {
		throw new Error(
			`--board needs the render token secret. Pass --secret, or set ${RENDER_TOKEN_SECRET_ENV} to the value from the sync worker's [env.dev.vars].`
		)
	}
	const job = {
		v: 1,
		kind: board.kind,
		slug: board.slug,
		version: 'local',
		camera: 'content',
		x: 0,
		y: 0,
		z: 1,
		width: options.width,
		height: options.height,
		theme: options.theme,
		exp: Date.now() + 5 * 60_000,
	}
	// Matches base64UrlEncode in the worker's utils/base64.ts.
	const payload = Buffer.from(JSON.stringify(job)).toString('base64url')
	const signature = createHmac('sha256', secret).update(payload).digest('base64url')
	return `${payload}.${signature}`
}

function buildRenderUrl(options: Options) {
	// A board renders through the same production render page that Browser Run visits, so a local
	// capture exercises real board resolution and the real render page rather than the fixture page.
	if (options.board) {
		const url = new URL(THUMBNAIL_RENDER_PATH, options.baseUrl)
		url.searchParams.set('token', mintRenderToken(options, options.board))
		return url.toString()
	}

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
			body: JSON.stringify(
				// The exact request body the production worker sends its Quick Action, so this path
				// exercises the same wait strategy, terminal selectors, and capture target.
				getThumbnailScreenshotRequestBody({
					renderUrl,
					width: options.width,
					height: options.height,
					timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
				})
			),
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

// The fixture page produces the thumbnail itself with editor.toImage and exposes it as a data
// URL, so the local path reads the exact export bytes instead of screenshotting the viewport. The
// production render page has no such affordance, so a board capture screenshots the viewport —
// equivalent to Browser Run's THUMBNAIL_CAPTURE_SELECTOR, which targets a body that fills it.
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
		await page.goto(renderUrl, {
			waitUntil: 'domcontentloaded',
			timeout: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
		await page.waitForSelector(THUMBNAIL_SETTLED_SELECTOR, {
			timeout: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
		const renderError = await page.evaluate(() => document.body.dataset.thumbnailError)
		if (renderError !== undefined) {
			throw new Error(
				`${options.board ? 'Render' : 'Fixture'} page failed to render: ${renderError || '(no message)'}`
			)
		}
		if (options.board) {
			return await page.screenshot({ type: 'png' })
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
  --board <link>        Capture a real board through the production render page instead of a
                        fixture. Takes a /p/:slug or /f/:slug board link or path; only the
                        path is read, so the capture still goes to --base-url
  --secret <secret>     Render token secret, required by --board. Defaults to
                        MCP_SCREENSHOT_TOKEN_SECRET. Locally this is the placeholder in the
                        sync worker's [env.dev.vars]
  --fixture <name>      ${FIXTURE_NAMES.join(' | ')}. Default: snapshot-example
  --mode <mode>         auto | browser-run | local. Default: auto
  --output <path>       PNG output path. Default: tmp/browser-run-thumbnail/thumbnail.png
  --theme <theme>       light | dark. Default: light
  --width <number>      Output width, ${MIN_THUMBNAIL_DIMENSION}-${MAX_THUMBNAIL_DIMENSION}. Default: ${DEFAULT_THUMBNAIL_WIDTH}
  --height <number>     Output height, ${MIN_THUMBNAIL_DIMENSION}-${MAX_THUMBNAIL_DIMENSION}. Default: ${DEFAULT_THUMBNAIL_HEIGHT}
  --x <number>          Camera x override, fixture only (defaults to the fixture's own camera)
  --y <number>          Camera y override, fixture only (defaults to the fixture's own camera)
  --z <number>          Camera zoom override, fixture only (defaults to the fixture's camera)

Captures the dev-only /dev/browser-run-thumbnail fixture page for local iteration on render
behavior. The fixture page produces the image with editor.toImage; local mode reads the exact
export bytes, while browser-run mode screenshots the page after it has swapped to displaying
the export. It does not accept arbitrary screenshot URLs.

With --board it instead renders the production ${THUMBNAIL_RENDER_PATH} page, signing its own
render token, so a local capture exercises real board resolution and the real render page. That
covers everything the MCP screenshot tool does except the Browser Run call itself, which local
dev cannot make (the dev BROWSER binding is deliberately non-functional).`)
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
