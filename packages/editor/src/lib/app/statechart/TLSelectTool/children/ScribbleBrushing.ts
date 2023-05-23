import { intersectLineSegmentPolyline, pointInPolygon } from '@tldraw/primitives'
import { TLScribble, TLShape, TLShapeId } from '@tldraw/tlschema'
import { ScribbleManager } from '../../../managers/ScribbleManager'
import { TLShapeUtil } from '../../../shapeutils/TLShapeUtil'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class ScribbleBrushing extends StateNode {
	static override id = 'scribble_brushing'

	hits = new Set<TLShapeId>()

	size = 0

	scribble = {} as ScribbleManager

	initialSelectedIds = new Set<TLShapeId>()
	newlySelectedIds = new Set<TLShapeId>()

	override onEnter = () => {
		this.initialSelectedIds = new Set<TLShapeId>(
			this.app.inputs.shiftKey ? this.app.selectedIds : []
		)
		this.newlySelectedIds = new Set<TLShapeId>()
		this.size = 0
		this.hits.clear()

		this.startScribble()

		this.updateBrushSelection()
		requestAnimationFrame(() => {
			this.app.setBrush(null)
		})
	}

	override onExit = () => {
		this.app.setErasingIds([])
		this.scribble.stop()
	}

	override onPointerMove = () => {
		this.updateBrushSelection()
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onKeyDown = () => {
		this.updateBrushSelection()
	}

	override onKeyUp = () => {
		if (!this.app.inputs.altKey) {
			this.parent.transition('brushing', {})
		} else {
			this.updateBrushSelection()
		}
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.app.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'selection-stroke',
			opacity: 0.32,
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

	private updateBrushSelection() {
		const {
			shapesArray,
			inputs: { originPagePoint, previousPagePoint, currentPagePoint },
		} = this.app

		this.pushPointToScribble()

		const shapes = shapesArray
		let shape: TLShape, util: TLShapeUtil<TLShape>

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]
			util = this.app.getShapeUtil(shape.type)

			if (
				shape.type === 'group' ||
				this.newlySelectedIds.has(shape.id) ||
				(shape.type === 'frame' &&
					util.hitTestPoint(shape, this.app.getPointInShapeSpace(shape, originPagePoint)))
			) {
				continue
			}

			if (
				util.hitTestLineSegment(
					shape,
					this.app.getPointInShapeSpace(shape, previousPagePoint),
					this.app.getPointInShapeSpace(shape, currentPagePoint)
				)
			) {
				const outermostShape = this.app.getOutermostSelectableShape(shape)

				const pageMask = this.app.getPageMaskById(outermostShape.id)

				if (pageMask) {
					const intersection = intersectLineSegmentPolyline(
						previousPagePoint,
						currentPagePoint,
						pageMask
					)

					if (intersection !== null) {
						const isInMask = pointInPolygon(currentPagePoint, pageMask)
						if (!isInMask) continue
					}
				}

				this.newlySelectedIds.add(outermostShape.id)
			}
		}

		this.app.setSelectedIds(
			[...new Set<TLShapeId>([...this.newlySelectedIds, ...this.initialSelectedIds])],
			true
		)
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle', {})
	}

	private cancel() {
		this.app.setSelectedIds([...this.initialSelectedIds], true)
		this.parent.transition('idle', {})
	}
}
