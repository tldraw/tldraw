import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId, Vec, VecLike } from 'tldraw'
import { GlobBinding } from '../GlobBindingUtil'
import { GlobShape } from '../GlobShapeUtil'
import { NodeShape } from '../NodeShapeUtil'
import { getOuterTangentPoints } from '../utils'

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
		console.log('onEnter')
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
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (!this.ghostShapeId) return

		const node = this.editor.getShape<NodeShape>(this.ghostShapeId)!
		if (!node) return

		const pagePoint = this.editor.screenToPage(info.point)

		this.editor.updateShape<NodeShape>({
			...node,
			x: pagePoint.x,
			y: pagePoint.y,
			props: {
				...node.props,
				opacity: 1,
			},
		})
		this.ghostShapeId = null

		this.complete()
	}

	override onComplete() {
		console.log('onComplete')
		// this.complete()
	}

	override onCancel() {
		console.log('onCancel')
		this.complete()
	}

	private complete() {
		console.log('complete')
		if (this.ghostShapeId) {
			this.editor.deleteShapes([this.ghostShapeId])
			this.ghostShapeId = null
		}

		this.editor.setCurrentTool('select')
	}
}

export class ConnectState extends StateNode {
	static override id = 'connect'
	selectedNodeIds: TLShapeId[] = []

	ghostGlobId: TLShapeId | null = null
	ghostNodeId: TLShapeId | null = null

	private tangents: VecLike[] = []

	override onEnter() {
		this.selectedNodeIds = this.editor.getSelectedShapeIds()
		this.editor.setCursor({ type: 'cross' })
	}

	override onPointerMove(info: TLPointerEventInfo) {
		const selectedNode = this.editor.getShape<NodeShape>(this.selectedNodeIds[0])
		if (!selectedNode) return

		const pagePoint = this.editor.screenToPage(info.point)

		if (!this.ghostNodeId) {
			const id = createShapeId()
			this.editor.createShape<NodeShape>({
				id: id,
				type: 'node',
				x: pagePoint.x,
				y: pagePoint.y,
			})

			this.ghostNodeId = id
		}

		this.editor.updateShape<NodeShape>({
			id: this.ghostNodeId,
			type: 'node',
			x: pagePoint.x,
			y: pagePoint.y,
		})

		if (!this.ghostGlobId) {
			const id = createShapeId()

			this.editor.createShape<GlobShape>({
				id: id,
				type: 'glob',
				x: 0,
				y: 0,
				props: {
					opacity: 0.25,
				},
			})

			this.ghostGlobId = id

			this.editor.createBindings<GlobBinding>([
				{
					fromId: this.ghostGlobId,
					toId: this.selectedNodeIds[0],
					type: 'glob',
					props: {
						terminal: 'start',
					},
				},
				{
					fromId: this.ghostGlobId,
					toId: this.ghostNodeId,
					type: 'glob',
					props: {
						terminal: 'end',
					},
				},
			])
		}

		const tangentPoints = getOuterTangentPoints(
			selectedNode,
			selectedNode.props.radius,
			pagePoint,
			selectedNode.props.radius
		)

		const d0 = Vec.Lrp(tangentPoints[0], tangentPoints[1], 0.5)
		const d1 = Vec.Lrp(tangentPoints[2], tangentPoints[3], 0.5)

		const f00 = Vec.Lrp(tangentPoints[0], d0, 0.5)
		const f01 = Vec.Lrp(d0, tangentPoints[1], 0.5)

		const f10 = Vec.Lrp(tangentPoints[2], d1, 0.5)
		const f11 = Vec.Lrp(d1, tangentPoints[3], 0.5)

		this.editor.updateShape<GlobShape>({
			id: this.ghostGlobId,
			type: 'glob',
			props: {
				edges: {
					edgeA: {
						tangentA: { x: tangentPoints[0].x, y: tangentPoints[0].y },
						tangentB: { x: tangentPoints[1].x, y: tangentPoints[1].y },
						d: { x: d0.x, y: d0.y },
						tensionA: { x: f00.x, y: f00.y },
						tensionB: { x: f01.x, y: f01.y },
					},
					edgeB: {
						tangentA: { x: tangentPoints[2].x, y: tangentPoints[2].y },
						tangentB: { x: tangentPoints[3].x, y: tangentPoints[3].y },
						d: { x: d1.x, y: d1.y },
						tensionA: { x: f10.x, y: f10.y },
						tensionB: { x: f11.x, y: f11.y },
					},
				},
			},
		})
	}

	override onPointerDown(info: TLPointerEventInfo) {
		// if (!this.ghostNodeId) return
		//
		// console.log('ghostNodeId', this.ghostNodeId)
		// console.log('selectedNodeIds', this.selectedNodeIds)
		//
		// const globId = createShapeId()
		// this.editor.createShape<GlobShape>({
		// 	id: globId,
		// 	type: 'glob',
		// 	props: {
		// 		nodes: [this.ghostNodeId],
		// 	},
		// })
		//
		// this.editor.createBindings<GlobBinding>([
		// 	{
		// 		fromId: this.selectedNodeIds[0],
		// 		toId: this.ghostNodeId,
		// 		type: 'glob',
		// 		props: {
		// 			parentGlobId: globId,
		// 			e0: { x: 0, y: 0 },
		// 			e1: { x: 0, y: 0 },
		// 			d: { x: 0, y: 0 },
		// 			f0: { x: 0, y: 0 },
		// 			f1: { x: 0, y: 0 },
		// 		},
		// 	},
		// ])
		//
		// const shape = this.editor.getShape<NodeShape>(this.ghostNodeId)
		// if (!shape) return
		//
		// this.editor.updateShape<NodeShape>({
		// 	...shape,
		// 	props: {
		// 		...shape.props,
		// 		opacity: 1,
		// 	},
		// })
		//
		this.complete()
	}

	override onPointerUp(info: TLPointerEventInfo) {
		console.log('onPointerUp')
		this.complete()
	}

	override onCancel() {
		console.log('onCancel')
		this.complete()
	}

	override onComplete() {
		console.log('onComplete')
		this.complete()
	}

	private complete() {
		console.log('complete')
		this.selectedNodeIds = []
		this.ghostNodeId = null
		this.editor.setCurrentTool('select')
	}
}
