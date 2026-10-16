import { describe, expect, it } from 'vitest'
import {
	ansi16Rgb,
	blend,
	blueOf,
	detectColorMode,
	greenOf,
	hslToRgb,
	namedColorCount,
	packRgb,
	parseColor,
	quantize16,
	quantize256,
	redOf,
	relativeLuminance,
	xterm256Rgb,
} from './colors'

function hex(rgb: number): string {
	return '#' + rgb.toString(16).padStart(6, '0')
}

describe('packing', () => {
	it('packs and unpacks channels, clamping and rounding', () => {
		expect(packRgb(0x12, 0x34, 0x56)).toBe(0x123456)
		expect(redOf(0x123456)).toBe(0x12)
		expect(greenOf(0x123456)).toBe(0x34)
		expect(blueOf(0x123456)).toBe(0x56)
		expect(packRgb(300, -5, 127.6)).toBe(0xff0080)
	})
})

describe('parseColor', () => {
	it('parses hex in all four lengths, case-insensitively', () => {
		expect(parseColor('#fff')).toEqual({ rgb: 0xffffff, alpha: 1 })
		expect(parseColor('#1E90FF')).toEqual({ rgb: 0x1e90ff, alpha: 1 })
		expect(parseColor('#f003')).toEqual({ rgb: 0xff0000, alpha: 0x33 / 255 })
		const long = parseColor('#1e90ff80')!
		expect(hex(long.rgb)).toBe('#1e90ff')
		expect(long.alpha).toBeCloseTo(0.502, 3)
		expect(parseColor(' #abc ')).toEqual({ rgb: 0xaabbcc, alpha: 1 })
	})

	it('rejects malformed hex', () => {
		expect(parseColor('#12')).toBeNull()
		expect(parseColor('#12345')).toBeNull()
		expect(parseColor('#gggggg')).toBeNull()
		expect(parseColor('#')).toBeNull()
	})

	it('parses rgb()/rgba() in comma and space syntax with number or percent alpha', () => {
		expect(parseColor('rgb(30, 144, 255)')).toEqual({ rgb: 0x1e90ff, alpha: 1 })
		expect(parseColor('rgba(30,144,255,0.5)')).toEqual({ rgb: 0x1e90ff, alpha: 0.5 })
		expect(parseColor('rgb(30 144 255 / 50%)')).toEqual({ rgb: 0x1e90ff, alpha: 0.5 })
		expect(parseColor('rgb(30 144 255 / 0.25)')).toEqual({ rgb: 0x1e90ff, alpha: 0.25 })
		expect(parseColor('rgba(30, 144, 255, 100%)')).toEqual({ rgb: 0x1e90ff, alpha: 1 })
		expect(parseColor('RGB(100%, 0%, 50%)')).toEqual({ rgb: 0xff0080, alpha: 1 })
	})

	it('clamps rgb channels and alpha', () => {
		expect(parseColor('rgb(300, -20, 128)')).toEqual({ rgb: 0xff0080, alpha: 1 })
		expect(parseColor('rgba(0, 0, 0, 2)')).toEqual({ rgb: 0, alpha: 1 })
		expect(parseColor('rgba(0, 0, 0, -1)')).toEqual({ rgb: 0, alpha: 0 })
	})

	it("parses tldraw's comma form with percent alpha: hsl(0, 0%, 56%, 10.2%)", () => {
		const c = parseColor('hsl(0, 0%, 56%, 10.2%)')!
		expect(c).not.toBeNull()
		expect(hex(c.rgb)).toBe('#8f8f8f')
		expect(c.alpha).toBeCloseTo(0.102, 5)
	})

	it('parses hsl()/hsla() in every syntax', () => {
		const ref = parseColor('hsl(214, 84%, 56%)')!
		expect(hex(ref.rgb)).toBe('#3182ed')
		expect(ref.alpha).toBe(1)
		expect(parseColor('hsla(214, 84%, 56%, 0.24)')).toEqual({ rgb: ref.rgb, alpha: 0.24 })
		expect(parseColor('hsl(214 84% 56% / 24%)')).toEqual({ rgb: ref.rgb, alpha: 0.24 })
		expect(parseColor('hsl(214deg, 84%, 56%)')).toEqual({ rgb: ref.rgb, alpha: 1 })
		expect(parseColor('hsl(0.5944turn 84% 56%)')!.rgb).toBe(ref.rgb)
		expect(parseColor('hsl(237.78grad 84% 56%)')!.rgb).toBe(ref.rgb)
		const rad = parseColor('hsl(3.735rad 84% 56%)')!
		expect(Math.abs(redOf(rad.rgb) - redOf(ref.rgb))).toBeLessThanOrEqual(1)
	})

	it('wraps hue and handles grey (zero saturation)', () => {
		expect(parseColor('hsl(360, 100%, 50%)')!.rgb).toBe(0xff0000)
		expect(parseColor('hsl(-120, 100%, 50%)')!.rgb).toBe(0x0000ff)
		expect(parseColor('hsl(120, 0%, 50%)')!.rgb).toBe(0x808080)
		expect(hslToRgb(120, 1, 0.5)).toBe(0x00ff00)
		expect(hslToRgb(0, 0, 1)).toBe(0xffffff)
	})

	it('parses named colours in any case', () => {
		expect(parseColor('blue')).toEqual({ rgb: 0x0000ff, alpha: 1 })
		expect(parseColor('White')).toEqual({ rgb: 0xffffff, alpha: 1 })
		expect(parseColor('rebeccapurple')).toEqual({ rgb: 0x663399, alpha: 1 })
		expect(parseColor('DarkSlateGray')).toEqual({ rgb: 0x2f4f4f, alpha: 1 })
		expect(parseColor('black')).toEqual({ rgb: 0, alpha: 1 })
		expect(namedColorCount()).toBe(148)
	})

	it('parses transparent and none as fully transparent', () => {
		expect(parseColor('transparent')).toEqual({ rgb: 0, alpha: 0 })
		expect(parseColor('none')).toEqual({ rgb: 0, alpha: 0 })
		expect(parseColor('TRANSPARENT')).toEqual({ rgb: 0, alpha: 0 })
	})

	it('approximates color(display-p3 …) and color(srgb …) as sRGB', () => {
		expect(parseColor('color(display-p3 1 0 0)')).toEqual({ rgb: 0xff0000, alpha: 1 })
		expect(parseColor('color(display-p3 0.5 0.5 0.5 / 0.5)')).toEqual({ rgb: 0x808080, alpha: 0.5 })
		expect(parseColor('color(srgb 0% 100% 0%)')).toEqual({ rgb: 0x00ff00, alpha: 1 })
		expect(parseColor('color(display-p3 1 1 1 / 25%)')).toEqual({ rgb: 0xffffff, alpha: 0.25 })
		expect(parseColor('color(rec2020 1 0 0)')).toBeNull()
	})

	it('returns null for anything else', () => {
		expect(parseColor('')).toBeNull()
		expect(parseColor('   ')).toBeNull()
		expect(parseColor('foo')).toBeNull()
		expect(parseColor('var(--color)')).toBeNull()
		expect(parseColor('rgb(1, 2)')).toBeNull()
		expect(parseColor('rgb(1, 2, 3, 4, 5)')).toBeNull()
		expect(parseColor('rgb(a, b, c)')).toBeNull()
		expect(parseColor('hsl(1, 2%)')).toBeNull()
		expect(parseColor('url(x)')).toBeNull()
		expect(parseColor('rgb(1, 2, 3')).toBeNull()
	})

	it('caches results without changing them', () => {
		const a = parseColor('hsl(214, 84%, 56%, 24%)')
		const b = parseColor('hsl(214, 84%, 56%, 24%)')
		expect(b).toBe(a)
		expect(parseColor('nope')).toBeNull()
		expect(parseColor('nope')).toBeNull()
	})
})

describe('blend', () => {
	it('interpolates per channel', () => {
		expect(blend(0xffffff, 0x000000, 0.5)).toBe(0x808080)
		expect(blend(0xff0000, 0x0000ff, 0.25)).toBe(0x4000bf)
	})

	it('returns top at alpha ≥ 1 and bottom at alpha ≤ 0', () => {
		expect(blend(0x123456, 0xabcdef, 1)).toBe(0x123456)
		expect(blend(0x123456, 0xabcdef, 1.5)).toBe(0x123456)
		expect(blend(0x123456, 0xabcdef, 0)).toBe(0xabcdef)
		expect(blend(0x123456, 0xabcdef, -1)).toBe(0xabcdef)
	})
})

describe('relativeLuminance', () => {
	it('is 0 for black, 1 for white and monotonic in between', () => {
		expect(relativeLuminance(0x000000)).toBe(0)
		expect(relativeLuminance(0xffffff)).toBeCloseTo(1, 6)
		expect(relativeLuminance(0x808080)).toBeCloseTo(0.2159, 3)
		expect(relativeLuminance(0x00ff00)).toBeGreaterThan(relativeLuminance(0xff0000))
		expect(relativeLuminance(0xff0000)).toBeGreaterThan(relativeLuminance(0x0000ff))
	})
})

describe('quantize256', () => {
	it('maps the cube corners and greys', () => {
		expect(quantize256(0x000000)).toBe(16)
		expect(quantize256(0xffffff)).toBe(231)
		expect(quantize256(0xff0000)).toBe(196)
		expect(quantize256(0x00ff00)).toBe(46)
		expect(quantize256(0x0000ff)).toBe(21)
		expect(quantize256(0x808080)).toBe(244)
		expect(quantize256(0x080808)).toBe(232)
		expect(quantize256(0xeeeeee)).toBe(255)
	})

	it('picks the exact cube level for every xterm cube colour (135 → level 2, not 3)', () => {
		expect(quantize256(0x870000)).toBe(88)
		expect(quantize256(0x5f5f5f)).toBe(59)
		expect(quantize256(0xafafaf)).toBe(145)
		for (let i = 16; i < 256; i++) {
			expect(quantize256(xterm256Rgb(i)), `index ${i} ${hex(xterm256Rgb(i))}`).toBe(i)
		}
	})

	it('prefers the grey ramp for near-greys and the cube for saturated colours', () => {
		expect(quantize256(0x303030)).toBe(236)
		expect(quantize256(0xc0c0c0)).toBe(250)
		expect(quantize256(0x1e90ff)).toBe(33)
		expect(quantize256(0xd2691e)).toBe(166)
	})

	it("keeps tldraw's palette distinguishable", () => {
		const palette = [
			'#1d1d1d',
			'#9fa8b2',
			'#e085f4',
			'#ae3ec9',
			'#4465e9',
			'#4ba1f1',
			'#f1ac4b',
			'#099268',
			'#4cb05e',
			'#f87777',
			'#e03131',
			'#ffffff',
		]
		const indices = palette.map((c) => quantize256(parseColor(c)!.rgb))
		expect(new Set(indices).size).toBe(palette.length)
	})
})

describe('quantize16 and ansi16Rgb', () => {
	it('maps to the nearest xterm default', () => {
		expect(quantize16(0x000000)).toBe(0)
		expect(quantize16(0xffffff)).toBe(15)
		expect(quantize16(0xcd0000)).toBe(1)
		expect(quantize16(0xff0000)).toBe(9)
		expect(quantize16(0x0000ee)).toBe(4)
		expect(quantize16(0x5c5cff)).toBe(12)
		expect(quantize16(0x7f7f7f)).toBe(8)
		expect(quantize16(0xffff00)).toBe(11)
		expect(quantize16(0x00ffff)).toBe(14)
	})

	it('round-trips the palette', () => {
		for (let i = 0; i < 16; i++) expect(quantize16(ansi16Rgb(i))).toBe(i)
		expect(ansi16Rgb(17)).toBe(ansi16Rgb(1))
	})
})

describe('xterm256Rgb', () => {
	it('decodes the cube and the grey ramp', () => {
		expect(xterm256Rgb(16)).toBe(0x000000)
		expect(xterm256Rgb(231)).toBe(0xffffff)
		expect(xterm256Rgb(196)).toBe(0xff0000)
		expect(xterm256Rgb(88)).toBe(0x870000)
		expect(xterm256Rgb(232)).toBe(0x080808)
		expect(xterm256Rgb(255)).toBe(0xeeeeee)
		expect(xterm256Rgb(9)).toBe(0xff0000)
	})
})

describe('detectColorMode', () => {
	it('defaults to 256', () => {
		expect(detectColorMode({})).toBe('256')
		expect(detectColorMode({ TERM: 'xterm-256color' })).toBe('256')
	})

	it('detects truecolor from COLORTERM and TERM', () => {
		expect(detectColorMode({ COLORTERM: 'truecolor' })).toBe('24bit')
		expect(detectColorMode({ COLORTERM: '24bit' })).toBe('24bit')
		expect(detectColorMode({ COLORTERM: 'TrueColor' })).toBe('24bit')
		expect(detectColorMode({ COLORTERM: 'yes' })).toBe('256')
		expect(detectColorMode({ TERM: 'xterm-direct' })).toBe('24bit')
		expect(detectColorMode({ TERM: 'foo-truecolor' })).toBe('24bit')
		expect(detectColorMode({ TERM: 'st-24bit' })).toBe('24bit')
	})

	it('detects truecolor from terminal program hints that survive tmux and ssh', () => {
		for (const p of ['iTerm.app', 'WezTerm', 'vscode', 'ghostty', 'Hyper']) {
			expect(detectColorMode({ TERM_PROGRAM: p }), p).toBe('24bit')
		}
		for (const v of [
			'KITTY_WINDOW_ID',
			'WEZTERM_EXECUTABLE',
			'WT_SESSION',
			'ALACRITTY_SOCKET',
			'GHOSTTY_RESOURCES_DIR',
			'KONSOLE_VERSION',
		]) {
			expect(detectColorMode({ [v]: '1' }), v).toBe('24bit')
		}
		expect(detectColorMode({ VTE_VERSION: '6003' })).toBe('24bit')
		expect(detectColorMode({ VTE_VERSION: '3600' })).toBe('24bit')
		expect(detectColorMode({ VTE_VERSION: '3599' })).toBe('256')
		expect(detectColorMode({ VTE_VERSION: 'abc' })).toBe('256')
		expect(detectColorMode({ TMUX: '/tmp/tmux-1000/default,1,0', TERM: 'screen' })).toBe('24bit')
	})

	it('falls back to 256 for Apple Terminal, linux console and plain screen', () => {
		expect(detectColorMode({ TERM_PROGRAM: 'Apple_Terminal' })).toBe('256')
		expect(detectColorMode({ TERM: 'linux' })).toBe('256')
		expect(detectColorMode({ TERM: 'screen', STY: '1234.pts-0' })).toBe('256')
	})

	it('lets an explicit COLORTERM beat the program fallbacks', () => {
		expect(detectColorMode({ TERM_PROGRAM: 'Apple_Terminal', COLORTERM: 'truecolor' })).toBe(
			'24bit'
		)
	})
})
