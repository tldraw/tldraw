import { pointInPolygon } from '@tldraw/primitives'
import { TLScribble, TLShapeId } from '@tldraw/tlschema'
import { ScribbleManager } from '../../../managers/ScribbleManager'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Erasing extends StateNode {
	static override id = 'erasing'

	private info = {} as TLPointerEventInfo
	private scribble = {} as ScribbleManager
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()

	override onEnter = (info: TLPointerEventInfo) => {
		this.markId = this.app.mark('erase scribble begin')
		this.info = info

		const { originPagePoint } = this.app.inputs
		this.excludedShapeIds = new Set(
			this.app.shapesArray
				.filter(
					(shape) =>
						(shape.type === 'frame' || shape.type === 'group') &&
						this.app.isPointInShape(originPagePoint, shape)
				)
				.map((shape) => shape.id)
		)

		this.startScribble()
		this.update()
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.app.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'muted-1',
			size: 12,
		})

		this.app.on('tick', this.scribble.tick)
	}

	private pushPointToScribble = () => {
		const { x, y } = this.app.inputs.currentPagePoint
		this.scribble.addPoint(x, y)
	}

	private onScribbleUpdate = (scribble: TLScribble) => {
		this.app.setScribble(scribble)
	}

	private onScribbleComplete = () => {
		this.app.off('tick', this.scribble.tick)
		this.app.setScribble(null)
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
		} = this.app

		const { excludedShapeIds } = this

		this.pushPointToScribble()

		const erasing = new Set<TLShapeId>(erasingIdsSet)

		for (const shape of shapesArray) {
			// Skip groups
			if (shape.type === 'group') continue
			// Skip locked shapes
			if (this.app.isShapeOrParentLocked(shape)) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = this.app.getPageMaskById(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const util = this.app.getShapeUtil(shape)
			const A = this.app.getPointInShapeSpace(shape, previousPagePoint)
			const B = this.app.getPointInShapeSpace(shape, currentPagePoint)

			// If it's a hit, erase the outermost selectable shape
			if (util.hitTestLineSegment(shape, A, B)) {
				erasing.add(this.app.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.app.setErasingIds([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}

	complete() {
		this.app.deleteShapes(this.app.pageState.erasingIds)
		this.app.setErasingIds([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.app.setErasingIds([])
		this.app.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
