import { Box, StateNode, TLShape, VecModel } from 'tldraw'
import { addToContext } from './Context'

export class TargetTool extends StateNode {
	static override id = 'target'
	static override initial = 'idle'
	static override children() {
		return [TargetIdle, TargetPointing, TargetDragging]
	}

	override isLockable = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onInterrupt() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	private complete() {
		this.parent.transition('select', {})
	}
}

class TargetIdle extends StateNode {
	static override id = 'idle'

	override onPointerMove() {
		const { currentPagePoint } = this.editor.inputs
		const shape = this.editor.getShapeAtPoint(currentPagePoint)
		if (shape) {
			this.editor.setHintingShapes([shape])
		} else {
			this.editor.setHintingShapes([])
		}
	}

	override onPointerDown() {
		this.parent.transition('pointing', {})
	}
}

class TargetDragging extends StateNode {
	static override id = 'dragging'

	private initialPagePoint: VecModel | undefined = undefined
	private shapes: TLShape[] = []

	override onEnter(props: { initialPagePoint: VecModel }) {
		this.initialPagePoint = props.initialPagePoint
		this.updateBounds()
	}

	override onPointerMove() {
		this.updateBounds()
	}

	override onPointerUp() {
		this.editor.setHintingShapes([])
		this.editor.updateInstanceState({
			brush: { x: 0, y: 0, w: 0, h: 0 },
		})

		for (const shape of this.shapes) {
			addToContext({ type: 'shape', shape, id: shape.id })
		}
		this.editor.setCurrentTool('select')
	}

	updateBounds() {
		if (!this.initialPagePoint) return
		const currentPagePoint = this.editor.inputs.currentPagePoint
		const x = Math.min(this.initialPagePoint.x, currentPagePoint.x)
		const y = Math.min(this.initialPagePoint.y, currentPagePoint.y)
		const w = Math.abs(currentPagePoint.x - this.initialPagePoint.x)
		const h = Math.abs(currentPagePoint.y - this.initialPagePoint.y)

		this.editor.updateInstanceState({
			brush: { x, y, w, h },
		})

		const bounds = new Box(x, y, w, h)
		const shapesInBounds = this.editor.getCurrentPageShapesSorted().filter((shape) => {
			const shapeBounds = this.editor.getShapePageBounds(shape)
			return shapeBounds && bounds.contains(shapeBounds)
		})

		this.shapes = shapesInBounds
		this.editor.setHintingShapes(shapesInBounds)
	}
}

class TargetPointing extends StateNode {
	static override id = 'pointing'

	private shape: TLShape | undefined = undefined
	private initialScreenPoint: VecModel | undefined = undefined
	private initialPagePoint: VecModel | undefined = undefined

	override onEnter() {
		const shape = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint)
		this.initialScreenPoint = this.editor.inputs.currentScreenPoint.clone()
		this.initialPagePoint = this.editor.inputs.currentPagePoint.clone()
		this.shape = shape
	}

	override onPointerMove() {
		if (!this.initialScreenPoint) return
		const distance = this.editor.inputs.currentScreenPoint.dist(this.initialScreenPoint)
		if (distance > 10) {
			this.parent.transition('dragging', { initialPagePoint: this.initialPagePoint })
		}
	}

	override onPointerUp() {
		this.editor.setHintingShapes([])
		if (this.shape) {
			addToContext({ type: 'shape', shape: this.shape, id: this.shape.id })
		}
		this.editor.setCurrentTool('select')
	}
}
