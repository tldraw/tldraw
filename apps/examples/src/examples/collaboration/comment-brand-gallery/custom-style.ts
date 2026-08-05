import { BrandTheme } from './themes'

/**
 * The custom style. Where the built-in styles are hand-written token maps, this one is built
 * from a small config the panel edits live — every knob compiles down to the same `--tl-*` and
 * `--brand-*` tokens the static styles use, through `buildCustomTheme`. Secondary colors
 * (dividers, muted fills, secondary text) are derived from the three main ones with CSS
 * `color-mix()`, so three color pickers style the whole surface coherently.
 */
export interface CustomStyleConfig {
	font: FontKey
	/** Panel background color. */
	panel: string
	/** Primary text color. */
	text: string
	/** Accent color: selection, active reactions, focus. */
	accent: string
	pinColor: string
	pinShape: 'teardrop' | 'circle' | 'square' | 'leaf'
	/** Corner radius of the thread panel, in px; the smaller radii scale from it. */
	radius: number
	borderWidth: number
	borderStyle: 'solid' | 'dashed' | 'double'
	borderColor: string
	shadow: 'none' | 'soft' | 'hard' | 'glow'
	authorStyle: 'normal' | 'uppercase' | 'small-caps'
	/** Rotation of the thread panel, in degrees. */
	tilt: number
	/** A comic speech-bubble tail on the thread panel. */
	tail: boolean
}

export type FontKey = 'sans' | 'rounded' | 'serif' | 'mono' | 'comic' | 'condensed'

export const FONT_STACKS: Record<FontKey, { label: string; stack: string }> = {
	sans: {
		label: 'Sans',
		stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif",
	},
	rounded: {
		label: 'Rounded',
		stack: "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Quicksand, sans-serif",
	},
	serif: { label: 'Serif', stack: "Georgia, 'Times New Roman', Times, serif" },
	mono: { label: 'Mono', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
	comic: { label: 'Comic', stack: "'Comic Sans MS', 'Chalkboard SE', 'Segoe Print', cursive" },
	condensed: { label: 'Condensed', stack: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif" },
}

export const DEFAULT_CUSTOM_STYLE: CustomStyleConfig = {
	font: 'sans',
	panel: '#ffffff',
	text: '#24292f',
	accent: '#6d28d9',
	pinColor: '#6d28d9',
	pinShape: 'teardrop',
	radius: 12,
	borderWidth: 1,
	borderStyle: 'solid',
	borderColor: '#e2e2e8',
	shadow: 'soft',
	authorStyle: 'normal',
	tilt: 0,
	tail: false,
}

const PIN_SHAPES: Record<CustomStyleConfig['pinShape'], string> = {
	teardrop: '50% 50% 50% 0',
	circle: '50%',
	square: '0',
	leaf: '0 50% 50% 50%',
}

const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${pct}%, ${b})`

/** Compile the config into a theme: the same token map shape every built-in style uses. */
export function buildCustomTheme(config: CustomStyleConfig): BrandTheme {
	const { panel, text, accent, borderColor } = config
	const tokens: Record<string, string> = {
		'--brand-font': FONT_STACKS[config.font].stack,
		'--tl-color-panel': panel,
		'--tl-color-panel-contrast': panel,
		'--tl-color-text-1': text,
		'--tl-color-text-2': mix(text, panel, 80),
		'--tl-color-text-3': mix(text, panel, 55),
		'--tl-color-divider': mix(text, panel, 15),
		'--tl-color-muted-0': mix(text, panel, 4),
		'--tl-color-muted-1': mix(text, panel, 14),
		'--tl-color-muted-2': mix(text, panel, 8),
		'--tl-color-selected': accent,
		'--tl-radius-1': `${Math.round(config.radius * 0.35)}px`,
		'--tl-radius-2': `${Math.round(config.radius * 0.55)}px`,
		'--tl-radius-3': `${Math.round(config.radius * 0.8)}px`,
		'--tl-radius-4': `${config.radius}px`,
		'--brand-pin-shape': PIN_SHAPES[config.pinShape],
		'--brand-pin-bg': config.pinColor,
	}

	switch (config.shadow) {
		case 'none':
			tokens['--tl-shadow-3'] = `0 0 0 1px ${mix(text, panel, 15)}`
			tokens['--tlui-cmt-marker-shadow'] = '0 1px 2px rgba(0, 0, 0, 0.2)'
			tokens['--tlui-cmt-pill-shadow'] = `0 0 0 1px ${mix(text, panel, 15)}`
			break
		case 'soft':
			tokens['--tl-shadow-3'] = `0 12px 32px ${mix(text, 'transparent', 22)}`
			tokens['--tlui-cmt-marker-shadow'] = `0 3px 10px ${mix(text, 'transparent', 30)}`
			tokens['--tlui-cmt-pill-shadow'] =
				`0 0 0 1px ${mix(text, panel, 12)}, 0 2px 8px ${mix(text, 'transparent', 12)}`
			break
		case 'hard':
			tokens['--tl-shadow-3'] = `6px 6px 0 ${borderColor}`
			tokens['--tlui-cmt-marker-shadow'] = `3px 3px 0 ${borderColor}`
			tokens['--tlui-cmt-marker-hover-scale'] = '1'
			tokens['--tlui-cmt-pill-shadow'] = `0 0 0 2px ${borderColor}`
			break
		case 'glow':
			tokens['--tl-shadow-3'] = `0 0 0 1px ${accent}, 0 0 20px ${mix(accent, 'transparent', 45)}`
			tokens['--tlui-cmt-marker-shadow'] = `0 0 12px ${mix(accent, 'transparent', 60)}`
			tokens['--tlui-cmt-pill-shadow'] = `0 0 0 1px ${mix(accent, 'transparent', 50)}`
			break
	}

	if (config.borderWidth > 0) {
		tokens['--brand-thread-border'] = `${config.borderWidth}px ${config.borderStyle} ${borderColor}`
		tokens['--brand-pin-border'] = `${Math.min(config.borderWidth, 3)}px solid ${borderColor}`
	}
	if (config.authorStyle === 'uppercase') {
		tokens['--brand-author-transform'] = 'uppercase'
		tokens['--brand-author-spacing'] = '0.04em'
	}
	if (config.authorStyle === 'small-caps') {
		tokens['--brand-author-variant'] = 'small-caps'
		tokens['--brand-author-spacing'] = '0.04em'
	}
	if (config.tilt !== 0) tokens['--brand-thread-tilt'] = `${config.tilt}deg`
	if (config.tail) {
		tokens['--brand-tail'] = 'block'
		tokens['--brand-tail-color'] = config.borderWidth > 0 ? borderColor : text
	}

	return { id: 'custom', name: 'Custom', tagline: 'Your style — tune it live', tokens }
}

/** A random but coherent config, for one-click inspiration. */
export function randomCustomStyle(): CustomStyleConfig {
	const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)]
	const rand = (min: number, max: number) => min + Math.random() * (max - min)

	const hue = Math.round(rand(0, 360))
	const dark = Math.random() < 0.4
	const accentHue = Math.round(hue + rand(120, 240)) % 360
	const panel = dark ? hslToHex(hue, 25, 10) : hslToHex(hue, Math.round(rand(15, 60)), 97)
	const text = dark ? hslToHex(hue, 20, 90) : hslToHex(hue, 30, 15)
	const accent = hslToHex(accentHue, 80, dark ? 62 : 45)
	const shadow = pick(['none', 'soft', 'hard', 'glow'] as const)
	const borderWidth = pick([0, 0, 1, 2, 3])

	return {
		font: pick(Object.keys(FONT_STACKS) as FontKey[]),
		panel,
		text,
		accent,
		pinColor: Math.random() < 0.5 ? accent : hslToHex((accentHue + 40) % 360, 70, dark ? 60 : 50),
		pinShape: pick(['teardrop', 'circle', 'square', 'leaf'] as const),
		radius: pick([0, 4, 8, 12, 16, 22]),
		borderWidth: shadow === 'hard' ? Math.max(borderWidth, 2) : borderWidth,
		borderStyle: pick(['solid', 'solid', 'dashed'] as const),
		borderColor: dark ? text : hslToHex(hue, 25, 25),
		shadow,
		authorStyle: pick(['normal', 'normal', 'uppercase', 'small-caps'] as const),
		tilt: Math.random() < 0.2 ? pick([-1.5, -0.8, 0.8, 1.5]) : 0,
		tail: Math.random() < 0.15,
	}
}

// Color inputs want hex, so the randomizer emits hex rather than hsl strings.
function hslToHex(h: number, s: number, l: number): string {
	const sat = s / 100
	const light = l / 100
	const f = (n: number) => {
		const k = (n + h / 30) % 12
		const value = light - sat * Math.min(light, 1 - light) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
		return Math.round(255 * value)
			.toString(16)
			.padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}

const STORAGE_KEY = 'comment-brand-gallery-custom-style'

export function loadCustomStyle(): CustomStyleConfig {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) return { ...DEFAULT_CUSTOM_STYLE, ...JSON.parse(stored) }
	} catch {
		// fall through to the default
	}
	return DEFAULT_CUSTOM_STYLE
}

export function saveCustomStyle(config: CustomStyleConfig) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
	} catch {
		// storage may be unavailable; the style still works for the session
	}
}
