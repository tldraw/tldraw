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
	TLToolState,
	ToolUtil,
	dedupe,
	useEditor,
	useEditorComponents,
	useValue,
} from 'tldraw'

interface SimpleSelectContext extends TLToolState {
	readonly type: '@simple/select'
	ids: TLShapeId[]
	brush: BoxLike | null
	state: 'idle' | 'pointing' | 'dragging'
}

const simpleSelectStyles = new SharedStyleMap()
simpleSelectStyles.applyValue(DefaultColorStyle, DefaultColorStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultFillStyle, DefaultFillStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultDashStyle, DefaultDashStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultSizeStyle, DefaultSizeStyle.defaultValue)

export class SimpleSelectToolUtil extends ToolUtil<SimpleSelectContext> {
	static override type = '@simple/select' as const

	getDefaultContext(): SimpleSelectContext {
		return {
			type: '@simple/select',
			ids: [],
			brush: null,
			state: 'idle',
		}
	}

	underlay() {
		return null
	}

	overlay() {
		const { brush } = this.getContext()

		return (
			<>
				<ShapeIndicators />
				<HintedShapeIndicator />
				<SelectionBrush brush={brush} />
			</>
		)
	}

	getStyles() {
		return simpleSelectStyles
	}

	// This object is used for events, it's kept in memory and updated as the user interacts with the tool
	private memo = {
		initialSelectedIds: [] as TLShapeId[],
	}

	onEvent(event: TLEventInfo) {
		const { editor, memo } = this
		const context = this.getContext()

		switch (context.state) {
			case 'idle': {
				if (event.name === 'pointer_down') {
					this.setContext({
						state: 'pointing',
					})
				}
				break
			}
			case 'pointing': {
				if (editor.inputs.isDragging) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					const box = Box.FromPoints([originPagePoint, currentPagePoint])
					this.setContext({ state: 'dragging', brush: box.toJson() })

					// Stash the selected ids so we can restore them later
					memo.initialSelectedIds = editor.getSelectedShapeIds()
				}
				break
			}
			case 'dragging': {
				if (editor.inputs.isDragging) {
					if (
						event.name === 'pointer_move' ||
						// for modifiers
						event.name === 'key_down' ||
						event.name === 'key_up'
					) {
						const { originPagePoint, currentPagePoint } = editor.inputs
						const box = Box.FromPoints([originPagePoint, currentPagePoint])

						// update the box in the context
						this.setContext({ brush: box.toJson() })

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
				} else {
					this.setContext({ state: 'idle', brush: null })
				}
				break
			}
		}
	}
}

/*
Times when states talk to each-other
- reading / writing to selection
- reading / writing to styles
- switching to other tools

Which pieces of state are "universal" vs which are "tool-specific"?
For example, the selection brush is only relevant to the select tool but the selected shape ids are relevant to all tools.
Therefore the selection brush should be stored in the select tool's context but the selected shape ids should be stored in the editor's context.

The erasing / cropping / hinted shapes are probably relevant only to their tools, and should be extracted from the default canvas into their tool's overlay / underlay.

Snapping seems to be a universal UI (because it's used while shapes are being resized, for example) but that happens while shape tools are being used to create a shape. In that case the select tool is technically active, however.
*/

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

// function SelectedShapeIds({ shapeIds }: { shapeIds: TLShapeId[] }) {
// 	if (shapeIds.length === 0) return null

// 	const { ShapeIndicator } = useEditorComponents()
// 	if (!ShapeIndicator) return null

// 	return (
// 		<>
// 			{renderingShapes.map(({ id }) => (
// 				<ShapeIndicator key={id + '_indicator'} shapeId={id} hidden={!idsToDisplay.has(id)} />
// 			))}
// 		</>
// 	)

// 	return null
// }

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
			if (
				editor.isInAny(
					'select.idle',
					'select.brushing',
					'select.scribble_brushing',
					'select.editing_shape',
					'select.pointing_shape',
					'select.pointing_selection',
					'select.pointing_handle'
				) &&
				!editor.getInstanceState().isChangingStyle
			) {
				const selected = editor.getSelectedShapeIds()
				for (const id of selected) {
					next.add(id)
				}
				if (editor.isInAny('select.idle', 'select.editing_shape')) {
					const instanceState = editor.getInstanceState()
					if (instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
						const hovered = editor.getHoveredShapeId()
						if (hovered) next.add(hovered)
					}
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
