import { Matrix2d, Vec2d } from '@tldraw/primitives'
import { TLArrowShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { ArrowShapeUtil } from '../../../shapes/arrow/ArrowShapeUtil'
import {
	TLCancelEvent,
	TLEnterEventHandler,
	TLEventHandlers,
	TLKeyboardEvent,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class DraggingArrowLabel extends StateNode {
	static id = 'dragging_arrow_label'

	shapeId = '' as TLShapeId
	initialLabelPosition = 0.5
	initialLabelPagePosition = {} as Vec2d

	markId = 'dragging_label'
	initialPageTransform: any
	initialPageRotation: any

	info = {} as TLPointerEventInfo & {
		shape: TLArrowShape
		target: 'label'
		onInteractionEnd?: string
		isCreating: boolean
	}

	isPrecise = false
	isPreciseId = null as TLShapeId | null
	pointingId = null as TLShapeId | null

	onEnter: TLEnterEventHandler = (info: typeof this.info) => {
		const { shape, isCreating } = info
		this.info = info
		this.shapeId = shape.id
		this.markId = isCreating ? 'creating' : this.editor.mark(this.markId)

		this.initialLabelPosition = shape.props.labelPosition
		this.initialPageTransform = this.editor.getPageTransform(shape)!
		this.initialPageRotation = this.editor.getPageRotation(shape)!

		const util = this.editor.getShapeUtil(shape)
		if (!util.getLabelPosition) {
			throw Error(`Can't point a label of a shape without a 'getLabelPosition' method`)
		}

		const pageTransform = this.editor.getPageTransform(shape)
		if (!pageTransform) throw Error('No page transform')
		this.initialLabelPagePosition = Matrix2d.applyToPoint(
			pageTransform,
			util.getLabelPosition(shape)
		)

		this.update()
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.update()
	}

	onKeyDown: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	onKeyUp: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLCancelEvent = () => {
		this.cancel()
	}

	onExit = () => {
		this.editor.setCursor({ type: 'default' })
	}

	private complete() {
		const { onInteractionEnd } = this.info
		if (this.editor.instanceState.isToolLocked && onInteractionEnd) {
			this.editor.setSelectedTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle', {})
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.complete()
	}

	private update() {
		const { editor, shapeId } = this
		const { initialLabelPagePosition, initialPageRotation } = this
		const {
			inputs: { currentPagePoint, originPagePoint },
		} = editor

		const shape = editor.getShapeById<TLArrowShape>(shapeId)
		if (!shape) return

		const point = currentPagePoint
			.clone()
			.sub(originPagePoint)
			.rot(-initialPageRotation)
			.add(initialLabelPagePosition)

		const util = editor.getShapeUtil(ArrowShapeUtil)
		const outline = util.getOutlineWithoutLabel(shape)
		let nearestPoint = outline[0].clone()
		let nearestDistance = point.dist(nearestPoint)
		let t = 0

		const pointInShapeSpace = this.editor.getPointInShapeSpace(shape, point)

		for (let i = 0; i < outline.length - 1; i++) {
			const start = outline[i]
			const end = outline[i + 1]

			const nearest = Vec2d.NearestPointOnLineSegment(start, end, pointInShapeSpace)
			const distance = Vec2d.Dist(nearest, pointInShapeSpace)

			if (distance < nearestDistance) {
				nearestPoint = nearest
				nearestDistance = distance
				t = (i + Vec2d.Dist(start, nearest) / Vec2d.Dist(start, end)) / (outline.length - 1)
			}
		}

		const next: TLShapePartial<any> = {
			...shape,
			props: {
				labelPosition: t,
			},
		}

		editor.updateShapes([next], true)
	}
}
