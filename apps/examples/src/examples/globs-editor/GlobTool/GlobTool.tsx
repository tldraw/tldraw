import {
	createShapeId,
	snapAngle,
	StateNode,
	TLBindingUpdate,
	TLParentId,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
} from 'tldraw'
import { GlobBinding } from '../GlobBindingUtil'
import { GlobShape } from '../GlobShapeUtil'
import { NodeShape } from '../NodeShapeUtil'
import { getGlobTangentUpdate, getStartAndEndNodes } from '../shared'

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

	override onPointerMove(_info: TLPointerEventInfo) {
		const pagePoint = this.editor.inputs.getCurrentPagePoint()

		if (!this.ghostShapeId) {
			const id = createShapeId()
			this.editor.createShape<NodeShape>({
				id: id,
				type: 'node',
				x: pagePoint.x,
				y: pagePoint.y,
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

		// could be inside a frame, so we need to get the point in the parent space
		const parentPoint = this.editor.getPointInParentSpace(shape, pagePoint)

		this.editor.updateShape<NodeShape>({
			...shape,
			x: parentPoint.x,
			y: parentPoint.y,
		})
	}

	override onPointerDown(_info: TLPointerEventInfo) {
		if (!this.ghostShapeId) return

		const node = this.editor.getShape<NodeShape>(this.ghostShapeId)!
		if (!node) return

		// if we try place another node such that it overlaps with an existing node radii, don't allow it
		const pagePoint = this.editor.inputs.getCurrentPagePoint()
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

		const parentPoint = this.editor.getPointInParentSpace(node, pagePoint)
		this.editor.updateShape<NodeShape>({
			...node,
			x: parentPoint.x,
			y: parentPoint.y,
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

		// Apply shift snapping for angle constraints
		let pagePoint = this.editor.inputs.getCurrentPagePoint()
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

		const parentPoint = this.editor.getPointInParentSpace(this.ghostNodeId, pagePoint)
		this.editor.updateShape<NodeShape>({
			id: this.ghostNodeId,
			type: 'node',
			x: parentPoint.x,
			y: parentPoint.y,
		})

		// if there are no ghost globs, create them, we could be ghosting a whole selection of nodes
		if (!this.ghostGlobIds.length) {
			for (let i = 0; i < this.selectedNodeIds.length; i++) {
				const id = createShapeId()

				// Determine the proper parent for the glob based on the bound nodes
				const startNode = this.editor.getShape(this.selectedNodeIds[i])
				const endNode = this.editor.getShape(this.ghostNodeId)

				let globParentId: TLParentId = this.editor.getCurrentPageId()
				if (startNode && endNode) {
					// Find common ancestor of the two nodes
					const commonAncestor = this.editor.findCommonAncestor([startNode, endNode])
					if (commonAncestor) {
						globParentId = commonAncestor
					}
				}

				this.editor.createShape<GlobShape>({
					id: id,
					type: 'glob',
					parentId: globParentId,
					x: 0,
					y: 0,
					props: {
						opacity: 0.25,
						isGhosting: true,
					},
				})

				const glob = this.editor.getShape<GlobShape>(id)
				if (!glob) continue

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

			const pageNode = this.editor.getShapePageTransform(this.selectedNodeIds[i]).point()
			const update = getGlobTangentUpdate(
				this.editor,
				this.ghostGlobIds[i],
				pageNode,
				selectedNode.props.radius,
				pagePoint,
				selectedNode.props.radius
			)

			this.editor.updateShape<GlobShape>(update)
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (!this.ghostNodeId) return

		const pagePoint = this.editor.screenToPage(info.point)
		const shapes = this.editor.getShapesAtPoint(pagePoint, {
			hitInside: true,
		})

		// find any existing node we may be trying to connect to
		const nodes = shapes.filter(
			(shape) =>
				this.editor.isShapeOfType<NodeShape>(shape, 'node') && shape.id !== this.ghostNodeId
		)

		// if we don't find a node, just place the ghost node and complete
		if (!nodes.length) {
			this.complete()
			return
		}

		// we found a node, we need to update the bindings to connect to the existing node,
		// recalculate the tangent points for the glob, with different radii as well as the bindings
		const updates: TLBindingUpdate[] = []
		const bindings = this.editor.getBindingsToShape(this.ghostNodeId, 'glob')
		if (!bindings.length) {
			this.complete()
			return
		}

		// update all current bindings to connect to the existing node
		for (const binding of bindings) {
			updates.push({
				...binding,
				toId: nodes[0].id,
			})
		}

		this.editor.updateBindings(updates)

		// update the outer tangents because the radii may have changed
		for (const glob of this.ghostGlobIds) {
			const globShape = this.editor.getShape<GlobShape>(glob)
			if (!globShape) continue

			const nodes = getStartAndEndNodes(this.editor, glob)
			if (!nodes) continue

			const startNodePagePos = this.editor.getShapePageTransform(nodes.startNodeShape.id).point()
			const endNodePagePos = this.editor.getShapePageTransform(nodes.endNodeShape.id).point()

			const update = getGlobTangentUpdate(
				this.editor,
				glob,
				startNodePagePos,
				nodes.startNodeShape.props.radius,
				endNodePagePos,
				nodes.endNodeShape.props.radius
			)
			this.editor.updateShape<GlobShape>(update)
		}

		if (this.ghostNodeId) {
			this.editor.deleteShape(this.ghostNodeId)
		}

		this.complete()
	}

	override onCancel() {
		if (this.ghostGlobIds.length) {
			this.editor.deleteShapes(this.ghostGlobIds)
			this.ghostGlobIds = []
		}
		if (this.ghostNodeId) {
			this.editor.deleteShapes([this.ghostNodeId])
			this.ghostNodeId = null
		}

		this.editor.setCurrentTool('select')
	}

	override onComplete() {
		this.complete()
	}

	private complete() {
		// remove the ghosting from the globs
		for (let i = 0; i < this.ghostGlobIds.length; i++) {
			this.editor.updateShape<GlobShape>({
				id: this.ghostGlobIds[i],
				type: 'glob',
				props: { isGhosting: false },
			})
		}

		this.ghostNodeId = null

		this.editor.setSelectedShapes(this.ghostGlobIds)
		this.selectedNodeIds = []
		this.ghostGlobIds = []

		this.editor.setCurrentTool('select')
	}
}
