import {
	CAPTURE_FORMATS,
	CAPTURE_SCOPES,
	type CaptureFormat,
	type CaptureScope,
} from '../capture/types'
import type { GlyphTier } from '../terminal/chars'
import type { ColorMode } from '../terminal/colors'

/** Parsed command line. `null` means "not given, detect it". */
export interface CliOptions {
	filePath: string | null
	scheme: 'light' | 'dark' | null
	maxFps: number | null
	glyphs: GlyphTier | null
	color: ColorMode | null
	mouse: boolean
	osc52: boolean | null
	debug: boolean
	help: boolean
	/** Written on SIGUSR1, so an agent driving the app can look at it. */
	capture: string | null
	captureScope: CaptureScope
}

export interface CliParseOk {
	ok: true
	options: CliOptions
}

export interface CliParseError {
	ok: false
	error: string
}

export type CliParseResult = CliParseOk | CliParseError

export const MIN_FPS = 30
export const MAX_FPS = 120

const GLYPH_TIERS: readonly GlyphTier[] = ['rich', 'safe', 'ascii']
const COLOR_MODES: readonly ColorMode[] = ['24bit', '256', '16']

export function usage(): string {
	return [
		'Usage: tldraw-tui [file.tldr] [options]',
		'',
		'tldraw in the terminal: draw boxes, arrows, text and freehand strokes, then save as .tldr',
		'or export the canvas as text. Press ? inside the app for the keyboard shortcuts.',
		'',
		'Options:',
		'  --light, --dark      Force the colour scheme instead of detecting the terminal background',
		`  --fps N              Maximum frames per second, ${MIN_FPS} to ${MAX_FPS} (default 60)`,
		'  --glyphs TIER        Glyph set: rich, safe or ascii (ascii works in any font or locale)',
		'  --color DEPTH        Colour depth: 24bit, 256 or 16, instead of detecting it',
		'  --no-mouse           Do not request mouse reporting; use keyboard pointer mode',
		'  --osc52              Also send exported text to the terminal clipboard',
		'  --debug              Show frame timings, bytes per frame and input latency in the status bar',
		'  --capture PATH       On SIGUSR1, write the canvas to PATH (.txt, .svg or .png)',
		'  --capture-scope S    What --capture writes: viewport (default), selection or document',
		'  -h, --help           Show this help',
		'',
		'Run tldraw-tui render --help to draw a .tldr file to text or an image without a terminal.',
		'',
	].join('\n')
}

function defaultOptions(): CliOptions {
	return {
		filePath: null,
		scheme: null,
		maxFps: null,
		glyphs: null,
		color: null,
		mouse: true,
		osc52: null,
		debug: false,
		help: false,
		capture: null,
		captureScope: 'viewport',
	}
}

/** Parses `argv` (without the node and script entries). `--flag=value` and `--flag value` both work. */
export function parseArgs(argv: readonly string[]): CliParseResult {
	const options = defaultOptions()
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '--') {
			for (const rest of argv.slice(i + 1)) {
				if (options.filePath !== null) return { ok: false, error: `Unexpected argument: ${rest}` }
				options.filePath = rest
			}
			break
		}
		if (!arg.startsWith('-') || arg === '-') {
			if (options.filePath !== null) return { ok: false, error: `Unexpected argument: ${arg}` }
			options.filePath = arg
			continue
		}
		const eq = arg.indexOf('=')
		const name = eq === -1 ? arg : arg.slice(0, eq)
		let inlineValue: string | null = eq === -1 ? null : arg.slice(eq + 1)
		const takeValue = (): string | null => {
			if (inlineValue !== null) {
				const v = inlineValue
				inlineValue = null
				return v
			}
			if (i + 1 < argv.length) return argv[++i]
			return null
		}
		switch (name) {
			case '-h':
			case '--help':
				options.help = true
				break
			case '--light':
				options.scheme = 'light'
				break
			case '--dark':
				options.scheme = 'dark'
				break
			case '--no-mouse':
				options.mouse = false
				break
			case '--mouse':
				options.mouse = true
				break
			case '--osc52':
				options.osc52 = true
				break
			case '--no-osc52':
				options.osc52 = false
				break
			case '--debug':
				options.debug = true
				break
			case '--fps': {
				const value = takeValue()
				const fps = value === null ? NaN : Number(value)
				if (!Number.isInteger(fps) || fps < MIN_FPS || fps > MAX_FPS) {
					return { ok: false, error: `--fps needs an integer from ${MIN_FPS} to ${MAX_FPS}` }
				}
				options.maxFps = fps
				break
			}
			case '--glyphs': {
				const value = takeValue()
				if (!GLYPH_TIERS.includes(value as GlyphTier)) {
					return { ok: false, error: `--glyphs needs one of ${GLYPH_TIERS.join(', ')}` }
				}
				options.glyphs = value as GlyphTier
				break
			}
			case '--color': {
				const value = takeValue()
				if (!COLOR_MODES.includes(value as ColorMode)) {
					return { ok: false, error: `--color needs one of ${COLOR_MODES.join(', ')}` }
				}
				options.color = value as ColorMode
				break
			}
			case '--capture': {
				const value = takeValue()
				if (!value) return { ok: false, error: '--capture needs a file path' }
				options.capture = value
				break
			}
			case '--capture-scope': {
				const value = takeValue()
				if (!CAPTURE_SCOPES.includes(value as CaptureScope)) {
					return { ok: false, error: `--capture-scope needs one of ${CAPTURE_SCOPES.join(', ')}` }
				}
				options.captureScope = value as CaptureScope
				break
			}
			default:
				return { ok: false, error: `Unknown option: ${name}` }
		}
		if (inlineValue !== null) return { ok: false, error: `${name} does not take a value` }
	}
	return { ok: true, options }
}

// ---------------------------------------------------------------------------------------------
// tldraw-tui render: draw a .tldr file without a terminal.
// ---------------------------------------------------------------------------------------------

export interface RenderCliOptions {
	filePath: string | null
	scope: CaptureScope
	/** Null: from the --out extension, else text. */
	format: CaptureFormat | null
	/** Null: stdout. */
	out: string | null
	/** Viewport size in terminal cells (8 × 16 px each), as the app's canvas would be. */
	cols: number
	rows: number
	/** Page point at the centre of the viewport; null keeps the zoom-to-fit the app opens with. */
	center: { x: number; y: number } | null
	zoom: number | null
	select: string[]
	page: string | null
	scheme: 'light' | 'dark'
	glyphs: GlyphTier
	/** Image pixels per screen pixel (viewport) or page unit; default 2 for PNG, 1 for SVG. */
	scale: number | null
	help: boolean
}

export interface RenderParseOk {
	ok: true
	options: RenderCliOptions
}

export type RenderParseResult = RenderParseOk | CliParseError

export function renderUsage(): string {
	return [
		'Usage: tldraw-tui render <file.tldr> [options]',
		'',
		"Draws a .tldr file as text (like the terminal shows it) or as an image (tldraw's own SVG",
		'export; PNG is rasterized from it). No terminal needed, so agents and scripts can use it.',
		'',
		'Options:',
		'  --scope S            viewport (default), selection or document',
		'  --format F           text, svg or png (default: from --out, else text)',
		'  -o, --out PATH       Write to PATH instead of stdout',
		'  --size COLSxROWS     Viewport size in terminal cells (default 100x28; a cell is 8x16 px)',
		'  --center X,Y         Page point at the centre of the viewport (default: zoom to fit)',
		'  --zoom Z             Zoom (default: fit for the viewport, 100% for selection and document)',
		'  --select ID,...      Shapes to select, with or without the shape: prefix',
		'  --page NAME|ID       Page to draw (default: the first page)',
		'  --light, --dark      Colour scheme (default light)',
		'  --glyphs TIER        Text glyphs: rich, safe or ascii (default rich)',
		'  --scale N            Image pixels per screen pixel (default 2 for png, 1 for svg)',
		'  -h, --help           Show this help',
		'',
	].join('\n')
}

function parseNumbers(value: string | null, count: number): number[] | null {
	if (value === null) return null
	const parts = value.split(',').map((p) => Number(p.trim()))
	return parts.length === count && parts.every(Number.isFinite) ? parts : null
}

/** Parses the arguments after `render`. */
export function parseRenderArgs(argv: readonly string[]): RenderParseResult {
	const options: RenderCliOptions = {
		filePath: null,
		scope: 'viewport',
		format: null,
		out: null,
		cols: 100,
		rows: 28,
		center: null,
		zoom: null,
		select: [],
		page: null,
		scheme: 'light',
		glyphs: 'rich',
		scale: null,
		help: false,
	}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (!arg.startsWith('-') || arg === '-') {
			if (options.filePath !== null) return { ok: false, error: `Unexpected argument: ${arg}` }
			options.filePath = arg
			continue
		}
		const eq = arg.indexOf('=')
		const name = eq === -1 ? arg : arg.slice(0, eq)
		let inlineValue: string | null = eq === -1 ? null : arg.slice(eq + 1)
		const takeValue = (): string | null => {
			if (inlineValue !== null) {
				const v = inlineValue
				inlineValue = null
				return v
			}
			if (i + 1 < argv.length) return argv[++i]
			return null
		}
		switch (name) {
			case '-h':
			case '--help':
				options.help = true
				break
			case '--light':
				options.scheme = 'light'
				break
			case '--dark':
				options.scheme = 'dark'
				break
			case '--scope': {
				const value = takeValue()
				if (!CAPTURE_SCOPES.includes(value as CaptureScope)) {
					return { ok: false, error: `--scope needs one of ${CAPTURE_SCOPES.join(', ')}` }
				}
				options.scope = value as CaptureScope
				break
			}
			case '--format': {
				const value = takeValue()
				if (!CAPTURE_FORMATS.includes(value as CaptureFormat)) {
					return { ok: false, error: `--format needs one of ${CAPTURE_FORMATS.join(', ')}` }
				}
				options.format = value as CaptureFormat
				break
			}
			case '-o':
			case '--out': {
				const value = takeValue()
				if (!value) return { ok: false, error: `${name} needs a file path` }
				options.out = value
				break
			}
			case '--size': {
				const match = /^(\d+)x(\d+)$/i.exec(takeValue() ?? '')
				const cols = match ? Number(match[1]) : 0
				const rows = match ? Number(match[2]) : 0
				if (cols < 10 || rows < 4 || cols > 1000 || rows > 1000) {
					return { ok: false, error: '--size needs COLSxROWS, from 10x4 to 1000x1000' }
				}
				options.cols = cols
				options.rows = rows
				break
			}
			case '--center': {
				const nums = parseNumbers(takeValue(), 2)
				if (!nums) return { ok: false, error: '--center needs X,Y' }
				options.center = { x: nums[0], y: nums[1] }
				break
			}
			case '--zoom': {
				const nums = parseNumbers(takeValue(), 1)
				if (!nums || nums[0] <= 0) return { ok: false, error: '--zoom needs a positive number' }
				options.zoom = nums[0]
				break
			}
			case '--select': {
				const value = takeValue()
				if (!value) return { ok: false, error: '--select needs shape ids' }
				options.select.push(
					...value
						.split(',')
						.map((id) => id.trim())
						.filter(Boolean)
				)
				break
			}
			case '--page': {
				const value = takeValue()
				if (!value) return { ok: false, error: '--page needs a page name or id' }
				options.page = value
				break
			}
			case '--glyphs': {
				const value = takeValue()
				if (!GLYPH_TIERS.includes(value as GlyphTier)) {
					return { ok: false, error: `--glyphs needs one of ${GLYPH_TIERS.join(', ')}` }
				}
				options.glyphs = value as GlyphTier
				break
			}
			case '--scale': {
				const nums = parseNumbers(takeValue(), 1)
				if (!nums || nums[0] <= 0 || nums[0] > 8) {
					return { ok: false, error: '--scale needs a number above 0, up to 8' }
				}
				options.scale = nums[0]
				break
			}
			default:
				return { ok: false, error: `Unknown option: ${name}` }
		}
		if (inlineValue !== null) return { ok: false, error: `${name} does not take a value` }
	}
	if (!options.help && options.filePath === null) {
		return { ok: false, error: 'render needs a .tldr file' }
	}
	if (options.scope === 'selection' && options.select.length === 0 && !options.help) {
		return { ok: false, error: '--scope selection needs --select' }
	}
	return { ok: true, options }
}
