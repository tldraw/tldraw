import {
	StateNode,
	TLEventHandlers,
	TLShapeId,
	TLTextBinding,
	TLTextShape,
	Vec,
	createShapeId,
} from '@tldraw/editor'
import { updateHoveredShapeId } from '../../../tools/selection-logic/updateHoveredShapeId'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredShapeId(this.editor)
			}
		}
		this.makeOrUpdateLabelPreview()
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const labelPreviewShape = this.labelPreviewShapeId
			? (this.editor.getShape(this.labelPreviewShapeId) as TLTextShape)
			: null
		if (labelPreviewShape) {
			// commit the preview shape
			const binding = this.editor.getBindingsFromShape(
				labelPreviewShape.id,
				'text'
			)[0] as TLTextBinding
			this.editor.updateShape<TLTextShape>({
				...labelPreviewShape,
				opacity: 1,
				props: {
					text: '',
					textAlign:
						binding.props.x.type === 'center'
							? 'middle'
							: binding.props.x.edge === 'left'
								? 'start'
								: 'end',
				},
				meta: {
					preview: false,
				},
			})
			this.editor.setEditingShape(labelPreviewShape.id)
			this.editor.setHintingShapes([])
			this.labelPreviewShapeId = null
			return
		}
		this.labelPreviewShapeId = null
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (info.key === 'Enter') {
			if (this.editor.getInstanceState().isReadonly) return null
			const onlySelectedShape = this.editor.getOnlySelectedShape()
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingShape(onlySelectedShape.id)
				this.editor.root.getCurrent()?.transition('editing_shape', {
					...info,
					target: 'shape',
					shape: onlySelectedShape,
				})
			}
		}
	}

	labelPreviewShapeId = null as TLShapeId | null

	private makeOrUpdateLabelPreview() {
		const boundShape = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
			filter: (shape) => shape.type === 'geo',
			hitInside: true,
			hitFrameInside: false,
		})
		if (!boundShape) {
			this.editor.setHintingShapes([])
			if (this.labelPreviewShapeId) {
				this.editor.deleteShape(this.labelPreviewShapeId)
				this.labelPreviewShapeId = null
			}
			return
		}
		this.editor.setHintingShapes([boundShape.id])

		const labelPreviewShape = this.labelPreviewShapeId
			? this.editor.getShape(this.labelPreviewShapeId)
			: null

		if (labelPreviewShape) {
			// update the label preview to have it's center at the currentPagePoint
			const newCenterInShapeSpace = this.editor.getPointInShapeSpace(
				labelPreviewShape,
				this.editor.inputs.currentPagePoint
			)
			const currentCenterInShapeSpace =
				this.editor.getShapeGeometry(labelPreviewShape).bounds.center
			const centerDelta = newCenterInShapeSpace.sub(currentCenterInShapeSpace)
			const deltaInParentSpace = Vec.Rot(centerDelta, -labelPreviewShape.rotation)
			this.editor.updateShape({
				...labelPreviewShape,
				x: labelPreviewShape.x + deltaInParentSpace.x,
				y: labelPreviewShape.y + deltaInParentSpace.y,
			})
		} else {
			// create the text shape and binding
			this.labelPreviewShapeId = createShapeId()
			this.editor.createShape<TLTextShape>({
				id: this.labelPreviewShapeId,
				type: 'text',
				opacity: 0.4,
				props: {
					text: 'Text',
				},
				meta: {
					preview: true,
				},
			})
			this.editor.createBinding({
				type: 'text',
				fromId: this.labelPreviewShapeId,
				toId: boundShape.id,
			})
			// now position it
			this.makeOrUpdateLabelPreview()
		}
	}

	override onCancel = () => {
		this.editor.setHintingShapes([])
		this.editor.setCurrentTool('select')
	}
}
