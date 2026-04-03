import { useCallback, useMemo, useRef, useState } from 'react'
import {
	DEFAULT_THEME,
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
// Extend the type system so TypeScript knows about our custom color and font.
// Because we pass `themes` to `<Tldraw>`, the custom names are
// registered automatically at store creation time.
declare module '@tldraw/tlschema' {
	interface TLThemeDefaultColors {
		pink: TLDefaultColor
	}
	interface TLThemeFonts {
		pixel: TLThemeFont
		cursive: TLThemeFont
	}
	// [7] Remove the "light-*" color variants from the palette.
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

// [2]
const pinkLight = makeColor('#e91e8c', '#fce4f2', '#f06baf')
const pinkDark = makeColor('#f06baf', '#3d1a2e', '#e91e8c')

// [8] Custom font — use a local font loaded from a bundled TTF file.
// The `icon` field provides a React element for the style panel button.
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

// Custom font — use a Google Font loaded via full URLs.
const cursiveFont: TLThemeFont = {
	fontFamily: "'Comic Neue', cursive",
	icon: <div style={{ fontFamily: "'Comic Neue', cursive", fontSize: 16, lineHeight: 1 }}>Aa</div>,
	faces: [
		{
			family: 'Comic Neue',
			src: {
				url: 'https://fonts.gstatic.com/s/comicneue/v8/4UaErEJDsxBrF37olUeD_wHLwpteLwtHJlc.woff2',
				format: 'woff2',
			},
			weight: 'normal',
			style: 'normal',
		},
		{
			family: 'Comic Neue',
			src: {
				url: 'https://fonts.gstatic.com/s/comicneue/v8/4UaFrEJDsxBrF37olUeD96_RTplUKylCNlcw_Q.woff2',
				format: 'woff2',
			},
			weight: 'bold',
			style: 'normal',
		},
	],
}

// [10] Build a reduced font palette: drop "serif", keep the rest, add custom fonts.
const { serif: _serif, ...keptFonts } = DEFAULT_THEME.fonts
const customFonts = { ...keptFonts, pixel: pixelFont, cursive: cursiveFont } as TLTheme['fonts']

// [11] Build a reduced color palette: drop "light-*" variants, add "pink".
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

// [12] Translation overrides so the style panel shows human-readable names
// for our custom colors and fonts instead of raw keys like "color-style.pink".
const uiOverrides: TLUiOverrides = {
	translations: {
		en: {
			'color-style.pink': 'Pink',
			'font-style.pixel': 'Pixel',
			'font-style.cursive': 'Cursive',
		},
	},
}

// [3] Defaults for the adjustable theme values
const DEFAULTS = {
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
}

export default function CustomThemeExample() {
	const [fontSize, setFontSize] = useState(DEFAULTS.fontSize)
	const [lineHeight, setLineHeight] = useState(DEFAULTS.lineHeight)
	const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth)

	// [4] Customize the default theme: add the custom "pink" color,
	// custom fonts, and merge slider overrides so adjustments apply to both modes.
	const themes = useMemo<Partial<TLThemes>>(() => {
		return {
			default: {
				id: 'default',
				fontSize,
				lineHeight,
				strokeWidth,
				fonts: customFonts,
				colors: {
					light: colorsWithoutLightVariants(DEFAULT_THEME.colors.light, pinkLight),
					dark: colorsWithoutLightVariants(DEFAULT_THEME.colors.dark, pinkDark),
				},
			},
		}
	}, [fontSize, lineHeight, strokeWidth])

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-theme-example"
				themes={themes}
				overrides={uiOverrides}
				onMount={(editor) => {
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
					// [5] Use the custom "pink" color declared in our themes
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
					// [9] Use the custom fonts declared in our themes
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

// [6] A panel with sliders to adjust theme values in real time.
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
Extend `TLThemeDefaultColors` and `TLThemeFonts` interfaces via module augmentation
to add a custom "pink" color and custom "pixel" / "cursive" fonts. Because
`themes` is passed to `<Tldraw>`, these names are registered
automatically.

[2]
Define color entries for light and dark variants. Each theme definition
needs a full `TLDefaultColor` entry for the custom color in both palettes.

[3]
Default values for the adjustable theme properties. These match the defaults
in `DEFAULT_THEME`.

[4]
The `themes` object is recomputed whenever a slider changes.
Because `Tldraw` accepts `themes` as a prop, updating the object
triggers a reactive theme change — shapes immediately re-render with the
new values. The active color mode (light or dark) is determined by the
user's color scheme preference.

[5]
Create a shape using the custom "pink" color. Because the theme definition
declares the color, it passes validation automatically.

[6]
A panel with sliders for `fontSize`, `lineHeight`, and `strokeWidth`.
Adjusting these values lets you see in real time how theme values affect
shape rendering. Try drawing some shapes with different sizes and then
moving the stroke width slider!

[8]
Define a custom font with a fontFamily CSS string and font face definitions
for loading. The `faces` array contains `TLFontFace` entries with URLs to
the actual font files (here bundled locally via import). For system fonts
(like Arial or Georgia), you can omit `faces` entirely — they don't need
loading. The `icon` field provides a React element that the style panel
uses as the button icon for this font — here a letter "A" rendered in
the custom font itself.

[9]
Create shapes using the custom "pixel" and "cursive" fonts. They show up
in the style panel alongside the remaining built-in fonts (draw, sans, mono).

[10]
Demonstrate removing a built-in font: destructure out "serif" from the
default font palette and spread the rest. The serif font option disappears
from the style panel. Two custom fonts are added in its place.

[11]
Demonstrate removing built-in colors: destructure out the "light-*" color
variants from the default palette. They won't appear in the style panel.
The custom "pink" color is added in their place.

[12]
Translation overrides provide human-readable names for custom style values.
Without these, the tooltip for a custom color like "pink" would show the
raw translation key "color-style.pink". Pass an `overrides` prop to `<Tldraw>`
with a `translations` map keyed by locale code (here just `en`).

*/
