import {
	createShapeId,
	snapAngle,
	StateNode,
	TLBindingUpdate,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
} from 'tldraw'
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
		const shapes = this.editor
			.getShapesAtPoint(pagePoint, {
				hitInside: true,
			})
			.filter(
				(shape) =>
					shape.id !== this.ghostShapeId && this.editor.isShapeOfType<NodeShape>(shape, 'node')
			)

		if (shapes.length) {
			return
		}

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

	override onCancel() {
		this.complete()
	}

	private complete() {
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
	ghostGlobIds: TLShapeId[] = []

	ghostNodeId: TLShapeId | null = null

	override onEnter() {
		this.selectedNodeIds = this.editor.getSelectedShapeIds()
		this.editor.setCursor({ type: 'cross' })
	}

	override onPointerMove(info: TLPointerEventInfo) {
		// selected nodes go to the ghost node
		const selectedNode = this.editor.getShape<NodeShape>(this.selectedNodeIds[0])
		if (!selectedNode) return

		let pagePoint = this.editor.screenToPage(info.point)

		// Apply shift snapping for angle constraints
		if (info.shiftKey) {
			const selectedNodeCenter = new Vec(selectedNode.x, selectedNode.y)
			const angle = Vec.Angle(selectedNodeCenter, pagePoint)
			const snappedAngle = snapAngle(angle, 24)
			const distance = Vec.Dist(selectedNodeCenter, pagePoint)
			pagePoint = Vec.FromAngle(snappedAngle, distance).add(selectedNodeCenter)
		}

		// if there is no ghost node, create one
		if (!this.ghostNodeId) {
			const id = createShapeId()
			this.editor.createShape<NodeShape>({
				id: id,
				type: 'node',
				x: pagePoint.x,
				y: pagePoint.y,
				props: {
					radius: selectedNode.props.radius,
				},
			})

			this.ghostNodeId = id
		}

		this.editor.updateShape<NodeShape>({
			id: this.ghostNodeId,
			type: 'node',
			x: pagePoint.x,
			y: pagePoint.y,
		})

		// if there are no ghost globs, create them
		if (!this.ghostGlobIds.length) {
			for (let i = 0; i < this.selectedNodeIds.length; i++) {
				const id = createShapeId()

				this.editor.createShape<GlobShape>({
					id: id,
					type: 'glob',
					x: 0,
					y: 0,
					props: {
						opacity: 0.25,
						isGhosting: true,
					},
				})

				this.ghostGlobIds.push(id)

				// bind each node to the glob
				this.editor.createBindings<GlobBinding>([
					{
						fromId: id,
						toId: this.selectedNodeIds[i],
						type: 'glob',
						props: {
							terminal: 'start',
						},
					},
					{
						fromId: id,
						toId: this.ghostNodeId,
						type: 'glob',
						props: {
							terminal: 'end',
						},
					},
				])
			}
		}

		// update each ghost globs as we drag the ghost node around
		for (let i = 0; i < this.ghostGlobIds.length; i++) {
			const selectedNode = this.editor.getShape<NodeShape>(this.selectedNodeIds[i])
			if (!selectedNode) continue

			const mid = Vec.Average([pagePoint, selectedNode])

			const localStartNode = Vec.Sub(selectedNode, mid)
			const localEndNode = Vec.Sub(pagePoint, mid)

			const tangentPoints = getOuterTangentPoints(
				localStartNode,
				selectedNode.props.radius,
				localEndNode,
				selectedNode.props.radius
			)

			const d0 = Vec.Lrp(tangentPoints[0], tangentPoints[1], 0.5)
			const d1 = Vec.Lrp(tangentPoints[2], tangentPoints[3], 0.5)

			this.editor.updateShape<GlobShape>({
				id: this.ghostGlobIds[i],
				type: 'glob',
				x: mid.x,
				y: mid.y,
				props: {
					edges: {
						edgeA: {
							d: { x: d0.x, y: d0.y },
							tensionRatioA: 0.5,
							tensionRatioB: 0.5,
						},
						edgeB: {
							d: { x: d1.x, y: d1.y },
							tensionRatioA: 0.5,
							tensionRatioB: 0.5,
						},
					},
				},
			})
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (!this.ghostNodeId) return

		const pagePoint = this.editor.screenToPage(info.point)

		const shapes = this.editor.getShapesAtPoint(pagePoint, {
			hitInside: true,
		})

		const nodes = shapes.filter(
			(shape) =>
				this.editor.isShapeOfType<NodeShape>(shape, 'node') && shape.id !== this.ghostNodeId
		)
		if (!nodes.length) return

		const updates: TLBindingUpdate[] = []
		const bindings = this.editor.getBindingsToShape(this.ghostNodeId, 'glob')
		if (!bindings.length) return

		for (const binding of bindings) {
			updates.push({
				...binding,
				toId: nodes[0].id,
			})
		}

		this.editor.updateBindings(updates)
		if (this.ghostNodeId) {
			this.editor.deleteShape(this.ghostNodeId)
		}

		this.complete()
	}

	override onPointerUp() {
		if (!this.ghostGlobIds.length) return

		for (let i = 0; i < this.ghostGlobIds.length; i++) {
			this.editor.updateShape<GlobShape>({
				id: this.ghostGlobIds[i],
				type: 'glob',
				props: { isGhosting: false },
			})
		}

		this.complete()
	}

	override onCancel() {
		if (this.ghostGlobIds.length) {
			this.editor.deleteShapes(this.ghostGlobIds)
		}
		if (this.ghostNodeId) {
			this.editor.deleteShapes([this.ghostNodeId])
		}

		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	private complete() {
		this.ghostNodeId = null

		this.selectedNodeIds = []
		this.ghostGlobIds = []

		this.editor.setCurrentTool('select')
	}
}
