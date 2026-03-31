import { useMemo, useState } from 'react'
import {
	DEFAULT_DARK_THEME,
	DEFAULT_LIGHT_THEME,
	TLDefaultColor,
	TLThemes,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-theme.css'

// [1]
// Extend the type system so TypeScript knows about our custom color.
// That's all you need — because we pass `themes` to `<Tldraw>`, the
// custom color name is registered automatically at store creation time.
declare module 'tldraw' {
	interface TLThemeColors {
		pink: TLDefaultColor
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

	// [4] Customize both light and dark themes: add the custom "pink"
	// color and merge slider overrides so adjustments apply to both.
	const themes = useMemo<TLThemes>(() => {
		const overrides = { fontSize, lineHeight, strokeWidth }
		return {
			light: {
				...DEFAULT_LIGHT_THEME,
				...overrides,
				colors: { ...DEFAULT_LIGHT_THEME.colors, pink: pinkLight },
			},
			dark: {
				...DEFAULT_DARK_THEME,
				...overrides,
				colors: { ...DEFAULT_DARK_THEME.colors, pink: pinkDark },
			},
		}
	}, [fontSize, lineHeight, strokeWidth])

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-theme-example"
				themes={themes}
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
					editor.createShape({
						type: 'note',
						x: 350,
						y: 350,
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
	const isDefault = value === defaultValue
	return (
		<div className="custom-theme-slider">
			<div className="custom-theme-slider__header">
				<span className="custom-theme-slider__label">{label}</span>
				<span className="custom-theme-slider__value" data-default={isDefault}>
					{value % 1 === 0 ? value : value.toFixed(2)}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
		</div>
	)
}

/*

[1]
Extend the `TLThemeColors` interface via module augmentation to add a
custom "pink" color. Because `themes` is passed to `<Tldraw>`, the
custom color name is registered automatically.

[2]
Define color entries for light and dark variants. Each theme that includes
the custom color needs a full `TLDefaultColor` entry for it.

[3]
Default values for the adjustable theme properties. These match the defaults
in `DEFAULT_LIGHT_THEME` and `DEFAULT_DARK_THEME`.

[4]
The `themes` object is recomputed whenever a slider changes. Because
`Tldraw` accepts `themes` as a prop, updating the object triggers a
reactive theme change — shapes immediately re-render with the new values.
The active theme (light or dark) is determined by the user's color scheme
preference, which can be toggled via the built-in dark mode shortcut.

[5]
Create a shape using the custom "pink" color. Because themes declare
the color, it passes validation automatically.

[6]
A panel with sliders for `fontSize`, `lineHeight`, and `strokeWidth`.
Adjusting these values lets you see in real time how theme values affect
shape rendering. Try drawing some shapes with different sizes and then
moving the stroke width slider!

*/
