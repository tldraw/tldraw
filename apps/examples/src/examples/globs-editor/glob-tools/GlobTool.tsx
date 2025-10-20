import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { NodeShape } from '../Node'

export class GlobTool extends StateNode {
	static override id = 'glob'
	static override initial = 'idle'

	static override children() {
		return [IdleState, NodeState, ConnectState]
	}
}

export class IdleState extends StateNode {
	static override id = 'idle'

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

export class NodeState extends StateNode {
	static override id = 'node'
	private ghostShapeId: TLShapeId | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'cross' })
	}

	override onPointerMove(info: TLPointerEventInfo) {
		const pagePoint = this.editor.screenToPage(info.point)

		if (!this.ghostShapeId) {
			const id = createShapeId()
			this.editor.createShape<NodeShape>({
				id: id,
				type: 'node',
				x: pagePoint.x,
				y: info.point.y,
				props: {
					radius: 50,
					opacity: 0.25,
				},
			})
			this.ghostShapeId = id
			return
		}

		const shape = this.editor.getShape<NodeShape>(this.ghostShapeId)
		if (!shape) return

		this.editor.updateShape<NodeShape>({
			...shape,
			x: pagePoint.x,
			y: pagePoint.y,
		})

		return
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (!this.ghostShapeId) return
		const pagePoint = this.editor.screenToPage(info.point)
		const shape = this.editor.getShape<NodeShape>(this.ghostShapeId)!
		if (!shape) return

		this.editor.updateShape<NodeShape>({
			...shape,
			x: pagePoint.x,
			y: pagePoint.y,
			props: {
				...shape.props,
				opacity: 1,
			},
		})

		this.ghostShapeId = null
		this.editor.setCurrentTool('select')
	}

	override onExit() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	private complete() {
		if (this.ghostShapeId) {
			this.editor.deleteShapes([this.ghostShapeId])
			this.ghostShapeId = null
		}
		this.editor.setCursor({ type: 'default' })
	}
}

export class ConnectState extends StateNode {
	static override id = 'connect'
	selectedNodes: NodeShape[] = []

	override onEnter() {
		this.editor.setCursor({ type: 'cross' })
	}

	override onPointerMove(_info: TLPointerEventInfo) {}

	override onExit() {}
}
