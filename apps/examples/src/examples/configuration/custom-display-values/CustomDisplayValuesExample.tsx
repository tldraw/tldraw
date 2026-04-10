import { useCallback } from 'react'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	GeoShapeUtil,
	JsonObject,
	NoteShapeUtil,
	StylePanelSection,
	StylePanelSubheading,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiSlider,
	type TLUiStylePanelProps,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-display-values.css'

// [1]
const BORDER_COLORS = [
	{ value: null, label: 'Default' },
	{ value: '#e03131', label: 'Red' },
	{ value: '#1971c2', label: 'Blue' },
	{ value: '#2f9e44', label: 'Green' },
	{ value: '#f08c00', label: 'Orange' },
	{ value: 'transparent', label: 'No border' },
] as const

const FONT_COLORS = [
	{ value: null, label: 'Default' },
	{ value: '#e03131', label: 'Red' },
	{ value: '#1971c2', label: 'Blue' },
	{ value: '#2f9e44', label: 'Green' },
	{ value: '#f08c00', label: 'Orange' },
	{ value: '#000000', label: 'Black' },
] as const

const FONT_SIZE_STEPS = [12, 16, 20, 24, 32, 48] as const

// [2]
const shapeUtils = [
	GeoShapeUtil.configure({
		getCustomDisplayValues(_editor, shape) {
			const result: Partial<{
				strokeWidth: number
				strokeColor: string
				labelColor: string
				labelFontSize: number
			}> = {}
			if (shape.meta.borderColor === 'transparent') {
				result.strokeWidth = 0
			} else if (shape.meta.borderColor) {
				result.strokeColor = shape.meta.borderColor as string
			}
			if (shape.meta.fontColor) {
				result.labelColor = shape.meta.fontColor as string
			}
			if (shape.meta.labelFontSize) {
				result.labelFontSize = shape.meta.labelFontSize as number
			}
			return result
		},
	}),
	NoteShapeUtil.configure({
		getCustomDisplayValues(_editor, shape) {
			const result: Partial<{
				borderWidth: number
				borderColor: string
				labelColor: string
				labelFontSize: number
			}> = {}
			if (shape.meta.borderColor === 'transparent') {
				result.borderWidth = 0
			} else if (shape.meta.borderColor) {
				result.borderColor = shape.meta.borderColor as string
				result.borderWidth = 3
			}
			if (shape.meta.fontColor) {
				result.labelColor = shape.meta.fontColor as string
			}
			if (shape.meta.labelFontSize) {
				result.labelFontSize = shape.meta.labelFontSize as number
			}
			return result
		},
	}),
]

// [3]
function updateSelectedMeta(editor: ReturnType<typeof useEditor>, meta: JsonObject) {
	const shapes = editor.getSelectedShapes().filter((s) => s.type === 'geo' || s.type === 'note')
	for (const shape of shapes) {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			meta: { ...shape.meta, ...meta },
		} as any)
	}
}

// [4]
function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	const hasGeoOrNote = useValue(
		'has geo/note selected',
		() => editor.getSelectedShapes().some((s) => s.type === 'geo' || s.type === 'note'),
		[editor]
	)

	const currentBorderColor = useValue(
		'border color',
		() => {
			const shapes = editor.getSelectedShapes().filter((s) => s.type === 'geo' || s.type === 'note')
			if (shapes.length === 0) return undefined
			const first = shapes[0].meta.borderColor ?? null
			const allSame = shapes.every((s) => (s.meta.borderColor ?? null) === first)
			return allSame ? first : 'mixed'
		},
		[editor]
	)

	const currentFontColor = useValue(
		'font color',
		() => {
			const shapes = editor.getSelectedShapes().filter((s) => s.type === 'geo' || s.type === 'note')
			if (shapes.length === 0) return undefined
			const first = shapes[0].meta.fontColor ?? null
			const allSame = shapes.every((s) => (s.meta.fontColor ?? null) === first)
			return allSame ? first : 'mixed'
		},
		[editor]
	)

	const currentFontSizeStep = useValue(
		'font size',
		() => {
			const shapes = editor.getSelectedShapes().filter((s) => s.type === 'geo' || s.type === 'note')
			if (shapes.length === 0) return null
			const first = (shapes[0].meta.labelFontSize as number | undefined) ?? null
			const allSame = shapes.every(
				(s) => ((s.meta.labelFontSize as number | undefined) ?? null) === first
			)
			if (!allSame || first === null) return null
			const idx = FONT_SIZE_STEPS.indexOf(first as (typeof FONT_SIZE_STEPS)[number])
			return idx >= 0 ? idx : null
		},
		[editor]
	)

	const handleBorderColorChange = useCallback(
		(color: string | null) => {
			editor.markHistoryStoppingPoint('border color')
			updateSelectedMeta(editor, { borderColor: color })
		},
		[editor]
	)

	const handleFontColorChange = useCallback(
		(color: string | null) => {
			editor.markHistoryStoppingPoint('font color')
			updateSelectedMeta(editor, { fontColor: color })
		},
		[editor]
	)

	const handleFontSizeChange = useCallback(
		(stepIndex: number) => {
			editor.markHistoryStoppingPoint('font size')
			updateSelectedMeta(editor, { labelFontSize: FONT_SIZE_STEPS[stepIndex] })
		},
		[editor]
	)

	const handleFontSizeReset = useCallback(() => {
		editor.markHistoryStoppingPoint('font size reset')
		const shapes = editor.getSelectedShapes().filter((s) => s.type === 'geo' || s.type === 'note')
		for (const shape of shapes) {
			const { labelFontSize: _, ...rest } = shape.meta
			editor.updateShape({ id: shape.id, type: shape.type, meta: rest } as any)
		}
	}, [editor])

	return (
		<DefaultStylePanel {...props}>
			<DefaultStylePanelContent />
			{hasGeoOrNote && (
				<>
					{/* [5] */}
					<StylePanelSection>
						<StylePanelSubheading>Border color</StylePanelSubheading>
						<div className="custom-dv__color-row">
							{BORDER_COLORS.map((item) => {
								const isActive = currentBorderColor === item.value
								return (
									<TldrawUiButton
										key={item.label}
										type="icon"
										title={item.label}
										data-state={isActive ? 'hinted' : undefined}
										onClick={() => handleBorderColorChange(item.value)}
									>
										{item.value === null ? (
											<TldrawUiButtonIcon icon="color" />
										) : item.value === 'transparent' ? (
											<TldrawUiButtonIcon icon="minus" />
										) : (
											<div className="custom-dv__swatch" style={{ backgroundColor: item.value }} />
										)}
									</TldrawUiButton>
								)
							})}
						</div>
					</StylePanelSection>
					{/* [6] */}
					<StylePanelSection>
						<StylePanelSubheading>Font color</StylePanelSubheading>
						<div className="custom-dv__color-row">
							{FONT_COLORS.map((item) => {
								const isActive = currentFontColor === item.value
								return (
									<TldrawUiButton
										key={item.label}
										type="icon"
										title={item.label}
										data-state={isActive ? 'hinted' : undefined}
										onClick={() => handleFontColorChange(item.value)}
									>
										{item.value === null ? (
											<TldrawUiButtonIcon icon="color" />
										) : (
											<div className="custom-dv__swatch" style={{ backgroundColor: item.value }} />
										)}
									</TldrawUiButton>
								)
							})}
						</div>
					</StylePanelSection>
					{/* [7] */}
					<StylePanelSection>
						<div className="custom-dv__font-size-header">
							<StylePanelSubheading>Label font size</StylePanelSubheading>
							{currentFontSizeStep !== null && (
								<button className="custom-dv__reset" onClick={handleFontSizeReset}>
									Reset
								</button>
							)}
						</div>
						<TldrawUiSlider
							value={currentFontSizeStep}
							steps={FONT_SIZE_STEPS.length - 1}
							title="Label font size"
							label={
								currentFontSizeStep !== null
									? `${FONT_SIZE_STEPS[currentFontSizeStep]}px`
									: 'Default'
							}
							onValueChange={handleFontSizeChange}
						/>
					</StylePanelSection>
				</>
			)}
		</DefaultStylePanel>
	)
}

// [8]
export default function CustomDisplayValuesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={{
					StylePanel: CustomStylePanel,
				}}
			/>
		</div>
	)
}

/*
[1]
Predefined border color options. `null` means "use the default" (from the
shape's color prop). `transparent` means borderless.

[2]
A single set of configured shape utils reads `shape.meta` to apply per-shape
display value overrides. Shapes without any meta flags render normally.

[3]
Helper to update meta on all selected geo/note shapes.

[4]
The custom style panel extends DefaultStylePanel by rendering the default
controls first, then appending our border color and font size sections. The
extra controls only appear when geo or note shapes are selected.

[5]
Border color picker using tldraw's built-in button components. "Default" uses
the standard color icon, colored swatches use a simple div, and "No border"
uses the minus icon. The `data-state="hinted"` attribute highlights the active
selection using tldraw's built-in button styling.

[6]
Font color picker — same pattern as border color. Overrides `labelColor` in
display values, which controls the text color independently from the shape's
main color prop.

[7]
Font size slider with a Reset button. Uses StylePanelSubheading for consistent
label styling. The slider maps steps to predefined pixel sizes.

[8]
shapeUtils are defined once — all variation is driven by per-shape meta.
*/
