import { useRef } from 'react'
import {
	Box,
	BoxLike,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	SVGContainer,
	SharedStyleMap,
	TLEventInfo,
	TLShapeId,
	ToolUtil,
	dedupe,
	getOwnProperty,
	useEditor,
	useEditorComponents,
	useValue,
} from 'tldraw'

type SimpleSelectContext = {
	state:
		| {
				name: 'idle'
		  }
		| {
				name: 'pointing'
		  }
		| {
				name: 'brushing'
				brush: BoxLike | null
		  }
}

const simpleSelectStyles = new SharedStyleMap()
simpleSelectStyles.applyValue(DefaultColorStyle, DefaultColorStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultFillStyle, DefaultFillStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultDashStyle, DefaultDashStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultSizeStyle, DefaultSizeStyle.defaultValue)

export class SimpleSelectToolUtil extends ToolUtil<SimpleSelectContext> {
	id = '@simple/select' as const

	getDefaultContext(): SimpleSelectContext {
		return {
			state: { name: 'idle' },
		}
	}

	getDefaultConfig() {
		return {}
	}

	override overlay() {
		const { state } = this.getContext()

		return (
			<>
				<ShapeIndicators />
				<HintedShapeIndicator />
				{state.name === 'brushing' && <SelectionBrush brush={state.brush} />}
			</>
		)
	}

	override getStyles() {
		const { editor } = this
		const selectedShapeIds = editor.getSelectedShapeIds()
		if (selectedShapeIds.length === 0) {
			return simpleSelectStyles
		}

		const sharedStyleMap = new SharedStyleMap()

		for (const id of selectedShapeIds) {
			const shape = editor.getShape(id)
			if (!shape) continue
			for (const [style, propKey] of editor.styleProps[shape.type]) {
				sharedStyleMap.applyValue(style, getOwnProperty(shape.props, propKey))
			}
		}

		return sharedStyleMap
	}

	// This object is used for events, it's kept in memory and updated as the user interacts with the tool
	private memo = {
		initialSelectedIds: [] as TLShapeId[],
	}

	override onEvent(event: TLEventInfo) {
		const { editor, memo } = this
		const context = this.getContext()

		switch (context.state.name) {
			case 'idle': {
				if (event.name === 'pointer_down') {
					this.setContext({
						state: {
							name: 'pointing',
						},
					})
				}
				break
			}
			case 'pointing': {
				if (editor.inputs.isDragging) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					const box = Box.FromPoints([originPagePoint, currentPagePoint])
					this.setContext({
						state: {
							name: 'brushing',
							brush: box.toJson(),
						},
					})

					// Stash the selected ids so we can restore them later
					memo.initialSelectedIds = editor.getSelectedShapeIds()
				}
				break
			}
			case 'brushing': {
				if (!editor.inputs.isPointing) {
					// Stopped pointing
					this.setContext({
						state: {
							name: 'idle',
						},
					})
					return
				}

				if (
					event.name === 'pointer_move' ||
					// for modifiers
					event.name === 'key_down' ||
					event.name === 'key_up'
				) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					const box = Box.FromPoints([originPagePoint, currentPagePoint])

					// update the box in the context
					this.setContext({
						state: {
							name: 'brushing',
							brush: box.toJson(),
						},
					})

					const hitIds = new Set<TLShapeId>()

					// If we're holding shift, add the initial selected ids to the hitIds set
					if (editor.inputs.shiftKey) {
						for (const id of memo.initialSelectedIds) {
							hitIds.add(id)
						}
					}

					// Test the rest of the shapes on the page (broad phase only for simplifity)
					for (const shape of editor.getCurrentPageShapes()) {
						if (hitIds.has(shape.id)) continue
						const pageBounds = editor.getShapePageBounds(shape.id)
						if (!pageBounds) continue
						if (box.collides(pageBounds)) {
							hitIds.add(shape.id)
						}
					}

					// If the selected ids have changed, update the selection
					const currentSelectedIds = editor.getSelectedShapeIds()
					if (
						currentSelectedIds.length !== hitIds.size ||
						currentSelectedIds.some((id) => !hitIds.has(id))
					) {
						editor.setSelectedShapes(Array.from(hitIds))
					}
				}

				break
			}
		}
	}
}

function SelectionBrush({ brush }: { brush: BoxLike | null }) {
	if (!brush) return null
	return (
		<SVGContainer>
			<rect
				className="tl-brush tl-brush__default"
				x={brush.x}
				y={brush.y}
				width={brush.w}
				height={brush.h}
			/>
		</SVGContainer>
	)
}

function ShapeIndicators() {
	const editor = useEditor()
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])
	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())
	const idsToDisplay = useValue(
		'should display selected ids',
		() => {
			// todo: move to tldraw selected ids wrappe
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()
			const instanceState = editor.getInstanceState()
			if (!instanceState.isChangingStyle) {
				const selected = editor.getSelectedShapeIds()
				for (const id of selected) {
					next.add(id)
				}

				if (instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
					const hovered = editor.getHoveredShapeId()
					if (hovered) next.add(hovered)
				}
			}

			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of next) {
				if (!prev.has(id)) {
					rPreviousSelectedShapeIds.current = next
					return next
				}
			}

			return prev
		},
		[editor]
	)

	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null

	return (
		<>
			{renderingShapes.map(({ id }) => (
				<ShapeIndicator key={id + '_indicator'} shapeId={id} hidden={!idsToDisplay.has(id)} />
			))}
		</>
	)
}

function HintedShapeIndicator() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const ids = useValue('hinting shape ids', () => dedupe(editor.getHintingShapeIds()), [editor])

	if (!ids.length) return null
	if (!ShapeIndicator) return null

	return (
		<>
			{ids.map((id) => (
				<ShapeIndicator className="tl-user-indicator__hint" shapeId={id} key={id + '_hinting'} />
			))}
		</>
	)
}
