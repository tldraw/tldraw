import {
	DefaultStylePanel,
	DrawShapeUtil,
	StyleProp,
	StylePanelArrowKindPicker,
	StylePanelArrowheadPicker,
	StylePanelColorPicker,
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
	T,
	TLComponents,
	TLUiStylePanelProps,
	Tldraw,
	drawShapeProps,
	useStylePanelContext,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './stroke-size-picker.css'

// [1]
const strokeSizeStyle = StyleProp.define('example:strokeSize', {
	defaultValue: 4,
	type: T.number,
})

// [2]
declare module '@tldraw/tlschema' {
	interface TLDrawShapeProps {
		strokeSize: number
	}
}

// [3]
class CustomDrawShapeUtil extends DrawShapeUtil.configure({
	getCustomDisplayValues(_editor, shape) {
		return { strokeWidth: shape.props.strokeSize }
	},
}) {
	static override props = { ...drawShapeProps, strokeSize: strokeSizeStyle }

	override getDefaultProps() {
		return { ...super.getDefaultProps(), strokeSize: strokeSizeStyle.defaultValue }
	}
}

const shapeUtils = [CustomDrawShapeUtil]

const STROKE_SIZE_PRESETS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 26, 32]

// [4]
function StrokeSizePicker() {
	const { styles, onValueChange, onHistoryMark } = useStylePanelContext()
	const strokeSize = styles.get(strokeSizeStyle)

	// [5]
	if (strokeSize === undefined) return <StylePanelSizePicker />

	const value = strokeSize.type === 'mixed' ? null : strokeSize.value

	return (
		<div className="stroke-size-picker">
			{STROKE_SIZE_PRESETS.map((size) => (
				<button
					key={size}
					className="stroke-size-picker__preset"
					data-active={value === size}
					title={`Stroke size ${size}`}
					onClick={() => {
						onHistoryMark('set stroke size')
						onValueChange(strokeSizeStyle, size)
					}}
				>
					<div
						className="stroke-size-picker__dot"
						style={{ width: 4 + size / 2, height: 4 + size / 2 }}
					/>
				</button>
			))}
		</div>
	)
}

// [6]
function CustomStylePanel(props: TLUiStylePanelProps) {
	return (
		<DefaultStylePanel {...props}>
			<StylePanelSection>
				<StylePanelColorPicker />
				<StylePanelOpacityPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFillPicker />
				<StylePanelDashPicker />
				<StrokeSizePicker />
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

const components: TLComponents = {
	StylePanel: CustomStylePanel,
}

export default function StrokeSizePickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					editor.setCurrentTool('draw')
				}}
			/>
		</div>
	)
}

/*
This example replaces the draw tool's four stroke sizes (s, m, l, xl) with a
custom numeric stroke size style, controlled from the style panel by a
twelve-option preset picker.

[1]
We define a numeric style prop for the stroke size. Because it's a style
(rather than a plain shape prop), the editor remembers the most recent value
for the next shape you draw, shows it in the style panel whenever it's
relevant, and reports a "mixed" value when a multi-shape selection disagrees.

[2]
We extend the draw shape's props interface via declaration merging, so
`shape.props.strokeSize` is fully typed everywhere in this file.

[3]
We customize the default draw shape in two steps. `DrawShapeUtil.configure`
overrides `getCustomDisplayValues`, which the draw shape resolves its stroke
width through, so rendering, hit testing, and image exports all use our
custom size. The subclass then adds the style to the shape's props and
default props, which registers it with the editor's styles system and the
store's validator. Passing the util to `Tldraw` via the `shapeUtils` prop
replaces the built-in draw shape util, so the default draw tool picks it up
automatically.

[4]
The picker reads the current value from `useStylePanelContext`. Its
`onValueChange` helper applies the style to any selected shapes and remembers
it for the next shapes, exactly like the built-in pickers.

[5]
The style map only contains the stroke size style when it's relevant: when
the draw tool is active, or when the selection includes draw shapes.
Everywhere else (geo shapes, arrows, text, and so on) we fall back to the
default four-value size picker, since those shapes still use the built-in
size style.

[6]
We compose the style panel from the same building blocks as the default
panel, swapping the size picker slot for our stroke size picker. See
`DefaultStylePanelContent` for the full list of available sections. Make sure
to forward the panel's props to `DefaultStylePanel`: the editor passes
`isMobile` when it renders the panel inside the mobile toolbar popover.
*/
