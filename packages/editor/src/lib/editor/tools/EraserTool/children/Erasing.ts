import { pointInPolygon } from '@tldraw/primitives'
import { TLScribble, TLShapeId } from '@tldraw/tlschema'
import { ScribbleManager } from '../../../managers/ScribbleManager'
import { FrameShapeUtil } from '../../../shapes/frame/FrameShapeUtil'
import { GroupShapeUtil } from '../../../shapes/group/GroupShapeUtil'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Erasing extends StateNode {
	static override id = 'erasing'

	private info = {} as TLPointerEventInfo
	private scribble = {} as ScribbleManager
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()

	override onEnter = (info: TLPointerEventInfo) => {
		this.markId = this.editor.mark('erase scribble begin')
		this.info = info

		const { originPagePoint } = this.editor.inputs
		this.excludedShapeIds = new Set(
			this.editor.shapesArray
				.filter(
					(shape) =>
						this.editor.isShapeOrAncestorLocked(shape) ||
						((this.editor.isShapeOfType(shape, GroupShapeUtil) ||
							this.editor.isShapeOfType(shape, FrameShapeUtil)) &&
							this.editor.isPointInShape(originPagePoint, shape))
				)
				.map((shape) => shape.id)
		)

		this.startScribble()
		this.update()
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.editor.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'muted-1',
			size: 12,
		})

		this.editor.on('tick', this.scribble.tick)
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.scribble.addPoint(x, y)
	}

	private onScribbleUpdate = (scribble: TLScribble) => {
		this.editor.setScribble(scribble)
	}

	private onScribbleComplete = () => {
		this.editor.off('tick', this.scribble.tick)
		this.editor.setScribble(null)
	}

	override onExit = () => {
		this.scribble.stop()
	}

	override onPointerMove = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	update() {
		const {
			shapesArray,
			erasingIdsSet,
			inputs: { currentPagePoint, previousPagePoint },
		} = this.editor

		const { excludedShapeIds } = this

		this.pushPointToScribble()

		const erasing = new Set<TLShapeId>(erasingIdsSet)

		for (const shape of shapesArray) {
			if (this.editor.isShapeOfType(shape, GroupShapeUtil)) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = this.editor.getPageMaskById(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const util = this.editor.getShapeUtil(shape)
			const A = this.editor.getPointInShapeSpace(shape, previousPagePoint)
			const B = this.editor.getPointInShapeSpace(shape, currentPagePoint)

			// If it's a hit, erase the outermost selectable shape
			if (util.hitTestLineSegment(shape, A, B)) {
				erasing.add(this.editor.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.editor.setErasingIds([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}

	complete() {
		this.editor.deleteShapes(this.editor.pageState.erasingIds)
		this.editor.setErasingIds([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.editor.setErasingIds([])
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
