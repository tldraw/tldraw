import { useMemo, useState } from 'react'
import {
	DEFAULT_DARK_THEME,
	DEFAULT_LIGHT_THEME,
	registerColors,
	TLDefaultColor,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
	TLThemes,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-theme.css'

// Extend the type system so TypeScript knows about our custom color
declare module 'tldraw' {
	interface TLThemeColors {
		pink: TLDefaultColor
	}
}

// There's a guide at the bottom of this file!

// [1]
// Register a custom "pink" color so it appears in the style panel and
// passes validation everywhere. Call this before rendering any tldraw
// components.
registerColors(['pink'])

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

const baseThemes: TLThemes = {
	light: {
		...DEFAULT_LIGHT_THEME,
		colors: { ...DEFAULT_LIGHT_THEME.colors, pink: pinkLight },
	},
	dark: {
		...DEFAULT_DARK_THEME,
		colors: { ...DEFAULT_DARK_THEME.colors, pink: pinkDark },
	},
	'my-brand': {
		id: 'my-brand',
		fontSize: DEFAULT_DARK_THEME.fontSize,
		lineHeight: DEFAULT_DARK_THEME.lineHeight,
		strokeWidth: DEFAULT_DARK_THEME.strokeWidth,
		colors: {
			...DEFAULT_DARK_THEME.colors,
			pink: pinkDark,
			background: '#1a1a2e',
			solid: '#16213e',
			text: '#e0e0e0',
			cursor: '#e94560',
			noteBorder: '#e94560',
			black: {
				...DEFAULT_DARK_THEME.colors.black,
				solid: '#e0e0e0',
				semi: '#2a2a4a',
				pattern: '#b0b0cc',
				noteFill: '#e94560',
				noteText: '#ffffff',
			},
			blue: {
				...DEFAULT_DARK_THEME.colors.blue,
				solid: '#0f3460',
				semi: '#1a1a3e',
				pattern: '#1a5276',
			},
			red: {
				...DEFAULT_DARK_THEME.colors.red,
				solid: '#e94560',
				semi: '#2e1a2e',
				pattern: '#c0392b',
			},
		},
	},
}

// [5] Defaults for the adjustable theme values
const DEFAULTS = {
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
}

export default function CustomThemeExample() {
	const [themeId, setThemeId] = useState<string>('light')
	const [fontSize, setFontSize] = useState(DEFAULTS.fontSize)
	const [lineHeight, setLineHeight] = useState(DEFAULTS.lineHeight)
	const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth)

	// [6] Merge slider overrides into every theme so the adjustment
	// applies regardless of which theme is active.
	const themes = useMemo<TLThemes>(() => {
		const overrides = { fontSize, lineHeight, strokeWidth }
		const result: TLThemes = {}
		for (const [id, theme] of Object.entries(baseThemes)) {
			result[id] = { ...theme, ...overrides }
		}
		return result
	}, [fontSize, lineHeight, strokeWidth])

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-theme-example"
				themes={themes}
				theme={themeId}
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
					// [4] Use the custom "pink" color registered above
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
					themeId={themeId}
					onThemeChange={setThemeId}
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

// [7] A collapsible panel with theme switcher buttons and value sliders.
function ThemeControls({
	themeId,
	onThemeChange,
	fontSize,
	onFontSizeChange,
	lineHeight,
	onLineHeightChange,
	strokeWidth,
	onStrokeWidthChange,
}: {
	themeId: string
	onThemeChange(id: string): void
	fontSize: number
	onFontSizeChange(v: number): void
	lineHeight: number
	onLineHeightChange(v: number): void
	strokeWidth: number
	onStrokeWidthChange(v: number): void
}) {
	return (
		<div className="tlui-menu custom-theme-toolbar" onPointerDown={(e) => e.stopPropagation()}>
			<TldrawUiSelect id="theme-select" value={themeId} onValueChange={onThemeChange}>
				<TldrawUiSelectTrigger>
					<TldrawUiSelectValue placeholder="Theme...">{themeId}</TldrawUiSelectValue>
				</TldrawUiSelectTrigger>
				<TldrawUiSelectContent side="bottom" align="start">
					<TldrawUiSelectItem value="light" label="Light" />
					<TldrawUiSelectItem value="dark" label="Dark" />
					<TldrawUiSelectItem value="my-brand" label="My brand" />
				</TldrawUiSelectContent>
			</TldrawUiSelect>

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
Register a custom color name ("pink") with `registerColors()`. This extends
the `DefaultColorStyle` and `DefaultLabelColorStyle` validators so the new
color passes validation and appears in the style panel automatically.

[2]
Define color entries for light and dark variants. Each theme that includes
the custom color needs a full `TLDefaultColor` entry for it.

[3]
A simple theme switcher overlay. Clicking a button sets the active theme
by ID. You could also call `editor.setTheme('my-brand')` imperatively.

[4]
Create a shape using the custom "pink" color. Because we called
`registerColors(['pink'])` at module scope, this value passes validation.

[5]
Default values for the adjustable theme properties. These match the defaults
in `DEFAULT_LIGHT_THEME` and `DEFAULT_DARK_THEME`.

[6]
The `themes` object is recomputed whenever a slider changes. Because
`Tldraw` accepts `themes` as a prop, updating the object triggers a
reactive theme change — shapes immediately re-render with the new values.

[7]
A collapsible panel with sliders for `fontSize`, `lineHeight`, and
`strokeWidth`. Adjusting these values lets you see in real time how
theme values affect shape rendering. Try drawing some shapes with
different sizes and then moving the stroke width slider!

*/
