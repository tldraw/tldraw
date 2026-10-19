import { useCallback, useEffect, useRef, useState } from 'react'
import {
	DEFAULT_THEME,
	Editor,
	TLDefaultColor,
	TLTheme,
	TLThemeFont,
	TLThemes,
	TLUiOverrides,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'
import silkscreenBoldUrl from './custom-font/Silkscreen-Bold.ttf'
import silkscreenRegularUrl from './custom-font/Silkscreen-Regular.ttf'
import './custom-theme.css'

// [1]
declare module '@tldraw/tlschema' {
	interface TLThemeDefaultColors {
		pink: TLDefaultColor
	}
	interface TLThemeFonts {
		pixel: TLThemeFont
		cursive: TLThemeFont
	}
	// [2]
	interface TLRemovedDefaultThemeColors {
		'light-violet': true
		'light-blue': true
		'light-green': true
		'light-red': true
	}
}

// Helper to create a full color entry from a base solid color
function makeColor(solid: string, semi: string, pattern: string): TLDefaultColor {
	return {
		solid,
		semi,
		pattern,
		fill: solid,
		linedFill: semi,
		frameHeadingStroke: solid,
		frameHeadingFill: semi,
		frameStroke: solid,
		frameFill: semi,
		frameText: solid,
		noteFill: semi,
		noteText: solid,
		highlightSrgb: solid,
		highlightP3: solid,
	}
}

// [3]
const pinkLight = makeColor('#e91e8c', '#fce4f2', '#f06baf')
const pinkDark = makeColor('#f06baf', '#3d1a2e', '#e91e8c')

// [4]
const pixelFont: TLThemeFont = {
	fontFamily: "'Silkscreen', sans-serif",
	icon: <div style={{ fontFamily: 'Silkscreen, sans-serif', fontSize: 16, lineHeight: 1 }}>Aa</div>,
	faces: [
		{
			family: 'Silkscreen',
			src: { url: silkscreenRegularUrl },
			weight: 'normal',
			style: 'normal',
		},
		{
			family: 'Silkscreen',
			src: { url: silkscreenBoldUrl },
			weight: 'bold',
			style: 'normal',
		},
	],
}

// Custom font — use a Google Font loaded via full URLs. These versioned
// gstatic URLs expire when Google revs the font; refresh them from
// https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700 if they 404.
const cursiveFont: TLThemeFont = {
	fontFamily: "'Comic Neue', cursive",
	icon: <div style={{ fontFamily: "'Comic Neue', cursive", fontSize: 16, lineHeight: 1 }}>Aa</div>,
	faces: [
		{
			family: 'Comic Neue',
			src: {
				url: 'https://fonts.gstatic.com/s/comicneue/v9/4UaHrEJDsxBrF37olUeD96rp57F2IwM.woff2',
				format: 'woff2',
			},
			weight: 'normal',
			style: 'normal',
		},
		{
			family: 'Comic Neue',
			src: {
				url: 'https://fonts.gstatic.com/s/comicneue/v9/4UaErEJDsxBrF37olUeD_xHM8pxULilENlY.woff2',
				format: 'woff2',
			},
			weight: 'bold',
			style: 'normal',
		},
	],
}

// [5]
const { serif: _serif, ...keptFonts } = DEFAULT_THEME.fonts
const customFonts = { ...keptFonts, pixel: pixelFont, cursive: cursiveFont } as TLTheme['fonts']

// [6]
function colorsWithoutLightVariants(base: Record<string, unknown>, pink: TLDefaultColor) {
	const {
		'light-violet': _lv,
		'light-blue': _lb,
		'light-green': _lg,
		'light-red': _lr,
		...kept
	} = base
	return { ...kept, pink } as TLTheme['colors']['light']
}

// [7]
const uiOverrides: TLUiOverrides = {
	translations: {
		en: {
			'color-style.pink': 'Pink',
			'font-style.pixel': 'Pixel',
			'font-style.cursive': 'Cursive',
		},
	},
}

// [8]
const DEFAULTS = {
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
}

// [9]
const themes: Partial<TLThemes> = {
	default: {
		id: 'default',
		fontSize: DEFAULTS.fontSize,
		lineHeight: DEFAULTS.lineHeight,
		strokeWidth: DEFAULTS.strokeWidth,
		fonts: customFonts,
		colors: {
			light: colorsWithoutLightVariants(DEFAULT_THEME.colors.light, pinkLight),
			dark: colorsWithoutLightVariants(DEFAULT_THEME.colors.dark, pinkDark),
		},
	},
}

export default function CustomThemeExample() {
	const [fontSize, setFontSize] = useState(DEFAULTS.fontSize)
	const [lineHeight, setLineHeight] = useState(DEFAULTS.lineHeight)
	const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth)
	const editorRef = useRef<Editor | null>(null)

	// Apply slider values to the theme programmatically. Rather than passing
	// a new `themes` object whenever a value changes (which would recreate the
	// store and reload the canvas from persistence), we update the existing
	// "default" theme in place via `editor.updateTheme()`. Spreading the current
	// theme preserves the custom colors and fonts while overriding the adjusted
	// values. Shapes re-render reactively without the board flashing.
	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		editor.updateTheme({ ...editor.getTheme('default')!, fontSize, lineHeight, strokeWidth })
	}, [fontSize, lineHeight, strokeWidth])

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-theme-example"
				themes={themes}
				overrides={uiOverrides}
				onMount={(editor) => {
					editorRef.current = editor
					if (editor.getCurrentPageShapeIds().size > 0) return

					editor.createShape({
						type: 'geo',
						x: 100,
						y: 100,
						props: { w: 200, h: 200, color: 'red' },
					})
					editor.createShape({
						type: 'geo',
						x: 350,
						y: 100,
						props: {
							w: 200,
							h: 200,
							color: 'blue',
							geo: 'ellipse',
							richText: toRichText('Hello'),
						},
					})
					// [10]
					editor.createShape({
						type: 'geo',
						x: 600,
						y: 100,
						props: { w: 200, h: 200, color: 'pink', geo: 'diamond' },
					})
					editor.createShape({
						type: 'text',
						x: 100,
						y: 350,
						props: { richText: toRichText('Theme text'), size: 'l' },
					})
					// [11]
					editor.createShape({
						type: 'text',
						x: 350,
						y: 350,
						props: { richText: toRichText('Pixel font!'), size: 'l', font: 'pixel' },
					})
					editor.createShape({
						type: 'text',
						x: 600,
						y: 350,
						props: { richText: toRichText('Cursive font!'), size: 'l', font: 'cursive' },
					})
					editor.createShape({
						type: 'note',
						x: 100,
						y: 500,
						props: {
							color: 'black',
							richText: toRichText('A sticky note'),
						},
					})
				}}
			>
				<ThemeControls
					fontSize={fontSize}
					onFontSizeChange={setFontSize}
					lineHeight={lineHeight}
					onLineHeightChange={setLineHeight}
					strokeWidth={strokeWidth}
					onStrokeWidthChange={setStrokeWidth}
				/>
			</Tldraw>
		</div>
	)
}

// [12]
function ThemeControls({
	fontSize,
	onFontSizeChange,
	lineHeight,
	onLineHeightChange,
	strokeWidth,
	onStrokeWidthChange,
}: {
	fontSize: number
	onFontSizeChange(v: number): void
	lineHeight: number
	onLineHeightChange(v: number): void
	strokeWidth: number
	onStrokeWidthChange(v: number): void
}) {
	return (
		<div className="tlui-menu custom-theme-toolbar" onPointerDown={(e) => e.stopPropagation()}>
			<ThemeSlider
				label="Font size"
				value={fontSize}
				onChange={onFontSizeChange}
				min={8}
				max={32}
				step={1}
				defaultValue={DEFAULTS.fontSize}
			/>
			<ThemeSlider
				label="Line height"
				value={lineHeight}
				onChange={onLineHeightChange}
				min={1}
				max={2}
				step={0.05}
				defaultValue={DEFAULTS.lineHeight}
			/>
			<ThemeSlider
				label="Stroke width"
				value={strokeWidth}
				onChange={onStrokeWidthChange}
				min={0.5}
				max={6}
				step={0.25}
				defaultValue={DEFAULTS.strokeWidth}
			/>

			<TldrawUiButton
				type="low"
				onClick={() => {
					onFontSizeChange(DEFAULTS.fontSize)
					onLineHeightChange(DEFAULTS.lineHeight)
					onStrokeWidthChange(DEFAULTS.strokeWidth)
				}}
			>
				<TldrawUiButtonLabel>Reset to defaults</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

function ThemeSlider({
	label,
	value,
	onChange,
	min,
	max,
	step,
	defaultValue,
}: {
	label: string
	value: number
	onChange(v: number): void
	min: number
	max: number
	step: number
	defaultValue: number
}) {
	const [localValue, setLocalValue] = useState(value)
	const isDragging = useRef(false)

	// sync from parent when not actively dragging
	if (!isDragging.current && localValue !== value) {
		setLocalValue(value)
	}

	const isDefault = localValue === defaultValue

	const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		isDragging.current = true
		setLocalValue(Number(e.target.value))
	}, [])

	const handleCommit = useCallback(() => {
		if (!isDragging.current) return
		isDragging.current = false
		onChange(localValue)
	}, [onChange, localValue])

	return (
		<div className="custom-theme-slider">
			<div className="custom-theme-slider__header">
				<span className="custom-theme-slider__label">{label}</span>
				<span className="custom-theme-slider__value" data-default={isDefault}>
					{localValue % 1 === 0 ? localValue : localValue.toFixed(2)}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={localValue}
				onChange={handleInput}
				onPointerUp={handleCommit}
			/>
		</div>
	)
}

/*

[1]
Extend the `TLThemeDefaultColors` and `TLThemeFonts` interfaces via module
augmentation so TypeScript knows about the custom "pink" color and the "pixel"
and "cursive" fonts. Because `themes` is passed to `<Tldraw>`, the names are
registered with the style enums automatically at store creation.

[2]
Extend `TLRemovedDefaultThemeColors` to remove built-in colors from the type.
This is the type-level half of removing the "light-*" variants; [6] removes
them from the theme values.

[3]
Define color entries for light and dark variants. Each theme needs a full
`TLDefaultColor` entry for the custom color in both palettes.

[4]
A custom font has a `fontFamily` CSS string and, for fonts that need loading, a
`faces` array of `TLFontFace` entries pointing at the font files (here bundled
locally via import; the cursive font below uses remote URLs). System fonts like
Arial or Georgia can omit `faces`. The `icon` field is the React element the
style panel uses as the button for this font; here "Aa" rendered in the font
itself.

[5]
Remove a built-in font: destructure "serif" out of the default font palette and
spread the rest. The serif option disappears from the style panel and the two
custom fonts take its place.

[6]
Remove built-in colors: destructure the "light-*" variants out of the default
palette. They won't appear in the style panel, and "pink" is added in their place.

[7]
Translation overrides provide human-readable names for custom style values.
Without these, the tooltip for "pink" would show the raw key "color-style.pink".

[8]
Default values for the adjustable theme properties. These match `DEFAULT_THEME`.

[9]
The `themes` prop is a stable object passed once to `<Tldraw>`. It registers the
custom color and fonts at store creation and seeds the starting values. Slider
adjustments are applied at runtime with `editor.updateTheme()` rather than by
passing a new `themes` prop, because a new object would recreate the store and
reload the canvas from persistence. `updateTheme` updates the active theme
reactively, so shapes re-render immediately. Which palette (light or dark) is
used follows the user's color scheme preference.

[10]
Create a shape using the custom "pink" color. Because the theme declares the
color, it passes validation.

[11]
Create shapes using the custom "pixel" and "cursive" fonts. They show up in the
style panel alongside the remaining built-in fonts (draw, sans, mono).

[12]
A panel with sliders for `fontSize`, `lineHeight`, and `strokeWidth`. Try
drawing some shapes with different sizes and then moving the stroke width
slider to see how theme values affect shape rendering.

*/
