import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'

const WIDTH = 1200
const HEIGHT = 630

const fixtureDefaults = {
	'snapshot-example': { x: 310, y: 120, z: 0.55 },
	'layer-panel': { x: 340, y: 120, z: 0.82 },
} as const

type FixtureName = keyof typeof fixtureDefaults
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
		height: HEIGHT,
		mode: 'auto',
		output: 'tmp/browser-run-thumbnail-spike/thumbnail.png',
		theme: 'light',
		width: WIDTH,
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

	const defaults = fixtureDefaults[options.fixture]
	url.searchParams.set('x', String(options.x ?? defaults.x))
	url.searchParams.set('y', String(options.y ?? defaults.y))
	url.searchParams.set('z', String(options.z ?? defaults.z))
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
			waitUntil: 'networkidle0',
			timeout: 45_000,
		},
		waitForSelector: {
			selector: '[data-thumbnail-ready="true"]',
			timeout: 45_000,
		},
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

async function captureWithLocalPlaywright(renderUrl: string, options: Options) {
	const { chromium } = await import('@playwright/test')
	const browser = await chromium.launch()
	try {
		const page = await browser.newPage({
			viewport: { width: options.width, height: options.height },
			deviceScaleFactor: 1,
		})
		await page.goto(renderUrl, { waitUntil: 'networkidle', timeout: 45_000 })
		await page.waitForSelector('[data-thumbnail-ready="true"]', { timeout: 45_000 })
		return await page.screenshot({ type: 'png', fullPage: false })
	} finally {
		await browser.close()
	}
}

function requireValue(arg: string, value: string | undefined) {
	if (!value) throw new Error(`${arg} requires a value`)
	return value
}

function requireFixture(value: string): FixtureName {
	if (value === 'snapshot-example' || value === 'layer-panel') return value
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
	if (number < 200 || number > 1600) throw new Error(`${arg} must be between 200 and 1600`)
	return number
}

function requireNumber(arg: string, value: string | undefined) {
	const number = Number(requireValue(arg, value))
	if (!Number.isFinite(number)) throw new Error(`${arg} must be a finite number`)
	return number
}

function printHelp() {
	writeLine(`Usage:
  yarn workspace dotcom browser-run-thumbnail-spike [options]

Options:
  --base-url <url>      Origin running the dotcom client. Default: http://127.0.0.1:3000
  --fixture <name>      snapshot-example | layer-panel. Default: snapshot-example
  --mode <mode>         auto | browser-run | local. Default: auto
  --output <path>       PNG output path. Default: tmp/browser-run-thumbnail-spike/thumbnail.png
  --theme <theme>       light | dark. Default: light
  --width <number>      Output width, 200-1600. Default: 1200
  --height <number>     Output height, 200-1600. Default: 630
  --x <number>          Camera x override
  --y <number>          Camera y override
  --z <number>          Camera zoom override

The Browser Run path constructs a fixed /dev/browser-run-thumbnail URL and does not accept
arbitrary screenshot URLs.`)
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
