import {
	Arc2d,
	Group2d,
	StateNode,
	TLArrowShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	exhaustiveSwitchError,
	getPointInArcT,
} from '@tldraw/editor'
import { uninterpolateAlongElbowArrowRoute } from '../../../shapes/arrow/elbow/interpolateAlongElbowArrowRoute'
import { getArrowInfo } from '../../../shapes/arrow/shared'

export class PointingArrowLabel extends StateNode {
	static override id = 'pointing_arrow_label'

	shapeId = '' as TLShapeId
	markId = ''
	wasAlreadySelected = false
	didDrag = false
	didCtrlOnEnter = false

	private info = {} as TLPointerEventInfo & {
		shape: TLArrowShape
		onInteractionEnd?: string
		isCreating: boolean
	}

	private updateCursor() {
		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onEnter(
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			onInteractionEnd?: string
			isCreating: boolean
		}
	) {
		const { shape } = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.info = info
		this.shapeId = shape.id
		this.didDrag = false
		this.didCtrlOnEnter = info.accelKey
		this.wasAlreadySelected = this.editor.getOnlySelectedShapeId() === shape.id
		this.updateCursor()

		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const labelGeometry = geometry.children[1]
		if (!labelGeometry) {
			throw Error(`Expected to find an arrow label geometry for shape: ${shape.id}`)
		}
		const { currentPagePoint } = this.editor.inputs
		const pointInShapeSpace = this.editor.getPointInShapeSpace(shape, currentPagePoint)

		this._labelDragOffset = Vec.Sub(labelGeometry.center, pointInShapeSpace)

		this.markId = this.editor.markHistoryStoppingPoint('label-drag start')

		const additiveSelectionKey = info.shiftKey || info.accelKey
		if (additiveSelectionKey) {
			const selectedShapeIds = this.editor.getSelectedShapeIds()
			this.editor.setSelectedShapes([...selectedShapeIds, this.shapeId])

			return
		}

		this.editor.setSelectedShapes([this.shapeId])
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)

		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private _labelDragOffset = new Vec(0, 0)

	override onPointerMove() {
		const { isDragging } = this.editor.inputs
		if (!isDragging) return

		if (this.didCtrlOnEnter) {
			this.parent.transition('brushing', this.info)
			return
		}

		const shape = this.editor.getShape<TLArrowShape>(this.shapeId)
		if (!shape) return

		const info = getArrowInfo(this.editor, shape)!

		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const pointInShapeSpace = this.editor
			.getPointInShapeSpace(shape, this.editor.inputs.currentPagePoint)
			.add(this._labelDragOffset)

		let nextLabelPosition
		switch (info.type) {
			case 'straight': {
				const nearestPoint = geometry.nearestPoint(pointInShapeSpace, {
					includeInternal: false,
					includeLabels: false,
				})
				const lineLength = Vec.Dist(info.start.point, info.end.point)
				const segmentLength = Vec.Dist(info.end.point, nearestPoint)
				nextLabelPosition = 1 - segmentLength / lineLength
				break
			}
			case 'arc': {
				const nearestPoint = geometry.nearestPoint(pointInShapeSpace, {
					includeInternal: false,
					includeLabels: false,
				})
				const { _center, measure, angleEnd, angleStart } = geometry.children[0] as Arc2d
				nextLabelPosition = getPointInArcT(
					measure,
					angleStart,
					angleEnd,
					_center.angle(nearestPoint)
				)
				break
			}
			case 'elbow': {
				nextLabelPosition = uninterpolateAlongElbowArrowRoute(info.route, pointInShapeSpace)
				break
			}
			default:
				exhaustiveSwitchError(info, 'type')
		}

		if (isNaN(nextLabelPosition)) {
			nextLabelPosition = 0.5
		}

		this.didDrag = true
		this.editor.updateShape<TLArrowShape>({
			id: shape.id,
			type: shape.type,
			props: { labelPosition: nextLabelPosition },
		})
	}

	override onPointerUp() {
		const shape = this.editor.getShape<TLArrowShape>(this.shapeId)
		if (!shape) return

		if (this.didDrag || !this.wasAlreadySelected) {
			this.complete()
		} else if (!this.editor.getIsReadonly()) {
			// Go into edit mode.
			this.editor.setEditingShape(shape.id)
			this.editor.setCurrentTool('select.editing_shape')
		}
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)

		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}
}
