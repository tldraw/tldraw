import {
	Geometry2d,
	StateNode,
	TLEventHandlers,
	TLFrameShape,
	TLGroupShape,
	TLScribble,
	TLShape,
	TLShapeId,
	intersectLineSegmentPolyline,
	pointInPolygon,
} from '@tldraw/editor'
import { ScribbleManager } from '../../../shapes/shared/ScribbleManager'

export class ScribbleBrushing extends StateNode {
	static override id = 'scribble_brushing'

	hits = new Set<TLShapeId>()

	size = 0

	scribble = {} as ScribbleManager

	initialSelectedIds = new Set<TLShapeId>()
	newlySelectedIds = new Set<TLShapeId>()

	override onEnter = () => {
		this.initialSelectedIds = new Set<TLShapeId>(
			this.editor.inputs.shiftKey ? this.editor.selectedIds : []
		)
		this.newlySelectedIds = new Set<TLShapeId>()
		this.size = 0
		this.hits.clear()

		this.startScribble()

		this.updateBrushSelection()
		requestAnimationFrame(() => {
			this.editor.updateInstanceState({ brush: null })
		})
	}

	override onExit = () => {
		this.editor.erasingIds = []
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
		if (!this.editor.inputs.altKey) {
			this.parent.transition('brushing', {})
		} else {
			this.updateBrushSelection()
		}
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.editor.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'selection-stroke',
			opacity: 0.32,
			size: 12,
		})

		this.editor.on('tick', this.scribble.tick)
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.scribble.addPoint(x, y)
	}

	private onScribbleUpdate = (scribble: TLScribble) => {
		this.editor.updateInstanceState({ scribble })
	}

	private onScribbleComplete = () => {
		this.editor.off('tick', this.scribble.tick)
		this.editor.updateInstanceState({ scribble: null })
	}

	private updateBrushSelection() {
		const {
			zoomLevel,
			shapesArray,
			inputs: { originPagePoint, previousPagePoint, currentPagePoint },
		} = this.editor

		this.pushPointToScribble()

		const shapes = shapesArray
		let shape: TLShape, geometry: Geometry2d

		for (let i = 0, n = shapes.length; i < n; i++) {
			shape = shapes[i]
			geometry = this.editor.getGeometry(shape)

			if (
				this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				this.newlySelectedIds.has(shape.id) ||
				(this.editor.isShapeOfType<TLFrameShape>(shape, 'frame') &&
					geometry.hitTestPoint(
						this.editor.getPointInShapeSpace(shape, originPagePoint),
						zoomLevel
					)) ||
				this.editor.isShapeOrAncestorLocked(shape)
			) {
				continue
			}

			if (
				geometry.hitTestLineSegment(
					this.editor.getPointInShapeSpace(shape, previousPagePoint),
					this.editor.getPointInShapeSpace(shape, currentPagePoint),
					zoomLevel
				)
			) {
				const outermostShape = this.editor.getOutermostSelectableShape(shape)

				const pageMask = this.editor.getPageMask(outermostShape.id)

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

		this.editor.setSelectedIds(
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
		this.editor.setSelectedIds([...this.initialSelectedIds], true)
		this.parent.transition('idle', {})
	}
}
