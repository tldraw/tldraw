import { Box, createShapeId, Editor, TLShapeId } from 'tldraw'
import { DEFAULT_NODE_SPACING_PX, NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../constants'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

/**
 * Insert a node in the middle of a connection, used when the user clicks a connection's center
 * handle. Downstream nodes are nudged out of the way to make room.
 */
export function insertNodeWithinConnection(
	editor: Editor,
	connection: ConnectionShape,
	direction: 'horizontal' | 'vertical' = 'horizontal'
) {
	const mark = editor.markHistoryStoppingPoint()

	const originalBindings = getConnectionBindings(editor, connection)
	if (!originalBindings.start || !originalBindings.end) return

	const startBounds = editor.getShapePageBounds(originalBindings.start.toId)!
	const endBounds = editor.getShapePageBounds(originalBindings.end.toId)!

	// Aim for the midpoint between the two nodes, but never overlap the upstream one
	let newNodeX: number, newNodeY: number

	if (direction === 'horizontal') {
		newNodeY = (startBounds.top + endBounds.top) / 2
		const newNodeIdealX = (startBounds.right + endBounds.left - NODE_WIDTH_PX) / 2
		const newNodeMin = startBounds.right + DEFAULT_NODE_SPACING_PX
		newNodeX = Math.max(newNodeIdealX, newNodeMin)
	} else {
		newNodeX = (startBounds.left + endBounds.left) / 2
		if (startBounds.top > endBounds.bottom) {
			const newNodeIdealY = (startBounds.top + endBounds.bottom - NODE_HEIGHT_PX) / 2
			const newNodeMin = endBounds.bottom + DEFAULT_NODE_SPACING_PX
			newNodeY = Math.max(newNodeIdealY, newNodeMin)
		} else {
			const newNodeIdealY = (startBounds.bottom + endBounds.top - NODE_HEIGHT_PX) / 2
			const newNodeMin = startBounds.bottom + DEFAULT_NODE_SPACING_PX
			newNodeY = Math.max(newNodeIdealY, newNodeMin)
		}
	}

	const newNodeId = createShapeId()
	editor.createShape({
		type: 'node',
		id: newNodeId,
		x: newNodeX,
		y: newNodeY,
		props: { node: { type: 'message', userMessage: '', assistantMessage: '' } },
	})

	const ports = getNodePorts(editor, newNodeId)
	const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
	const firstOutputPort = Object.values(ports).find((p) => p.terminal === 'start')
	if (!firstInputPort || !firstOutputPort) {
		editor.bailToMark(mark)
		return
	}

	// re-point the existing connection at the new node, then connect the new node to the old target
	createOrUpdateConnectionBinding(editor, connection, newNodeId, {
		portId: firstInputPort.id,
		terminal: 'end',
	})

	const newConnectionId = createShapeId()
	editor.createShape({
		type: 'connection',
		id: newConnectionId,
	})
	createOrUpdateConnectionBinding(editor, newConnectionId, newNodeId, {
		portId: firstOutputPort.id,
		terminal: 'start',
	})
	createOrUpdateConnectionBinding(editor, newConnectionId, originalBindings.end.toId, {
		portId: originalBindings.end.props.portId,
		terminal: 'end',
	})

	moveNodesIfNeeded(editor, newNodeId, originalBindings.end.toId, direction)
	editor.select(newNodeId)

	// so the editor's hovered shape reflects what's now under the pointer
	editor.updatePointer()
}

/**
 * Nudge the downstream nodes of `rootNodeId` away from the newly inserted node, then animate
 * everything into place.
 */
function moveNodesIfNeeded(
	editor: Editor,
	newNodeId: TLShapeId,
	rootNodeId: TLShapeId,
	direction: 'horizontal' | 'vertical'
) {
	const rootNode = editor.getShape(rootNodeId)
	const newNode = editor.getShape(newNodeId)
	if (
		!rootNode ||
		!newNode ||
		!editor.isShapeOfType(rootNode, 'node') ||
		!editor.isShapeOfType(newNode, 'node')
	) {
		return
	}

	const toNudge = new Map<
		TLShapeId,
		{ initialX: number; initialY: number; amountX: number; amountY: number }
	>()

	const newNodeBounds = editor.getShapePageBounds(newNodeId)!.clone()
	visit(rootNodeId, newNodeBounds.expandBy(DEFAULT_NODE_SPACING_PX))

	function visit(nodeId: TLShapeId, parentExpandedBounds: Box) {
		const node = editor.getShape(nodeId)
		if (!node || !editor.isShapeOfType(node, 'node')) return

		// a node reachable via several paths accumulates nudges from each visit
		const currentNudge = toNudge.get(nodeId) ?? {
			initialX: node.x,
			initialY: node.y,
			amountX: 0,
			amountY: 0,
		}
		const nodeBounds = editor
			.getShapePageBounds(nodeId)!
			.clone()
			.translate({ x: currentNudge.amountX, y: currentNudge.amountY })

		if (!nodeBounds.collides(parentExpandedBounds)) return

		let newNudgeAmountX = 0
		let newNudgeAmountY = 0
		if (direction === 'horizontal') {
			newNudgeAmountX = parentExpandedBounds.right - nodeBounds.left
		} else {
			newNudgeAmountY = parentExpandedBounds.bottom - nodeBounds.top
		}

		toNudge.set(nodeId, {
			initialX: currentNudge.initialX,
			initialY: currentNudge.initialY,
			amountX: currentNudge.amountX + newNudgeAmountX,
			amountY: currentNudge.amountY + newNudgeAmountY,
		})

		nodeBounds
			.translate({ x: newNudgeAmountX, y: newNudgeAmountY })
			.expandBy(DEFAULT_NODE_SPACING_PX)
		for (const connection of getNodePortConnections(editor, node)) {
			if (connection.terminal !== 'start') continue
			visit(connection.connectedShapeId, nodeBounds)
		}
	}

	editor
		// start the new node invisible so it fades in alongside the nudge animation
		.updateShape({ id: newNodeId, type: 'node', opacity: 0 })
		.animateShapes(
			[
				{
					id: newNodeId,
					type: 'node',
					opacity: 1,
				},
				...Array.from(toNudge.entries()).map(([id, nudge]) => ({
					id,
					type: 'node' as const,
					x: nudge.initialX + nudge.amountX,
					y: nudge.initialY + nudge.amountY,
				})),
			],
			{ animation: { duration: 100 } }
		)
}
