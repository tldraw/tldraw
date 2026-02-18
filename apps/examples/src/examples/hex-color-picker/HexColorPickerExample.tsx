import {
	DefaultStylePanel,
	Editor,
	StylePanelArrowheadPicker,
	StylePanelArrowKindPicker,
	StylePanelDashPicker,
	StylePanelFillPicker,
	StylePanelFontPicker,
	StylePanelGeoShapePicker,
	StylePanelLabelAlignPicker,
	StylePanelOpacityPicker,
	StylePanelSection,
	StylePanelSizePicker,
	StylePanelSplinePicker,
	StylePanelTextAlignPicker,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiRow,
	TLShape,
	TLShapeStyleOverrides,
	TLUiStylePanelProps,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './hex-color-picker.css'

// There's a guide at the bottom of this file!

// [1] Custom style panel with hex color picker instead of the palette
function HexColorStylePanel(props: TLUiStylePanelProps) {
	return (
		<DefaultStylePanel {...props}>
			{/* [2] First section: our hex color pickers + opacity */}
			<StylePanelSection>
				<HexColorPickers />
				<StylePanelOpacityPicker />
			</StylePanelSection>
			{/* The rest of the sections are the same as DefaultStylePanelContent */}
			<StylePanelSection>
				<StylePanelFillPicker />
				<StylePanelDashPicker />
				<StylePanelSizePicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFontPicker />
				<StylePanelTextAlignPicker />
				<StylePanelLabelAlignPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelGeoShapePicker />
				<StylePanelArrowKindPicker />
				<StylePanelArrowheadPicker />
				<StylePanelSplinePicker />
			</StylePanelSection>
		</DefaultStylePanel>
	)
}

// [3] The hex color picker UI - replaces StylePanelColorPicker
const HexColorPickers = track(function HexColorPickers() {
	const editor = useEditor()
	const selectedShapes = editor.getSelectedShapes()

	// Get current colors from selected shapes' $color prop
	const colors = selectedShapes.map((s) => {
		const props = s.props as Record<string, unknown>
		return (props.$color as string) || null
	})

	const sharedColor = colors.every((c) => c === colors[0]) ? colors[0] : null

	return (
		<TldrawUiRow>
			<TldrawUiButton
				type="icon"
				className="hex-color-picker__button"
				title="Color"
				style={{
					// Use the selected color as the button's background
					backgroundColor: sharedColor || 'var(--color-background)',
				}}
			>
				<input
					type="color"
					className="hex-color-picker__input"
					value={sharedColor || '#000000'}
					onChange={(e) => {
						editor.markHistoryStoppingPoint()
						for (const shape of editor.getSelectedShapes()) {
							editor.updateShape({
								id: shape.id,
								type: shape.type,
								props: { $color: e.target.value },
							} as any)
						}
					}}
				/>
			</TldrawUiButton>
		</TldrawUiRow>
	)
})

// [4] Apply hex colors from $color prop to shape styles
function getHexColorStyleOverrides(shape: TLShape, _editor: Editor): TLShapeStyleOverrides | null {
	const props = shape.props as Record<string, unknown>
	const color = props.$color as string | undefined

	if (!color) return null

	return {
		strokeColor: color,
		fillColor: color,
		patternColor: color,
		labelColor: color,
	}
}

// [5] Components configuration
const components: TLComponents = {
	StylePanel: HexColorStylePanel,
}

// [6] Main example component
export default function HexColorPickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} getShapeStyleOverrides={getHexColorStyleOverrides} />
		</div>
	)
}

/*
This example shows how to replace tldraw's color palette with a hex color picker
using custom $ props.

[1] Custom style panel
We create a custom StylePanel component that wraps DefaultStylePanel. Instead of
using DefaultStylePanelContent, we compose our own content using the individual
style picker components exported by tldraw.

[2] First section
The first section contains our custom hex color picker (replacing the default
StylePanelColorPicker) plus the standard opacity picker.

[3] Hex color picker UI
The HexColorPickers component reads the current colors from the selected shapes'
$color prop. We use `track()` to make it reactive - it will re-render whenever
the selection or shape props change.

We use tldraw's UI primitives (TldrawUiRow, TldrawUiButton) to create a button
that matches the style panel's look. The button's background color shows the
current selection. A native `<input type="color">` is overlaid on the button
(made invisible) to capture clicks and open the browser's color picker. When
the user picks a color, we store it in shape.props.$color.

Custom $ props (props prefixed with $) can be added to any shape without needing
to modify the shape's schema. They're passed through validation automatically
and can be used to store custom data alongside the built-in props.

[4] getShapeStyleOverrides
This callback is called when computing styles for each shape. We read the hex
color from shape.props.$color and return it as style overrides. These override
the default colors computed from the shape's built-in color prop.

[5] Components configuration  
We pass our custom StylePanel to tldraw via the components prop.

[6] Main component
The main component sets up Tldraw with our custom components and the
getShapeStyleOverrides callback.

The pattern here is:
- Store the actual hex color in shape.props.$color (a custom $ prop)
- Use getShapeStyleOverrides to compute the visual styles from that data
- The shape's original color prop is still there as a fallback

This approach keeps your data clean (actual color values in props) while letting
tldraw's style system handle the rendering. The $ prefix ensures your custom
props don't conflict with any built-in prop names.
*/
