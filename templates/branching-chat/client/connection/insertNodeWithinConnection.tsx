import { Box, createShapeId, Editor, TLShapeId } from 'tldraw'
import { DEFAULT_NODE_SPACING_PX, NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../constants'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

/**
 * Insert a node in the middle of a connection.
 *
 * This is used when the user clicks the center handle of a connection shape.
 */
export function insertNodeWithinConnection(
	editor: Editor,
	connection: ConnectionShape,
	direction: 'horizontal' | 'vertical' = 'horizontal'
) {
	// mark the history so we can undo this operation
	const mark = editor.markHistoryStoppingPoint()

	// get the original bindings of the connection
	const originalBindings = getConnectionBindings(editor, connection)

	// if the connection doesn't have bindings, we can't insert a node in the middle of it
	if (!originalBindings.start || !originalBindings.end) return

	// find the ideal position for the new node based on direction:
	const startBounds = editor.getShapePageBounds(originalBindings.start.toId)!
	const endBounds = editor.getShapePageBounds(originalBindings.end.toId)!

	let newNodeX: number, newNodeY: number

	if (direction === 'horizontal') {
		// horizontal layout: nodes flow left to right
		newNodeY = (startBounds.top + endBounds.top) / 2
		const newNodeIdealX = (startBounds.right + endBounds.left - NODE_WIDTH_PX) / 2
		const newNodeMin = startBounds.right + DEFAULT_NODE_SPACING_PX
		newNodeX = Math.max(newNodeIdealX, newNodeMin)
	} else {
		// vertical layout: nodes flow top to bottom
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

	// create the new node
	const newNodeId = createShapeId()
	editor.createShape<NodeShape>({
		type: 'node',
		id: newNodeId,
		x: newNodeX,
		y: newNodeY,
		props: { node: { type: 'message', userMessage: '', assistantMessage: '' } },
	})

	// now, we need to connect up the new node.
	// first, lets find the first input and output port on the new node.
	const ports = getNodePorts(editor, newNodeId)
	const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
	const firstOutputPort = Object.values(ports).find((p) => p.terminal === 'start')
	if (!firstInputPort || !firstOutputPort) {
		editor.bailToMark(mark)
		return
	}

	// update the existing connection to connect to the input of our new node
	createOrUpdateConnectionBinding(editor, connection, newNodeId, {
		portId: firstInputPort.id,
		terminal: 'end',
	})

	// create a new connection between the new node and the end of the original connection
	const newConnectionId = createShapeId()
	editor.createShape<ConnectionShape>({
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

	// move around any connected nodes to make room for the new one
	moveNodesIfNeeded(editor, newNodeId, originalBindings.end.toId, direction)

	// select the new node
	editor.select(newNodeId)

	// update the pointer so that e.g. the editor's internal hovered shape id is correct
	editor.updatePointer()
}

/**
 * Move around any connected nodes to make room for the new node.
 *
 * This is used when the user inserts a node in the middle of a connection.
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
		!editor.isShapeOfType<NodeShape>(rootNode, 'node') ||
		!editor.isShapeOfType<NodeShape>(newNode, 'node')
	) {
		return
	}

	// first, we need to nudge all the downstream nodes to make room for the new node.
	// toNudge tracks all the nodes we need to nudge.
	const toNudge = new Map<
		TLShapeId,
		{ initialX: number; initialY: number; amountX: number; amountY: number }
	>()

	// we start with the expanded bounds of the newly added node:
	const newNodeBounds = editor.getShapePageBounds(newNodeId)!.clone()
	visit(rootNodeId, newNodeBounds.expandBy(DEFAULT_NODE_SPACING_PX))

	function visit(nodeId: TLShapeId, parentExpandedBounds: Box) {
		const node = editor.getShape(nodeId)
		if (!node || !editor.isShapeOfType<NodeShape>(node, 'node')) return

		// if this node has already been visited, we need to continue on from the nudge we
		// calculated last time:
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

		// if this node isn't colliding with the expanded parent node, it's already far enough away
		// and we don't need to do anything!
		if (!nodeBounds.collides(parentExpandedBounds)) {
			return
		}

		// we need to nudge this node to make room for the new node.
		// direction determines whether we nudge horizontally or vertically
		let newNudgeAmountX = 0
		let newNudgeAmountY = 0

		if (direction === 'horizontal') {
			// nudge to the right for horizontal layout
			newNudgeAmountX = parentExpandedBounds.right - nodeBounds.left
		} else {
			// nudge downward for vertical layout
			newNudgeAmountY = parentExpandedBounds.bottom - nodeBounds.top
		}

		toNudge.set(nodeId, {
			initialX: currentNudge.initialX,
			initialY: currentNudge.initialY,
			amountX: currentNudge.amountX + newNudgeAmountX,
			amountY: currentNudge.amountY + newNudgeAmountY,
		})

		// now, we traverse the downstream connections from this node and nudge them all if needed.
		nodeBounds
			.translate({ x: newNudgeAmountX, y: newNudgeAmountY })
			.expandBy(DEFAULT_NODE_SPACING_PX)
		for (const connection of Object.values(getNodePortConnections(editor, node))) {
			if (!connection || connection.terminal !== 'start') continue
			visit(connection.connectedShapeId, nodeBounds)
		}
	}

	editor
		// hide the new node for the purposes of the animation
		.updateShape({ id: newNodeId, type: 'node', opacity: 0 })
		// animate the new node fading in, and all the other nodes to their new positions
		.animateShapes(
			[
				{
					id: newNodeId,
					type: 'node',
					opacity: 1,
				},
				...Array.from(toNudge.entries()).map(([id, nudge]) => ({
					id,
					type: 'node',
					x: nudge.initialX + nudge.amountX,
					y: nudge.initialY + nudge.amountY,
				})),
			],
			{ animation: { duration: 100 } }
		)
}
