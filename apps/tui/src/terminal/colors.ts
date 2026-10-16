/** 0xRRGGBB packed colour; -1 means the terminal's default colour. */
export type Rgb = number

export type ColorMode = '24bit' | '256' | '16'

export interface ParsedColor {
	rgb: Rgb
	alpha: number
}

export function packRgb(r: number, g: number, b: number): Rgb {
	return (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)
}

export function redOf(rgb: Rgb): number {
	return (rgb >> 16) & 0xff
}

export function greenOf(rgb: Rgb): number {
	return (rgb >> 8) & 0xff
}

export function blueOf(rgb: Rgb): number {
	return rgb & 0xff
}

function clamp255(v: number): number {
	return v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v)
}

function clamp01(v: number): number {
	return v <= 0 ? 0 : v >= 1 ? 1 : v
}

const NAMED_COLORS_SRC =
	'aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,' +
	'bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,' +
	'burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,' +
	'cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,' +
	'darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,' +
	'darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,' +
	'darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,' +
	'darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,' +
	'dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,' +
	'forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,' +
	'goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,' +
	'hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,' +
	'lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,' +
	'lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,' +
	'lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,' +
	'lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,' +
	'lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,' +
	'mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,' +
	'mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,' +
	'mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,' +
	'navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,olivedrab:6b8e23,orange:ffa500,' +
	'orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,' +
	'palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,' +
	'powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,' +
	'royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,' +
	'seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,' +
	'slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,' +
	'thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,' +
	'whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32'

let namedColors: Map<string, number> | null = null

function getNamedColors(): Map<string, number> {
	if (!namedColors) {
		namedColors = new Map()
		for (const entry of NAMED_COLORS_SRC.split(',')) {
			const [name, hex] = entry.split(':')
			namedColors.set(name, parseInt(hex, 16))
		}
	}
	return namedColors
}

export function namedColorCount(): number {
	return getNamedColors().size
}

const cache = new Map<string, ParsedColor | null>()
const CACHE_LIMIT = 4096

/**
 * Parses a CSS colour: #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba() and hsl()/hsla() in comma or
 * space syntax with an optional number or percent alpha (tldraw's theme uses `hsl(0, 0%, 56%, 10.2%)`),
 * the CSS named colours, `transparent`/`none`, and `color(display-p3 r g b / a)` taken as sRGB.
 * Returns null for anything else. Results are cached because overlays set the same few strings every frame.
 */
export function parseColor(input: string): ParsedColor | null {
	const cached = cache.get(input)
	if (cached !== undefined) return cached
	const result = parseColorUncached(input)
	if (cache.size >= CACHE_LIMIT) cache.clear()
	cache.set(input, result)
	return result
}

function parseColorUncached(input: string): ParsedColor | null {
	const s = input.trim().toLowerCase()
	if (s.length === 0) return null
	if (s === 'transparent' || s === 'none') return { rgb: 0, alpha: 0 }
	if (s.charCodeAt(0) === 0x23) return parseHex(s)
	const paren = s.indexOf('(')
	if (paren > 0 && s.endsWith(')')) {
		const fn = s.slice(0, paren).trim()
		const body = s.slice(paren + 1, -1)
		switch (fn) {
			case 'rgb':
			case 'rgba':
				return parseRgbFunction(body)
			case 'hsl':
			case 'hsla':
				return parseHslFunction(body)
			case 'color':
				return parseColorFunction(body)
			default:
				return null
		}
	}
	const named = getNamedColors().get(s)
	if (named !== undefined) return { rgb: named, alpha: 1 }
	return null
}

function parseHex(s: string): ParsedColor | null {
	const hex = s.slice(1)
	if (!/^[0-9a-f]+$/.test(hex)) return null
	switch (hex.length) {
		case 3:
		case 4: {
			const r = parseInt(hex[0] + hex[0], 16)
			const g = parseInt(hex[1] + hex[1], 16)
			const b = parseInt(hex[2] + hex[2], 16)
			const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
			return { rgb: packRgb(r, g, b), alpha: a }
		}
		case 6:
		case 8: {
			const rgb = parseInt(hex.slice(0, 6), 16)
			const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
			return { rgb, alpha: a }
		}
		default:
			return null
	}
}

/** Splits a function body into its arguments; `/` before the alpha is treated as a separator. */
function splitArgs(body: string): string[] {
	return body
		.replace(/\//g, ' ')
		.split(/[\s,]+/)
		.filter((t) => t.length > 0)
}

function parseNumber(token: string): number | null {
	const v = Number(token)
	return Number.isFinite(v) ? v : null
}

/** A channel given as a number (0–255) or percentage. */
function parseChannel(token: string): number | null {
	if (token.endsWith('%')) {
		const v = parseNumber(token.slice(0, -1))
		return v === null ? null : (v * 255) / 100
	}
	return parseNumber(token)
}

function parseAlpha(token: string | undefined): number | null {
	if (token === undefined) return 1
	if (token.endsWith('%')) {
		const v = parseNumber(token.slice(0, -1))
		return v === null ? null : clamp01(v / 100)
	}
	const v = parseNumber(token)
	return v === null ? null : clamp01(v)
}

function parseRgbFunction(body: string): ParsedColor | null {
	const args = splitArgs(body)
	if (args.length < 3 || args.length > 4) return null
	const r = parseChannel(args[0])
	const g = parseChannel(args[1])
	const b = parseChannel(args[2])
	const a = parseAlpha(args[3])
	if (r === null || g === null || b === null || a === null) return null
	return { rgb: packRgb(r, g, b), alpha: a }
}

function parseHue(token: string): number | null {
	let t = token
	let unit = 'deg'
	for (const u of ['deg', 'grad', 'rad', 'turn']) {
		if (t.endsWith(u)) {
			unit = u
			t = t.slice(0, -u.length)
			break
		}
	}
	const v = parseNumber(t)
	if (v === null) return null
	switch (unit) {
		case 'grad':
			return v * 0.9
		case 'rad':
			return (v * 180) / Math.PI
		case 'turn':
			return v * 360
		default:
			return v
	}
}

function parsePercent(token: string): number | null {
	const v = parseNumber(token.endsWith('%') ? token.slice(0, -1) : token)
	return v === null ? null : clamp01(v / 100)
}

function parseHslFunction(body: string): ParsedColor | null {
	const args = splitArgs(body)
	if (args.length < 3 || args.length > 4) return null
	const h = parseHue(args[0])
	const s = parsePercent(args[1])
	const l = parsePercent(args[2])
	const a = parseAlpha(args[3])
	if (h === null || s === null || l === null || a === null) return null
	return { rgb: hslToRgb(h, s, l), alpha: a }
}

export function hslToRgb(hDeg: number, s: number, l: number): Rgb {
	const h = (((hDeg % 360) + 360) % 360) / 360
	if (s === 0) return packRgb(l * 255, l * 255, l * 255)
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s
	const p = 2 * l - q
	return packRgb(
		hueToRgb(p, q, h + 1 / 3) * 255,
		hueToRgb(p, q, h) * 255,
		hueToRgb(p, q, h - 1 / 3) * 255
	)
}

function hueToRgb(p: number, q: number, t: number): number {
	if (t < 0) t += 1
	if (t > 1) t -= 1
	if (t < 1 / 6) return p + (q - p) * 6 * t
	if (t < 1 / 2) return q
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
	return p
}

function parseColorFunction(body: string): ParsedColor | null {
	const args = splitArgs(body)
	if (args.length < 4 || args.length > 5) return null
	// Only display-p3 and srgb are expected (tldraw's highlight colours); both taken as sRGB 0–1.
	if (args[0] !== 'display-p3' && args[0] !== 'srgb') return null
	const r = parseUnitChannel(args[1])
	const g = parseUnitChannel(args[2])
	const b = parseUnitChannel(args[3])
	const a = parseAlpha(args[4])
	if (r === null || g === null || b === null || a === null) return null
	return { rgb: packRgb(r * 255, g * 255, b * 255), alpha: a }
}

function parseUnitChannel(token: string): number | null {
	if (token.endsWith('%')) {
		const v = parseNumber(token.slice(0, -1))
		return v === null ? null : clamp01(v / 100)
	}
	const v = parseNumber(token)
	return v === null ? null : clamp01(v)
}

/** Alpha-blends `top` over `bottom`. */
export function blend(top: Rgb, bottom: Rgb, alpha: number): Rgb {
	const a = clamp01(alpha)
	if (a >= 1) return top
	if (a <= 0) return bottom
	const b = 1 - a
	return packRgb(
		redOf(top) * a + redOf(bottom) * b,
		greenOf(top) * a + greenOf(bottom) * b,
		blueOf(top) * a + blueOf(bottom) * b
	)
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(rgb: Rgb): number {
	const lin = (c: number) => {
		const v = c / 255
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
	}
	return 0.2126 * lin(redOf(rgb)) + 0.7152 * lin(greenOf(rgb)) + 0.0722 * lin(blueOf(rgb))
}

const CUBE_LEVELS = [0, 95, 135, 175, 215, 255]

// xterm's own 256colres mapping: levels 95..255 are 40 apart, so truncating (v - 35) / 40 picks the
// nearest one (135 → 2, 155 → 3); rounding would skip level 2 for v = 135.
function nearestCubeLevel(v: number): number {
	if (v < 48) return 0
	if (v < 115) return 1
	return Math.min(5, Math.floor((v - 35) / 40))
}

function distanceSq(
	r1: number,
	g1: number,
	b1: number,
	r2: number,
	g2: number,
	b2: number
): number {
	const dr = r1 - r2
	const dg = g1 - g2
	const db = b1 - b2
	return dr * dr + dg * dg + db * db
}

/** Nearest xterm-256 index in 16..255 (6x6x6 cube or the 24-step grey ramp). */
export function quantize256(rgb: Rgb): number {
	const r = redOf(rgb)
	const g = greenOf(rgb)
	const b = blueOf(rgb)
	const ri = nearestCubeLevel(r)
	const gi = nearestCubeLevel(g)
	const bi = nearestCubeLevel(b)
	const cubeDist = distanceSq(r, g, b, CUBE_LEVELS[ri], CUBE_LEVELS[gi], CUBE_LEVELS[bi])
	const avg = (r + g + b) / 3
	let greyIdx = Math.round((avg - 8) / 10)
	if (greyIdx < 0) greyIdx = 0
	if (greyIdx > 23) greyIdx = 23
	const greyLevel = 8 + greyIdx * 10
	const greyDist = distanceSq(r, g, b, greyLevel, greyLevel, greyLevel)
	if (greyDist < cubeDist) return 232 + greyIdx
	return 16 + 36 * ri + 6 * gi + bi
}

// xterm's default palette for the 16 ANSI colours.
const ANSI16: readonly Rgb[] = [
	0x000000, 0xcd0000, 0x00cd00, 0xcdcd00, 0x0000ee, 0xcd00cd, 0x00cdcd, 0xe5e5e5, 0x7f7f7f,
	0xff0000, 0x00ff00, 0xffff00, 0x5c5cff, 0xff00ff, 0x00ffff, 0xffffff,
]

/** Nearest of the 16 ANSI colours (0–7 normal, 8–15 bright). */
export function quantize16(rgb: Rgb): number {
	const r = redOf(rgb)
	const g = greenOf(rgb)
	const b = blueOf(rgb)
	let best = 0
	let bestDist = Infinity
	for (let i = 0; i < 16; i++) {
		const c = ANSI16[i]
		const d = distanceSq(r, g, b, redOf(c), greenOf(c), blueOf(c))
		if (d < bestDist) {
			bestDist = d
			best = i
		}
	}
	return best
}

/** The RGB value a terminal shows for an ANSI 16 index (xterm defaults), for tests and previews. */
export function ansi16Rgb(index: number): Rgb {
	return ANSI16[index & 15]
}

/** The RGB value of an xterm-256 index in 16..255. */
export function xterm256Rgb(index: number): Rgb {
	if (index >= 232) {
		const v = 8 + (index - 232) * 10
		return packRgb(v, v, v)
	}
	if (index >= 16) {
		const n = index - 16
		return packRgb(
			CUBE_LEVELS[Math.floor(n / 36)],
			CUBE_LEVELS[Math.floor(n / 6) % 6],
			CUBE_LEVELS[n % 6]
		)
	}
	return ANSI16[index]
}

const TRUECOLOR_PROGRAMS = new Set(['iterm.app', 'wezterm', 'vscode', 'ghostty', 'hyper'])
const TRUECOLOR_ENV_VARS = [
	'KITTY_WINDOW_ID',
	'WEZTERM_EXECUTABLE',
	'WT_SESSION',
	'ALACRITTY_SOCKET',
	'GHOSTTY_RESOURCES_DIR',
	'KONSOLE_VERSION',
]

/**
 * Colour depth heuristic. COLORTERM alone misses tmux and SSH sessions, so terminal-specific
 * variables count too; inside tmux 24-bit is emitted and tmux downgrades it when the outer
 * terminal lacks RGB.
 */
export function detectColorMode(env: NodeJS.ProcessEnv): ColorMode {
	const colorterm = (env.COLORTERM ?? '').toLowerCase()
	if (colorterm === 'truecolor' || colorterm === '24bit') return '24bit'
	const term = (env.TERM ?? '').toLowerCase()
	if (term.includes('direct') || term.includes('truecolor') || term.includes('24bit'))
		return '24bit'
	const program = (env.TERM_PROGRAM ?? '').toLowerCase()
	if (TRUECOLOR_PROGRAMS.has(program)) return '24bit'
	for (const name of TRUECOLOR_ENV_VARS) {
		if (env[name]) return '24bit'
	}
	const vte = Number(env.VTE_VERSION)
	if (Number.isFinite(vte) && vte >= 3600) return '24bit'
	if (env.TMUX) return '24bit'
	if (program === 'apple_terminal') return '256'
	if (term === 'linux' || term === 'screen') return '256'
	return '256'
}
