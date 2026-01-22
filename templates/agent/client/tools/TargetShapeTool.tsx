import { Box, BoxModel, StateNode, TLShape, VecModel } from 'tldraw'
import { convertTldrawShapeToFocusedShape } from '../../shared/format/convertTldrawShapeToFocusedShape'
import { AgentAppAgentsManager } from '../agent/managers/AgentAppAgentsManager'

export class TargetShapeTool extends StateNode {
	static override id = 'target-shape'
	static override initial = 'idle'
	static override children() {
		return [TargetShapeIdle, TargetShapePointing, TargetShapeDragging]
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

class TargetShapeIdle extends StateNode {
	static override id = 'idle'

	override onPointerMove() {
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const shape = this.editor.getShapeAtPoint(currentPagePoint, { hitInside: true })
		if (shape) {
			this.editor.setHintingShapes([shape])
		} else {
			this.editor.setHintingShapes([])
		}
	}

	override onPointerDown() {
		const shape = this.editor.getShapeAtPoint(this.editor.inputs.getCurrentPagePoint(), {
			hitInside: true,
		})
		this.parent.transition('pointing', { shape })
	}
}

class TargetShapePointing extends StateNode {
	static override id = 'pointing'

	private shape: TLShape | undefined = undefined
	private initialScreenPoint: VecModel | undefined = undefined
	private initialPagePoint: VecModel | undefined = undefined

	override onEnter({ shape }: { shape: TLShape }) {
		this.initialScreenPoint = this.editor.inputs.getCurrentScreenPoint().clone()
		this.initialPagePoint = this.editor.inputs.getCurrentPagePoint().clone()
		this.shape = shape
	}

	override onPointerMove() {
		if (!this.initialScreenPoint) return
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging', { initialPagePoint: this.initialPagePoint })
		}
	}

	override onPointerUp() {
		this.editor.setHintingShapes([])
		if (this.shape) {
			const agents = AgentAppAgentsManager.getAgents(this.editor)
			for (const agent of agents) {
				agent.context.add({
					type: 'shape',
					shape: convertTldrawShapeToFocusedShape(this.editor, this.shape),
					source: 'user',
				})
			}
		}
		this.editor.setCurrentTool('select')
	}
}

class TargetShapeDragging extends StateNode {
	static override id = 'dragging'

	private shapes: TLShape[] = []
	private initialPagePoint: VecModel | undefined = undefined
	private bounds: BoxModel | undefined = undefined

	override onEnter(props: { initialPagePoint: VecModel }) {
		this.initialPagePoint = props.initialPagePoint
		this.editor.setHintingShapes([])
		this.updateBounds()
	}

	override onPointerMove() {
		this.updateBounds()
	}

	override onPointerUp() {
		this.editor.setHintingShapes([])
		this.editor.updateInstanceState({
			brush: null,
		})

		if (!this.bounds) throw new Error('Bounds not set')
		const agents = AgentAppAgentsManager.getAgents(this.editor)
		if (this.shapes.length <= 3) {
			for (const shape of this.shapes) {
				for (const agent of agents) {
					agent.context.add({
						type: 'shape',
						shape: convertTldrawShapeToFocusedShape(this.editor, shape),
						source: 'user',
					})
				}
			}
		} else {
			for (const agent of agents) {
				agent.context.add({
					type: 'shapes',
					shapes: this.shapes.map((shape) => convertTldrawShapeToFocusedShape(this.editor, shape)),
					source: 'user',
				})
			}
		}
		this.editor.setCurrentTool('select')
	}

	updateBounds() {
		if (!this.initialPagePoint) return
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const x = Math.min(this.initialPagePoint.x, currentPagePoint.x)
		const y = Math.min(this.initialPagePoint.y, currentPagePoint.y)
		const w = Math.abs(currentPagePoint.x - this.initialPagePoint.x)
		const h = Math.abs(currentPagePoint.y - this.initialPagePoint.y)

		this.editor.updateInstanceState({
			brush: { x, y, w, h },
		})

		this.bounds = { x, y, w, h }

		const bounds = new Box(x, y, w, h)
		const shapesInBounds = this.editor.getCurrentPageShapesSorted().filter((shape) => {
			const geometry = this.editor.getShapeGeometry(shape)
			const pageTransform = this.editor.getShapePageTransform(shape)
			const shapeTransform = pageTransform.clone().invert()
			const boundsInShapeSpace = shapeTransform.applyToPoints(bounds.corners)
			return geometry.overlapsPolygon(boundsInShapeSpace)
		})

		this.shapes = shapesInBounds
		this.editor.setHintingShapes(shapesInBounds)
	}
}
