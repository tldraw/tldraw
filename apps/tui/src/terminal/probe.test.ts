import { describe, expect, it } from 'vitest'
import {
	ambiguousWideFromCpr,
	assumedBackground,
	backgroundFromColorFgBg,
	defaultGlyphTier,
	defaultOsc52,
	isAppleTerminal,
	isGnuScreen,
	isLightBackground,
	isMacTerminal,
	isTmux,
	isUtf8Locale,
	KITTY_FLAGS,
	parseOsc11Color,
	PROBE_SEQUENCE,
	PROBE_TIMEOUT_MS,
	resolveColorMode,
	resolveColorScheme,
	terminalHints,
} from './probe'

describe('probe sequence', () => {
	it('writes a box glyph at (2,1) then DECXCPR, the kitty query, OSC 11 and the DA1 fence last', () => {
		// Row 2: st answers DECXCPR with a plain CSI r;cR, which on row 1 reads as a modified F3.
		expect(PROBE_SEQUENCE.startsWith('\x1b[2;1H─')).toBe(true)
		const cpr = PROBE_SEQUENCE.indexOf('\x1b[?6n')
		const kitty = PROBE_SEQUENCE.indexOf('\x1b[?u')
		const osc = PROBE_SEQUENCE.indexOf('\x1b]11;?\x1b\\')
		const da1 = PROBE_SEQUENCE.indexOf('\x1b[c')
		expect(cpr).toBeGreaterThan(0)
		expect(kitty).toBeGreaterThan(cpr)
		expect(osc).toBeGreaterThan(kitty)
		expect(da1).toBeGreaterThan(osc)
		expect(PROBE_SEQUENCE.endsWith('\x1b[c')).toBe(true)
		// A plain `CSI 6n` reply (`CSI r;cR`) is indistinguishable from shift+F3; only the private form is used.
		expect(PROBE_SEQUENCE.includes('\x1b[6n')).toBe(false)
	})

	it('bounds the wait and asks for the full kitty flag set', () => {
		expect(PROBE_TIMEOUT_MS).toBe(100)
		expect(KITTY_FLAGS).toBe(27)
	})
})

describe('parseOsc11Color', () => {
	it('parses the X11 rgb: forms at 1 to 4 hex digits per channel', () => {
		expect(parseOsc11Color('rgb:1e1e/1e1e/1e1e')).toBe(0x1e1e1e)
		expect(parseOsc11Color('rgb:ffff/0000/8080')).toBe(0xff0080)
		expect(parseOsc11Color('rgb:ff/00/80')).toBe(0xff0080)
		expect(parseOsc11Color('rgb:f/0/8')).toBe(0xff0088)
		expect(parseOsc11Color('RGB:FFF/000/888')).toBe(0xff0088)
		expect(parseOsc11Color('rgba:ffff/0000/8080/ffff')).toBe(0xff0080)
	})

	it('parses #rrggbb and #rgb', () => {
		expect(parseOsc11Color('#1e1e1e')).toBe(0x1e1e1e)
		expect(parseOsc11Color('#FFF')).toBe(0xffffff)
		expect(parseOsc11Color(' #000000 ')).toBe(0)
	})

	it('returns null for anything else', () => {
		expect(parseOsc11Color('')).toBeNull()
		expect(parseOsc11Color('?')).toBeNull()
		expect(parseOsc11Color('rgb:zz/00/00')).toBeNull()
		expect(parseOsc11Color('#12')).toBeNull()
		expect(parseOsc11Color('#12345')).toBeNull()
		expect(parseOsc11Color('rgb:ff/00')).toBeNull()
	})
})

describe('ambiguousWideFromCpr', () => {
	it('is true only when the cursor landed on column 3 after one box glyph', () => {
		expect(ambiguousWideFromCpr(3)).toBe(true)
		expect(ambiguousWideFromCpr(2)).toBe(false)
		expect(ambiguousWideFromCpr(1)).toBe(false)
		expect(ambiguousWideFromCpr(null)).toBe(false)
		expect(ambiguousWideFromCpr(undefined)).toBe(false)
	})
})

describe('backgroundFromColorFgBg', () => {
	it('reads the last field as the background index', () => {
		expect(backgroundFromColorFgBg({})).toBeNull()
		expect(backgroundFromColorFgBg({ COLORFGBG: '15;0' })).toBe('dark')
		expect(backgroundFromColorFgBg({ COLORFGBG: '0;15' })).toBe('light')
		expect(backgroundFromColorFgBg({ COLORFGBG: '0;7' })).toBe('light')
		expect(backgroundFromColorFgBg({ COLORFGBG: '7;8' })).toBe('dark')
		expect(backgroundFromColorFgBg({ COLORFGBG: '15;default;0' })).toBe('dark')
		expect(backgroundFromColorFgBg({ COLORFGBG: '0;4' })).toBe('dark')
	})

	it('gives up on bright colour backgrounds and garbage', () => {
		expect(backgroundFromColorFgBg({ COLORFGBG: '0;12' })).toBeNull()
		expect(backgroundFromColorFgBg({ COLORFGBG: 'x' })).toBeNull()
		expect(backgroundFromColorFgBg({ COLORFGBG: '' })).toBeNull()
	})
})

describe('colour scheme resolution', () => {
	it('classifies backgrounds by luminance', () => {
		expect(isLightBackground(0xffffff)).toBe(true)
		expect(isLightBackground(0xf5f5f5)).toBe(true)
		expect(isLightBackground(0x000000)).toBe(false)
		expect(isLightBackground(0x1e1e1e)).toBe(false)
		expect(isLightBackground(0x808080)).toBe(false)
	})

	it('applies override > OSC 11 > COLORFGBG > dark', () => {
		expect(resolveColorScheme({ env: {} })).toBe('dark')
		expect(resolveColorScheme({ env: { COLORFGBG: '0;15' } })).toBe('light')
		expect(resolveColorScheme({ env: { COLORFGBG: '0;15' }, osc11: 0x000000 })).toBe('dark')
		expect(resolveColorScheme({ env: {}, osc11: 0xffffff })).toBe('light')
		expect(resolveColorScheme({ env: {}, osc11: 0xffffff, override: 'dark' })).toBe('dark')
		expect(resolveColorScheme({ env: {}, osc11: null, override: null })).toBe('dark')
	})

	it('assumes pure white or black when the terminal did not say', () => {
		expect(assumedBackground('light')).toBe(0xffffff)
		expect(assumedBackground('dark')).toBe(0x000000)
	})
})

describe('resolveColorMode', () => {
	it('lets the flag override detection', () => {
		expect(resolveColorMode({ COLORTERM: 'truecolor' })).toBe('24bit')
		expect(resolveColorMode({ COLORTERM: 'truecolor' }, '16')).toBe('16')
		expect(resolveColorMode({}, null)).toBe('256')
	})
})

describe('locale and multiplexer hints', () => {
	it('treats an unset locale as UTF-8 and honours LC_ALL > LC_CTYPE > LANG', () => {
		expect(isUtf8Locale({})).toBe(true)
		expect(isUtf8Locale({ LANG: 'en_US.UTF-8' })).toBe(true)
		expect(isUtf8Locale({ LANG: 'ja_JP.utf8' })).toBe(true)
		expect(isUtf8Locale({ LANG: 'C' })).toBe(false)
		expect(isUtf8Locale({ LANG: 'en_US.UTF-8', LC_ALL: 'C' })).toBe(false)
		expect(isUtf8Locale({ LANG: 'C', LC_CTYPE: 'en_US.UTF-8' })).toBe(true)
		expect(isUtf8Locale({ LANG: 'C', LC_CTYPE: 'POSIX' })).toBe(false)
	})

	it('detects screen, tmux and the macOS terminals', () => {
		expect(isGnuScreen({ STY: '1234.pts-0.host' })).toBe(true)
		expect(isGnuScreen({})).toBe(false)
		expect(isTmux({ TMUX: '/tmp/tmux-1000/default,1,0' })).toBe(true)
		expect(isTmux({})).toBe(false)
		expect(isAppleTerminal({ TERM_PROGRAM: 'Apple_Terminal' })).toBe(true)
		expect(isAppleTerminal({ TERM_PROGRAM: 'iTerm.app' })).toBe(false)
		expect(isMacTerminal({ TERM_PROGRAM: 'iTerm.app' })).toBe(true)
		expect(isMacTerminal({ TERM_PROGRAM: 'WezTerm' })).toBe(false)
	})

	it('summarises the hints for the help overlay', () => {
		expect(terminalHints({ TMUX: 'x', TERM: 'tmux-256color', TERM_PROGRAM: 'tmux' })).toEqual({
			tmux: true,
			screen: false,
			macTerminal: false,
			term: 'tmux-256color',
			program: 'tmux',
		})
		expect(terminalHints({})).toEqual({
			tmux: false,
			screen: false,
			macTerminal: false,
			term: '',
			program: '',
		})
	})
})

describe('defaultGlyphTier', () => {
	it('is rich by default and honours the override', () => {
		expect(defaultGlyphTier({}, false)).toBe('rich')
		expect(defaultGlyphTier({ LANG: 'C' }, false, 'rich')).toBe('rich')
		expect(defaultGlyphTier({}, false, 'ascii')).toBe('ascii')
	})

	it('falls to ascii without UTF-8 or when ambiguous glyphs render wide', () => {
		expect(defaultGlyphTier({ LANG: 'C' }, false)).toBe('ascii')
		expect(defaultGlyphTier({ LANG: 'en_US.UTF-8' }, true)).toBe('ascii')
	})

	it('uses the safe tier on terminals whose fonts lack the rich dingbats', () => {
		expect(defaultGlyphTier({ TERM_PROGRAM: 'Apple_Terminal' }, false)).toBe('safe')
		expect(defaultGlyphTier({ TERM: 'linux' }, false)).toBe('safe')
		expect(defaultGlyphTier({ STY: '1' }, false)).toBe('safe')
	})
})

describe('defaultOsc52', () => {
	it('is on only where it works unconfigured, and the flag wins', () => {
		expect(defaultOsc52({})).toBe(false)
		expect(defaultOsc52({ TERM_PROGRAM: 'iTerm.app' })).toBe(false)
		for (const v of ['KITTY_WINDOW_ID', 'WEZTERM_EXECUTABLE', 'ALACRITTY_SOCKET', 'WT_SESSION']) {
			expect(defaultOsc52({ [v]: '1' }), v).toBe(true)
		}
		expect(defaultOsc52({ KITTY_WINDOW_ID: '1' }, false)).toBe(false)
		expect(defaultOsc52({}, true)).toBe(true)
		expect(defaultOsc52({}, null)).toBe(false)
	})
})
