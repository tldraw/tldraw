import { BoxModel, StateNode, VecModel } from 'tldraw'
import { AgentAppAgentsManager } from '../agent/managers/AgentAppAgentsManager'

export class TargetAreaTool extends StateNode {
	static override id = 'target-area'
	static override initial = 'idle'
	static override children() {
		return [TargetAreaIdle, TargetAreaPointing, TargetAreaDragging]
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

class TargetAreaIdle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		this.parent.transition('pointing')
	}
}

class TargetAreaPointing extends StateNode {
	static override id = 'pointing'

	private initialScreenPoint: VecModel | undefined = undefined
	private initialPagePoint: VecModel | undefined = undefined

	override onEnter() {
		this.initialScreenPoint = this.editor.inputs.getCurrentScreenPoint().clone()
		this.initialPagePoint = this.editor.inputs.getCurrentPagePoint().clone()
	}

	override onPointerMove() {
		if (!this.initialScreenPoint) return
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging', { initialPagePoint: this.initialPagePoint })
		}
	}

	override onPointerUp() {
		const agents = AgentAppAgentsManager.getAgents(this.editor)
		for (const agent of agents) {
			agent.context.add({
				type: 'point',
				point: this.editor.inputs.getCurrentPagePoint().clone(),
				source: 'user',
			})
		}
		this.editor.setCurrentTool('select')
	}
}

class TargetAreaDragging extends StateNode {
	static override id = 'dragging'

	private initialPagePoint: VecModel | undefined = undefined
	private bounds: BoxModel | undefined = undefined

	override onEnter(props: { initialPagePoint: VecModel }) {
		this.initialPagePoint = props.initialPagePoint
		this.updateBounds()
	}

	override onPointerMove() {
		this.updateBounds()
	}

	override onPointerUp() {
		this.editor.updateInstanceState({
			brush: null,
		})

		if (!this.bounds) throw new Error('Bounds not set')
		const agents = AgentAppAgentsManager.getAgents(this.editor)
		for (const agent of agents) {
			agent.context.add({
				type: 'area',
				bounds: this.bounds,
				source: 'user',
			})
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
	}
}
