import { useEffect, useRef, useState } from 'react'
import {
	DEFAULT_THEME,
	DefaultColorStyle,
	DefaultFontStyle,
	Editor,
	TLDefaultColor,
	TLTheme,
	TLThemeFont,
	TLThemes,
	TLUiOverrides,
	Tldraw,
	registerColorsFromThemes,
	registerFontsFromThemes,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './color-picker.css'

// [1] Pre-declare slot names for custom colors and fonts. The runtime only
// fills the slots the user has actually added, but TypeScript needs concrete
// keys to compute `TLDefaultColorStyle` / `TLDefaultFontStyle`.
const MAX_CUSTOM_COLORS = 20
const MAX_CUSTOM_FONTS = 10

type CustomColorKey =
	| 'custom-1'
	| 'custom-2'
	| 'custom-3'
	| 'custom-4'
	| 'custom-5'
	| 'custom-6'
	| 'custom-7'
	| 'custom-8'
	| 'custom-9'
	| 'custom-10'
	| 'custom-11'
	| 'custom-12'
	| 'custom-13'
	| 'custom-14'
	| 'custom-15'
	| 'custom-16'
	| 'custom-17'
	| 'custom-18'
	| 'custom-19'
	| 'custom-20'

type CustomFontKey =
	| 'gf-1'
	| 'gf-2'
	| 'gf-3'
	| 'gf-4'
	| 'gf-5'
	| 'gf-6'
	| 'gf-7'
	| 'gf-8'
	| 'gf-9'
	| 'gf-10'

declare module '@tldraw/tlschema' {
	interface TLThemeDefaultColors {
		'custom-1': TLDefaultColor
		'custom-2': TLDefaultColor
		'custom-3': TLDefaultColor
		'custom-4': TLDefaultColor
		'custom-5': TLDefaultColor
		'custom-6': TLDefaultColor
		'custom-7': TLDefaultColor
		'custom-8': TLDefaultColor
		'custom-9': TLDefaultColor
		'custom-10': TLDefaultColor
		'custom-11': TLDefaultColor
		'custom-12': TLDefaultColor
		'custom-13': TLDefaultColor
		'custom-14': TLDefaultColor
		'custom-15': TLDefaultColor
		'custom-16': TLDefaultColor
		'custom-17': TLDefaultColor
		'custom-18': TLDefaultColor
		'custom-19': TLDefaultColor
		'custom-20': TLDefaultColor
	}
	interface TLThemeFonts {
		'gf-1': TLThemeFont
		'gf-2': TLThemeFont
		'gf-3': TLThemeFont
		'gf-4': TLThemeFont
		'gf-5': TLThemeFont
		'gf-6': TLThemeFont
		'gf-7': TLThemeFont
		'gf-8': TLThemeFont
		'gf-9': TLThemeFont
		'gf-10': TLThemeFont
	}
}

interface GoogleFont {
	name: string
	family: string
}
const GOOGLE_FONTS: GoogleFont[] = [
	{ name: 'Roboto', family: "'Roboto', sans-serif" },
	{ name: 'Lato', family: "'Lato', sans-serif" },
	{ name: 'Open Sans', family: "'Open Sans', sans-serif" },
	{ name: 'Montserrat', family: "'Montserrat', sans-serif" },
	{ name: 'Raleway', family: "'Raleway', sans-serif" },
	{ name: 'Oswald', family: "'Oswald', sans-serif" },
	{ name: 'Playfair Display', family: "'Playfair Display', serif" },
	{ name: 'Merriweather', family: "'Merriweather', serif" },
	{ name: 'Pacifico', family: "'Pacifico', cursive" },
	{ name: 'Caveat', family: "'Caveat', cursive" },
	{ name: 'Permanent Marker', family: "'Permanent Marker', cursive" },
	{ name: 'Bebas Neue', family: "'Bebas Neue', sans-serif" },
]

// [2] Fan a single hex onto every role in TLDefaultColor. The theme renderer
// reads different roles for different contexts (outline vs fill vs note
// background); we use the picked hex for all of them plus a translucent
// variant for the semi fills.
function makeColor(solid: string): TLDefaultColor {
	const translucent = solid + '33'
	return {
		solid,
		semi: translucent,
		pattern: solid,
		fill: solid,
		linedFill: translucent,
		frameHeadingStroke: solid,
		frameHeadingFill: translucent,
		frameStroke: solid,
		frameFill: translucent,
		frameText: solid,
		noteFill: translucent,
		noteText: solid,
		highlightSrgb: solid,
		highlightP3: solid,
	}
}

function makeFontEntry(family: string): TLThemeFont {
	return {
		fontFamily: family,
		icon: <div style={{ fontFamily: family, fontSize: 16, lineHeight: 1 }}>Aa</div>,
	}
}

const customColorTranslations: Record<string, string> = {}
for (let i = 1; i <= MAX_CUSTOM_COLORS; i++) {
	customColorTranslations[`color-style.custom-${i}`] = `Custom ${i}`
}
const customFontTranslations: Record<string, string> = {}
for (let i = 1; i <= MAX_CUSTOM_FONTS; i++) {
	customFontTranslations[`font-style.gf-${i}`] = `Google font ${i}`
}
const uiOverrides: TLUiOverrides = {
	translations: {
		en: { ...customColorTranslations, ...customFontTranslations },
	},
}

// [3] Inject one <link> loading every curated Google Font family, so dropdown
// previews render in the right typeface and canvas text picks up the family
// once it's registered in the theme.
let googleFontsLoaded = false
function ensureGoogleFontsLoaded() {
	if (googleFontsLoaded) return
	googleFontsLoaded = true
	const families = GOOGLE_FONTS.map((f) => `family=${f.name.replace(/ /g, '+')}`).join('&')
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
	document.head.appendChild(link)
}

export default function ColorPickerExample() {
	const [customHexes, setCustomHexes] = useState<string[]>([])
	const [customFonts, setCustomFonts] = useState<GoogleFont[]>([])
	const [editor, setEditor] = useState<Editor | null>(null)
	const prevColorCountRef = useRef(0)
	const prevFontCountRef = useRef(0)

	// [4] Imperative theme updates. Mutating the `themes` prop on <Tldraw>
	// re-renders the whole editor tree and causes a visible flash. Calling
	// `registerColorsFromThemes` + `editor.updateTheme` directly updates the
	// style enum and theme atom in place — the style panel and affected shapes
	// repaint reactively without remounting anything.
	useEffect(() => {
		if (!editor) return
		const theme = buildTheme(customHexes, customFonts)
		const themes = { default: theme } as TLThemes
		registerColorsFromThemes(themes)
		registerFontsFromThemes(themes)
		editor.updateTheme(theme)

		// [5] If this render added a new slot and the user has shapes selected,
		// push the new slot onto the selection. We do this inside the effect
		// (rather than in the click handler) so the enum is already updated by
		// `registerColorsFromThemes` — setting an unknown value on a shape
		// would throw.
		const hasSelection = editor.getSelectedShapeIds().length > 0
		if (hasSelection && customHexes.length > prevColorCountRef.current) {
			const key = `custom-${customHexes.length}` as CustomColorKey
			editor.setStyleForSelectedShapes(DefaultColorStyle, key)
		}
		if (hasSelection && customFonts.length > prevFontCountRef.current) {
			const key = `gf-${customFonts.length}` as CustomFontKey
			// The static type of DefaultFontStyle is narrowed to the four
			// built-in fonts; we registered the runtime value ourselves above.
			editor.setStyleForSelectedShapes(DefaultFontStyle, key as 'draw')
		}

		prevColorCountRef.current = customHexes.length
		prevFontCountRef.current = customFonts.length
	}, [editor, customHexes, customFonts])

	const addColor = (hex: string) => {
		setCustomHexes((prev) => (prev.length >= MAX_CUSTOM_COLORS ? prev : [...prev, hex]))
	}

	const addFont = (font: GoogleFont) => {
		setCustomFonts((prev) => {
			if (prev.length >= MAX_CUSTOM_FONTS) return prev
			if (prev.some((f) => f.family === font.family)) return prev
			return [...prev, font]
		})
	}

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="color-picker-example" overrides={uiOverrides} onMount={setEditor}>
				<div className="color-picker-toolbar" onPointerDown={(e) => e.stopPropagation()}>
					<AddColorButton addColor={addColor} isFull={customHexes.length >= MAX_CUSTOM_COLORS} />
					<AddFontButton
						addedFamilies={customFonts.map((f) => f.family)}
						addFont={addFont}
						isFull={customFonts.length >= MAX_CUSTOM_FONTS}
					/>
				</div>
			</Tldraw>
		</div>
	)
}

function buildTheme(hexes: string[], fonts: GoogleFont[]): TLTheme {
	const lightColors = { ...DEFAULT_THEME.colors.light } as TLTheme['colors']['light']
	const darkColors = { ...DEFAULT_THEME.colors.dark } as TLTheme['colors']['dark']
	for (let i = 0; i < hexes.length; i++) {
		const key = `custom-${i + 1}` as CustomColorKey
		const entry = makeColor(hexes[i])
		lightColors[key] = entry
		darkColors[key] = entry
	}

	const themeFonts = { ...DEFAULT_THEME.fonts } as TLTheme['fonts']
	for (let i = 0; i < fonts.length; i++) {
		const key = `gf-${i + 1}` as CustomFontKey
		themeFonts[key] = makeFontEntry(fonts[i].family)
	}

	return {
		...DEFAULT_THEME,
		id: 'default',
		colors: { light: lightColors, dark: darkColors },
		fonts: themeFonts,
	}
}

// [6] Color add flow — the native picker opens immediately on "+ Add color".
// The picker fires onChange continuously while dragging, so we stage a preview
// and only commit on the explicit Add button.
function AddColorButton({ addColor, isFull }: { addColor(hex: string): void; isFull: boolean }) {
	const [isStaging, setIsStaging] = useState(false)
	const [staged, setStaged] = useState(() => randomHex())
	const inputRef = useRef<HTMLInputElement>(null)

	const open = () => {
		setStaged(randomHex())
		setIsStaging(true)
		inputRef.current?.click()
	}
	const reopen = () => inputRef.current?.click()
	const commit = () => {
		addColor(staged)
		setIsStaging(false)
	}
	const cancel = () => setIsStaging(false)

	return (
		<div className="color-picker-add-color">
			<input
				ref={inputRef}
				type="color"
				value={staged}
				onChange={(e) => setStaged(e.target.value)}
				className="color-picker-add-color__input"
				aria-hidden
				tabIndex={-1}
			/>
			{isStaging ? (
				<div className="color-picker-add-color__staging">
					<button
						type="button"
						className="color-picker-add-color__swatch"
						style={{ background: staged }}
						onClick={reopen}
						aria-label="Change color"
					/>
					<span className="color-picker-add-color__hex">{staged.toUpperCase()}</span>
					<button className="color-picker-button color-picker-button--primary" onClick={commit}>
						Add
					</button>
					<button
						className="color-picker-button color-picker-button--icon"
						onClick={cancel}
						aria-label="Cancel"
					>
						×
					</button>
				</div>
			) : (
				<button
					className="color-picker-button"
					disabled={isFull}
					onClick={open}
					title={isFull ? `Custom color slots full (${MAX_CUSTOM_COLORS})` : 'Add a custom color'}
				>
					+ Add color
				</button>
			)}
		</div>
	)
}

// [7] Font add flow — dropdown of curated Google Fonts. Selection is atomic
// (one click = one commit), so no staging needed. Already-added fonts are
// shown but disabled.
function AddFontButton({
	addedFamilies,
	addFont,
	isFull,
}: {
	addedFamilies: string[]
	addFont(font: GoogleFont): void
	isFull: boolean
}) {
	const [isOpen, setIsOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	const open = () => {
		ensureGoogleFontsLoaded()
		setIsOpen(true)
	}
	const close = () => setIsOpen(false)

	useEffect(() => {
		if (!isOpen) return
		const handler = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) close()
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [isOpen])

	return (
		<div className="color-picker-add-font" ref={containerRef}>
			<button
				className="color-picker-button"
				disabled={isFull}
				onClick={() => (isOpen ? close() : open())}
				title={isFull ? `Custom font slots full (${MAX_CUSTOM_FONTS})` : 'Add a Google font'}
			>
				+ Add font
			</button>
			{isOpen && (
				<div className="color-picker-font-dropdown">
					{GOOGLE_FONTS.map((font) => {
						const alreadyAdded = addedFamilies.includes(font.family)
						return (
							<button
								key={font.name}
								className="color-picker-font-dropdown__item"
								disabled={alreadyAdded}
								onClick={() => {
									addFont(font)
									close()
								}}
							>
								<span style={{ fontFamily: font.family }}>{font.name}</span>
								{alreadyAdded && <span className="color-picker-font-dropdown__added">Added</span>}
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}

function randomHex(): string {
	const hue = Math.floor(Math.random() * 360)
	return hslToHex(hue, 70, 55)
}

function hslToHex(h: number, s: number, l: number): string {
	const sNorm = s / 100
	const lNorm = l / 100
	const k = (n: number) => (n + h / 30) % 12
	const a = sNorm * Math.min(lNorm, 1 - lNorm)
	const f = (n: number) =>
		Math.round(255 * (lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
	const toHex = (v: number) => v.toString(16).padStart(2, '0')
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/*

[1]
Module augmentation needs concrete property names, so we pre-declare every
possible slot up front. Only the ones the user actually adds land in the
theme at runtime.

[3]
The link tag is lazily added on the first "+ Add font" open. Subsequent opens
reuse the already-loaded CSS. We use a module-level flag instead of React
state because the tag only needs to exist once in the document — remounting
the example shouldn't add it again.

[4]
Before: we passed custom colors and fonts through the `themes` prop, which
meant every state change rebuilt the prop, re-rendered `TldrawEditor`, and
caused a visible flash. Now the `themes` prop is omitted entirely; we
imperatively register + update the theme from an effect. The style panel
enum and the theme atom both update in place.

[5]
When the user adds a style while a shape is selected, we push the new slot
onto the selection immediately via `queueMicrotask`. The microtask runs after
the React commit and the effect in [4], so by the time we call
`setStyleForSelectedShapes`, `DefaultColorStyle` / `DefaultFontStyle` already
contains the new slot (otherwise the enum validator would reject it).

Removal of custom slots is intentionally not supported:
`registerColorsFromThemes` / `registerFontsFromThemes` strip entries that are
absent from the theme, which would invalidate any shape still naming the
removed slot.

*/
