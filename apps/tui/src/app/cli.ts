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
		'  -h, --help           Show this help',
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
			default:
				return { ok: false, error: `Unknown option: ${name}` }
		}
		if (inlineValue !== null) return { ok: false, error: `${name} does not take a value` }
	}
	return { ok: true, options }
}
