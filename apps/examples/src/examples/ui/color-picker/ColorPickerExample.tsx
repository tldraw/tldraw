import { useEffect, useMemo, useRef, useState } from 'react'
import 'tldraw/tldraw.css'
import './color-picker.css'
import {
	DEFAULT_THEME,
	DefaultColorStyle,
	DefaultFontStyle,
	Editor,
	JsonObject,
	TLDOCUMENT_ID,
	TLDefaultColor,
	TLShape,
	TLShapePartial,
	TLTheme,
	TLThemeFont,
	TLThemes,
	TLUiOverrides,
	Tldraw,
	useValue,
} from 'tldraw'

// [1] Pre-declare slot names for custom colors and fonts. The runtime only
// fills the slots the user has actually added, but TypeScript needs concrete
// keys to compute `TLDefaultColorStyle` / `TLDefaultFontStyle`.
const MAX_CUSTOM_COLORS = 20
const MAX_CUSTOM_FONTS = 10

const PERSISTENCE_KEY = 'color-picker-example'

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

// [8] The palette (which hex/family each `custom-*` / `gf-*` slot maps to) lives
// on the tldraw document's `meta`. Shapes only persist the slot *key* (`custom-2`,
// `gf-1`); this is where the slot's actual value is kept. Storing it in the
// document — instead of a separate React/localStorage copy — means the editor
// persists it (via `persistenceKey`), syncs it across tabs, and includes it in
// undo/redo for free, always atomically with the shapes that reference it. There
// is therefore nothing to hand-reconcile: no cross-tab listener, no load-time
// recovery, no save-failure handling.
const PALETTE_META_KEY = 'colorPickerPalette'

interface Palette {
	hexes: string[]
	fonts: GoogleFont[]
}

function isGoogleFont(v: unknown): v is GoogleFont {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as GoogleFont).family === 'string' &&
		typeof (v as GoogleFont).name === 'string'
	)
}

// `meta` is free-form JSON, so normalise whatever we read into a known shape.
// This also guards against a corrupt or hand-edited document.
function parsePalette(raw: unknown): Palette {
	const obj = (raw ?? {}) as { hexes?: unknown; fonts?: unknown }
	return {
		hexes: Array.isArray(obj.hexes)
			? obj.hexes.filter((h): h is string => typeof h === 'string').slice(0, MAX_CUSTOM_COLORS)
			: [],
		fonts: Array.isArray(obj.fonts)
			? obj.fonts.filter(isGoogleFont).slice(0, MAX_CUSTOM_FONTS)
			: [],
	}
}

function readRawPalette(editor: Editor): unknown {
	return editor.getDocumentSettings().meta[PALETTE_META_KEY]
}

// Write the palette into the document `meta`. Call this inside `editor.run` so it
// batches into one undo step with any shape repair that goes with it.
function writePalette(editor: Editor, palette: Palette) {
	editor.store.update(TLDOCUMENT_ID, (doc) => ({
		...doc,
		meta: { ...doc.meta, [PALETTE_META_KEY]: palette as unknown as JsonObject },
	}))
}

const isCustomColor = (v: unknown): v is string => typeof v === 'string' && /^custom-\d+$/.test(v)
const isCustomFont = (v: unknown): v is string => typeof v === 'string' && /^gf-\d+$/.test(v)

const DEFAULT_COLOR = DefaultColorStyle.defaultValue
const DEFAULT_FONT = DefaultFontStyle.defaultValue

// [10] When the palette is cleared, the slots leave the *live* theme, so every
// shape and the per-tab "next shape" style that still names a `custom-*` / `gf-*`
// slot is remapped back to a built-in value (`black` / `draw`). The enum keeps
// every slot registered (see `buildCompleteTheme`), so this isn't needed to keep
// records valid — it just stops those shapes from rendering with an empty slot.
// Run inside the same `editor.run` as the palette write so the two move together
// through undo/redo.
function repairShapesUsingCustomStyles(editor: Editor) {
	const updates: TLShapePartial[] = []
	for (const record of editor.store.allRecords()) {
		if (record.typeName !== 'shape') continue
		const shape = record as TLShape
		const props = shape.props as Record<string, unknown>
		const next: Record<string, unknown> = {}
		if (isCustomColor(props.color)) next.color = DEFAULT_COLOR
		if (isCustomColor(props.labelColor)) next.labelColor = DEFAULT_COLOR
		if (isCustomFont(props.font)) next.font = DEFAULT_FONT
		if (Object.keys(next).length > 0) {
			updates.push({ id: shape.id, type: shape.type, props: next } as TLShapePartial)
		}
	}
	if (updates.length > 0) editor.updateShapes(updates)

	// `stylesForNextShape` lives on the per-tab `instance` record; reset any entry
	// that points at a slot we're removing so the next created shape doesn't
	// re-apply it.
	const stylesForNextShape = editor.getInstanceState().stylesForNextShape
	const fixed: Record<string, unknown> = {}
	for (const [id, value] of Object.entries(stylesForNextShape)) {
		if (isCustomColor(value)) fixed[id] = DEFAULT_COLOR
		else if (isCustomFont(value)) fixed[id] = DEFAULT_FONT
	}
	if (Object.keys(fixed).length > 0) {
		editor.updateInstanceState({ stylesForNextShape: { ...stylesForNextShape, ...fixed } })
	}
}

export default function ColorPickerExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	// [9] Register *every* possible slot up front (with placeholder values). Passed
	// as the stable `themes` prop, this makes `createTLStore` register the full
	// style enum before the persisted document is validated on load, so shapes
	// referencing any slot pass validation even before the palette is read. The
	// visible colors/fonts are pushed separately via `editor.updateTheme` below.
	const [initialThemes] = useState<Partial<TLThemes>>(() => ({ default: buildCompleteTheme() }))

	// [8b] Read the palette straight from the document `meta`, reactively. Because
	// the store drives local edits, undo/redo, and cross-tab sync alike, this one
	// read covers all three with no extra plumbing. `useValue` returns the stored
	// reference (stable until the document record changes, so unrelated edits like
	// moving a shape don't churn it); `useMemo` normalises it.
	const rawPalette = useValue('palette', () => (editor ? readRawPalette(editor) : undefined), [
		editor,
	])
	const palette = useMemo(() => parsePalette(rawPalette), [rawPalette])

	// [4] Push the palette's actual colors/fonts into the live theme. The style
	// panel and canvas read this, so only slots the palette contains are shown; the
	// complete prop's placeholder slots stay hidden. Runs on load, on every palette
	// change, and on undo/redo (all surface through `palette` above).
	useEffect(() => {
		if (!editor) return
		editor.updateTheme(buildTheme(palette.hexes, palette.fonts))
		if (palette.fonts.length > 0) ensureGoogleFontsLoaded()
	}, [editor, palette])

	const addColor = (hex: string) => {
		if (!editor || palette.hexes.length >= MAX_CUSTOM_COLORS) return
		const hexes = [...palette.hexes, hex]
		editor.run(() => {
			writePalette(editor, { hexes, fonts: palette.fonts })
			// [5] Put the new color into the live theme before applying it, so a
			// selected shape repaints with it immediately. The enum already knows the
			// slot (complete `themes` prop), so the style set never trips validation.
			editor.updateTheme(buildTheme(hexes, palette.fonts))
			if (editor.getSelectedShapeIds().length > 0) {
				const key = `custom-${hexes.length}` as CustomColorKey
				editor.setStyleForSelectedShapes(DefaultColorStyle, key)
			}
		})
	}

	const addFont = (font: GoogleFont) => {
		if (!editor || palette.fonts.length >= MAX_CUSTOM_FONTS) return
		if (palette.fonts.some((f) => f.family === font.family)) return
		const fonts = [...palette.fonts, font]
		ensureGoogleFontsLoaded()
		editor.run(() => {
			writePalette(editor, { hexes: palette.hexes, fonts })
			editor.updateTheme(buildTheme(palette.hexes, fonts))
			if (editor.getSelectedShapeIds().length > 0) {
				// DefaultFontStyle's static type is the four built-ins; the runtime
				// enum (complete `themes` prop) knows this slot.
				const key = `gf-${fonts.length}` as CustomFontKey
				editor.setStyleForSelectedShapes(DefaultFontStyle, key as 'draw')
			}
		})
	}

	// [11] Remove every custom color and font. We clear the palette and remap every
	// shape / next-shape style off the custom slots in a single `editor.run`, so
	// it's one undo step and the palette can never drift from the shapes that
	// reference it — undo restores both together, redo clears both together.
	const clearCustomStyles = () => {
		if (!editor) return
		editor.run(() => {
			repairShapesUsingCustomStyles(editor)
			writePalette(editor, { hexes: [], fonts: [] })
		})
	}

	const hasCustomStyles = palette.hexes.length > 0 || palette.fonts.length > 0

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey={PERSISTENCE_KEY}
				themes={initialThemes}
				overrides={uiOverrides}
				onMount={(editor) => setEditor(editor)}
			>
				<div className="color-picker-toolbar" onPointerDown={(e) => e.stopPropagation()}>
					<AddColorButton addColor={addColor} isFull={palette.hexes.length >= MAX_CUSTOM_COLORS} />
					<AddFontButton
						addedFamilies={palette.fonts.map((f) => f.family)}
						addFont={addFont}
						isFull={palette.fonts.length >= MAX_CUSTOM_FONTS}
					/>
					{hasCustomStyles && (
						<button
							className="color-picker-button"
							onClick={clearCustomStyles}
							title="Remove all custom colors and fonts, resetting any shapes that use them"
						>
							Clear custom styles
						</button>
					)}
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

// A stable theme that registers *every* possible custom slot (`custom-1..N`,
// `gf-1..N`). It's passed as the `themes` prop, which `createTLStore` registers
// into the style enum *before* the persisted document is validated on load, and
// which the editor re-registers on every render. Registering the full set means:
//   - persisted or cross-tab shapes can never reference a slot the enum doesn't
//     know, so they always pass validation (no load crash, no per-render drop);
//   - the enum is never narrowed, so adding/removing palette entries can't
//     invalidate existing shapes.
// The placeholder values here are never shown: the style panel and canvas read
// the *live* theme, which we set with `editor.updateTheme(buildTheme(...))` to
// contain only the slots actually in the palette.
function buildCompleteTheme(): TLTheme {
	const hexes = Array.from({ length: MAX_CUSTOM_COLORS }, () => '#000000')
	const fonts: GoogleFont[] = Array.from({ length: MAX_CUSTOM_FONTS }, (_, i) => ({
		name: `placeholder-${i + 1}`,
		family: 'sans-serif',
	}))
	return buildTheme(hexes, fonts)
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

[8]
The palette lives on the document's `meta`, not in a separate React/localStorage
copy. That single decision removes the cross-tab listener, the load-time
recovery pass, and the save-failure handling that a side store would need: the
editor already persists `meta` (via `persistenceKey`), syncs it to other tabs,
and records it in undo/redo — always atomically with the shapes that reference
the slots, so the two can never disagree.

[4]
The style enum is registered once, from a *complete* theme passed via the
`themes` prop (`buildCompleteTheme`), not from the palette. `createTLStore`
registers the prop before the persisted document is validated on load, and the
editor re-registers it on every render — so a shape can never reference a slot
the enum doesn't know. The palette's actual colors/fonts are pushed into the
live theme with `editor.updateTheme`; the style panel reads that live theme, so
only slots the palette actually contains are shown.

[11]
"Clear custom styles" clears the palette and remaps every shape and the
next-shape style off the custom slots back to the built-in defaults, both in one
`editor.run`. Because the palette and the shapes are now both in the document,
that single batch keeps them consistent through undo and redo.

*/
