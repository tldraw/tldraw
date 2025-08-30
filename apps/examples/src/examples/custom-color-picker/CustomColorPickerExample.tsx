import { ColorStyle } from '@tldraw/tlschema/src/styles/TLColorStyle'
import {
	ColorStyleUtil,
	DefaultStylePanel,
	T,
	TLComponents,
	Tldraw,
	track,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [2]
class HexColorStyleUtil extends ColorStyleUtil<string> {
	static validator = T.string

	override options = {
		defaultColor: '#ff0000',
	}

	override getDefaultValue(): string {
		return this.options.defaultColor
	}

	override toCssColor(hexColor: string, variant: string): string {
		// For hex colors, we can use the color directly for most variants
		switch (variant) {
			case 'solid':
			case 'fill':
				return hexColor
			case 'semi':
				// Add some transparency for semi variant
				return hexColor + '80' // 50% opacity
			case 'pattern':
				// Slightly darker for pattern variant
				return this.adjustColorBrightness(hexColor, -0.2)
			default:
				return hexColor
		}
	}

	// Helper method to adjust color brightness
	private adjustColorBrightness(hex: string, factor: number): string {
		const r = parseInt(hex.slice(1, 3), 16)
		const g = parseInt(hex.slice(3, 5), 16)
		const b = parseInt(hex.slice(5, 7), 16)

		const adjustedR = Math.max(0, Math.min(255, Math.round(r * (1 + factor))))
		const adjustedG = Math.max(0, Math.min(255, Math.round(g * (1 + factor))))
		const adjustedB = Math.max(0, Math.min(255, Math.round(b * (1 + factor))))

		return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG
			.toString(16)
			.padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`
	}
}

// [3]
const ColorPickerPanel = track(function ColorPickerPanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()

	if (!styles) return null

	const hexColor = styles.get(ColorStyle)
	console.log('hexColor', hexColor)

	return (
		<div
			style={{
				padding: '8px',
				borderBottom: '1px solid var(--color-panel-contrast)',
				pointerEvents: 'auto',
			}}
		>
			<div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Custom Color</div>
			<input
				type="color"
				value={hexColor && hexColor.type !== 'mixed' ? hexColor.value : '#000000'}
				onChange={(e) => {
					console.log('e.target.value', e.target.value)
					editor.setStyleForSelectedShapes(ColorStyle, e.target.value)
				}}
				style={{
					width: '100%',
					height: '32px',
					border: 'none',
					borderRadius: '4px',
					cursor: 'pointer',
				}}
			/>
		</div>
	)
})

// [4]
const components: TLComponents = {
	StylePanel: () => {
		return (
			<div>
				<ColorPickerPanel />
				<DefaultStylePanel />
			</div>
		)
	},
}

export default function CustomColorPickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				styleUtils={[HexColorStyleUtil]}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
				}}
			/>
		</div>
	)
}

/*

[1]
Create a custom StyleProp for hex colors. This defines a new style property
that accepts hex color strings (like #ff0000) and validates them with a regex.
The defaultValue is black (#000000).

[2]
Create a custom ColorStyleUtil that extends our ColorStyleUtil class. This
handles converting hex color values to CSS colors for different variants
(solid, semi, pattern, fill). It includes a helper method to adjust brightness
for pattern variants.

[3]
Create a custom color picker component that uses the native HTML color input.
It uses the useRelevantStyles hook to get the current color value and 
setStyleForSelectedShapes to update the color when changed. The component
includes pointer-events: auto to ensure it's interactive within the style panel.

[4]
Define a custom StylePanel component that includes our color picker.
The color picker is added to the style panel where users can access it
when shapes are selected. We also add pointer-events: auto to ensure
the color picker is interactive within the style panel.

[5]
UI overrides allow us to customize the tldraw interface. In this case,
we could hide default color tools if desired.

[6]
Pass our custom HexColorStyleUtil to tldraw via the styleUtils prop. This
tells tldraw to use our custom color system instead of the default one.

*/
