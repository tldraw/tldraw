import {
	Box,
	BoxLike,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	SharedStyleMap,
	TLEventInfo,
	TLShapeId,
	ToolUtil,
	getOwnProperty,
} from 'tldraw'
import { HintedShapeIndicator } from './components/HintedShapeIndicators'
import { SelectionBrush } from './components/SelectionBrush'
import { ShapeIndicators } from './components/ShapeIndicators'

type SimpleSelectContext =
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

const simpleSelectStyles = new SharedStyleMap()
simpleSelectStyles.applyValue(DefaultColorStyle, DefaultColorStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultFillStyle, DefaultFillStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultDashStyle, DefaultDashStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultSizeStyle, DefaultSizeStyle.defaultValue)

export class SimpleSelectToolUtil extends ToolUtil<SimpleSelectContext> {
	id = '@simple/select' as const

	getDefaultContext(): SimpleSelectContext {
		return {
			name: 'idle',
		}
	}

	getDefaultConfig() {
		return {}
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

	override overlay() {
		const context = this.getContext()

		return (
			<>
				<ShapeIndicators />
				<HintedShapeIndicator />
				{context.name === 'brushing' && <SelectionBrush brush={context.brush} />}
			</>
		)
	}

	// This object is used for events, it's kept in memory and updated as the user interacts with the tool
	private memo = {
		initialSelectedIds: [] as TLShapeId[],
	}

	override onEvent(event: TLEventInfo) {
		const { editor, memo } = this
		const context = this.getContext()

		switch (context.name) {
			case 'idle': {
				if (event.name === 'pointer_down') {
					this.setContext({
						name: 'pointing',
					})
				}
				break
			}
			case 'pointing': {
				if (editor.inputs.isDragging) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					const box = Box.FromPoints([originPagePoint, currentPagePoint])
					this.setContext({
						name: 'brushing',
						brush: box.toJson(),
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
						name: 'idle',
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
						name: 'brushing',
						brush: box.toJson(),
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
