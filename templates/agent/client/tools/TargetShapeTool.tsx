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
		const shape = this.getShapeAtPointer()
		this.editor.setHintingShapes(shape ? [shape] : [])
	}

	override onPointerDown() {
		this.parent.transition('pointing', { shape: this.getShapeAtPointer() })
	}

	private getShapeAtPointer() {
		return this.editor.getShapeAtPoint(this.editor.inputs.getCurrentPagePoint(), {
			hitInside: true,
		})
	}
}

class TargetShapePointing extends StateNode {
	static override id = 'pointing'

	private shape: TLShape | undefined = undefined
	private initialPagePoint: VecModel | undefined = undefined

	override onEnter({ shape }: { shape: TLShape | undefined }) {
		this.initialPagePoint = this.editor.inputs.getCurrentPagePoint().clone()
		this.shape = shape
	}

	override onPointerMove() {
		if (!this.initialPagePoint) return
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging', { initialPagePoint: this.initialPagePoint })
		}
	}

	override onPointerUp() {
		this.editor.setHintingShapes([])
		if (this.shape) {
			for (const agent of AgentAppAgentsManager.getAgents(this.editor)) {
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
		this.editor.updateInstanceState({ brush: null })

		if (!this.bounds) throw new Error('Bounds not set')
		// A few shapes go in individually; many go in as one group
		for (const agent of AgentAppAgentsManager.getAgents(this.editor)) {
			const focusedShapes = this.shapes.map((shape) =>
				convertTldrawShapeToFocusedShape(this.editor, shape)
			)
			if (focusedShapes.length <= 3) {
				for (const shape of focusedShapes) {
					agent.context.add({ type: 'shape', shape, source: 'user' })
				}
			} else {
				agent.context.add({ type: 'shapes', shapes: focusedShapes, source: 'user' })
			}
		}
		this.editor.setCurrentTool('select')
	}

	updateBounds() {
		if (!this.initialPagePoint) return
		const bounds = Box.FromPoints([this.initialPagePoint, this.editor.inputs.getCurrentPagePoint()])
		this.bounds = bounds.toJson()
		this.editor.updateInstanceState({ brush: this.bounds })

		const shapesInBounds = this.editor.getCurrentPageShapesSorted().filter((shape) => {
			const geometry = this.editor.getShapeGeometry(shape)
			const shapeTransform = this.editor.getShapePageTransform(shape).clone().invert()
			return geometry.overlapsPolygon(shapeTransform.applyToPoints(bounds.corners))
		})

		this.shapes = shapesInBounds
		this.editor.setHintingShapes(shapesInBounds)
	}
}
