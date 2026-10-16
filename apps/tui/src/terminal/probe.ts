import { GlyphTier } from './chars'
import { ColorMode, detectColorMode, packRgb, relativeLuminance, Rgb } from './colors'

/**
 * Startup probe, sent inside the alternate screen before the first paint: a `─` at (1,1) followed
 * by DECXCPR (`CSI ?6n`; a column of 3 means ambiguous-width glyphs render wide), the kitty keyboard
 * query (`CSI ? u`), the background query (`OSC 11 ; ?`) and finally DA1 (`CSI c`) as a fence:
 * every terminal answers DA1, and it answers in order, so its reply means the earlier queries that
 * were going to be answered have been.
 */
export const PROBE_SEQUENCE = '\x1b[1;1H─\x1b[?6n\x1b[?u\x1b]11;?\x1b\\\x1b[c'
export const PROBE_TIMEOUT_MS = 100
export const KITTY_FLAGS = 27 // disambiguate | report events | report all keys | report text

export type ColorScheme = 'light' | 'dark'

/** `rgb:RRRR/GGGG/BBBB`, `rgb:RR/GG/BB`, `rgb:R/G/B`, `rgba:…` or `#rrggbb` from an OSC 11 reply. */
export function parseOsc11Color(s: string): Rgb | null {
	const v = s.trim().toLowerCase()
	if (v.startsWith('#')) {
		const hex = v.slice(1)
		if (/^[0-9a-f]{6}$/.test(hex)) return parseInt(hex, 16)
		if (/^[0-9a-f]{3}$/.test(hex)) {
			return packRgb(
				parseInt(hex[0] + hex[0], 16),
				parseInt(hex[1] + hex[1], 16),
				parseInt(hex[2] + hex[2], 16)
			)
		}
		return null
	}
	const m = /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/.exec(v)
	if (!m) return null
	const channel = (h: string) => {
		const max = Math.pow(16, h.length) - 1
		return (parseInt(h, 16) / max) * 255
	}
	return packRgb(channel(m[1]), channel(m[2]), channel(m[3]))
}

/** After writing one `─` at column 1 the cursor is at column 2 for narrow glyphs, 3 for wide. */
export function ambiguousWideFromCpr(col: number | null | undefined): boolean {
	return col === 3
}

/** COLORFGBG is "fg;bg" (rxvt, Konsole, iTerm2): backgrounds 0–6 and 8 are dark, 7 and 15 light. */
export function backgroundFromColorFgBg(env: NodeJS.ProcessEnv): ColorScheme | null {
	const v = env.COLORFGBG
	if (!v) return null
	const parts = v.split(';')
	const bg = Number(parts[parts.length - 1])
	if (!Number.isFinite(bg)) return null
	if (bg === 7 || bg === 15) return 'light'
	if (bg >= 0 && bg <= 8) return 'dark'
	return bg >= 9 ? 'light' : null
}

export function isLightBackground(rgb: Rgb): boolean {
	return relativeLuminance(rgb) > 0.4
}

/** `--light/--dark` > OSC 11 luminance > COLORFGBG > dark. */
export function resolveColorScheme(opts: {
	override?: ColorScheme | null
	osc11?: Rgb | null
	env: NodeJS.ProcessEnv
}): ColorScheme {
	if (opts.override) return opts.override
	if (opts.osc11 !== null && opts.osc11 !== undefined) {
		return isLightBackground(opts.osc11) ? 'light' : 'dark'
	}
	return backgroundFromColorFgBg(opts.env) ?? 'dark'
}

/** The background colour to blend against when the terminal did not report one. */
export function assumedBackground(scheme: ColorScheme): Rgb {
	return scheme === 'light' ? 0xffffff : 0x000000
}

export function resolveColorMode(env: NodeJS.ProcessEnv, override?: ColorMode | null): ColorMode {
	return override ?? detectColorMode(env)
}

/** A locale that is set but not UTF-8 means box drawing will not survive the tty. Unset counts as UTF-8. */
export function isUtf8Locale(env: NodeJS.ProcessEnv): boolean {
	const locale = env.LC_ALL || env.LC_CTYPE || env.LANG
	if (!locale) return true
	return /utf-?8/i.test(locale)
}

export function isGnuScreen(env: NodeJS.ProcessEnv): boolean {
	return !!env.STY
}

export function isTmux(env: NodeJS.ProcessEnv): boolean {
	return !!env.TMUX
}

export function isAppleTerminal(env: NodeJS.ProcessEnv): boolean {
	return (env.TERM_PROGRAM ?? '').toLowerCase() === 'apple_terminal'
}

export function isMacTerminal(env: NodeJS.ProcessEnv): boolean {
	const p = (env.TERM_PROGRAM ?? '').toLowerCase()
	return p === 'apple_terminal' || p === 'iterm.app'
}

/**
 * ascii when the locale is not UTF-8 or the probe showed ambiguous glyphs rendering wide; safe on
 * terminals whose default fonts lack the dingbats and supplemental arrows the rich tier uses.
 */
export function defaultGlyphTier(
	env: NodeJS.ProcessEnv,
	ambiguousWide: boolean,
	override?: GlyphTier | null
): GlyphTier {
	if (override) return override
	if (!isUtf8Locale(env) || ambiguousWide) return 'ascii'
	const term = (env.TERM ?? '').toLowerCase()
	if (isAppleTerminal(env) || term === 'linux' || isGnuScreen(env)) return 'safe'
	return 'rich'
}

/** OSC 52 is only on by default where it works without configuration. */
export function defaultOsc52(env: NodeJS.ProcessEnv, override?: boolean | null): boolean {
	if (override !== undefined && override !== null) return override
	return !!(env.KITTY_WINDOW_ID || env.WEZTERM_EXECUTABLE || env.ALACRITTY_SOCKET || env.WT_SESSION)
}

export interface TerminalHints {
	tmux: boolean
	screen: boolean
	macTerminal: boolean
	term: string
	program: string
}

export function terminalHints(env: NodeJS.ProcessEnv): TerminalHints {
	return {
		tmux: isTmux(env),
		screen: isGnuScreen(env),
		macTerminal: isMacTerminal(env),
		term: env.TERM ?? '',
		program: env.TERM_PROGRAM ?? '',
	}
}
