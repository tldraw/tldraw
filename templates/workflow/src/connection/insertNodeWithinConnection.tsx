import { Box, createShapeId, Editor, TLShapeId } from 'tldraw'
import { onCanvasComponentPickerState } from '../components/OnCanvasComponentPicker'
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from '../constants'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

/**
 * Insert a node in the middle of a connection, when the user clicks the connection's center handle.
 */
export function insertNodeWithinConnection(editor: Editor, connection: ConnectionShape) {
	onCanvasComponentPickerState.set(editor, {
		connectionShapeId: connection.id,
		location: 'middle',
		onPick: (nodeType) => {
			const mark = editor.markHistoryStoppingPoint()

			const originalBindings = getConnectionBindings(editor, connection)
			if (!originalBindings.start || !originalBindings.end) return

			// centered between the two nodes, but never overlapping the start node
			const startBounds = editor.getShapePageBounds(originalBindings.start.toId)!
			const endBounds = editor.getShapePageBounds(originalBindings.end.toId)!
			const newNodeY = (startBounds.top + endBounds.top) / 2
			const newNodeIdealX = (startBounds.right + endBounds.left - NODE_WIDTH_PX) / 2
			const newNodeMin = startBounds.right + DEFAULT_NODE_SPACING_PX
			const newNodeX = Math.max(newNodeIdealX, newNodeMin)

			const newNodeId = createShapeId()
			editor.createShape({
				type: 'node',
				id: newNodeId,
				x: newNodeX,
				y: newNodeY,
				props: { node: nodeType },
			})

			const ports = getNodePorts(editor, newNodeId)
			const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
			const firstOutputPort = Object.values(ports).find((p) => p.terminal === 'start')
			if (!firstInputPort || !firstOutputPort) {
				editor.bailToMark(mark)
				return
			}

			// re-route the existing connection into the new node, and add a new connection from the
			// new node to the original end
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

			moveNodesIfNeeded(editor, newNodeId, originalBindings.end.toId)
			editor.select(newNodeId)

			// so the editor's hovered shape id reflects the new node under the pointer
			editor.updatePointer()
		},
		onClose: () => {},
	})
}

/**
 * Nudge downstream nodes to the right until nothing overlaps the newly inserted node.
 */
function moveNodesIfNeeded(editor: Editor, newNodeId: TLShapeId, rootNodeId: TLShapeId) {
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

	const toNudgeRight = new Map<TLShapeId, { initialX: number; amount: number }>()

	const newNodeBounds = editor.getShapePageBounds(newNodeId)!.clone()
	visit(rootNodeId, newNodeBounds.expandBy(DEFAULT_NODE_SPACING_PX))

	function visit(nodeId: TLShapeId, parentExpandedBounds: Box) {
		const node = editor.getShape(nodeId)
		if (!node || !editor.isShapeOfType(node, 'node')) return

		// a node reachable by several paths continues from the nudge it already has
		const currentNudge = toNudgeRight.get(nodeId) ?? { initialX: node.x, amount: 0 }
		const nodeBounds = editor
			.getShapePageBounds(nodeId)!
			.clone()
			.translate({ x: currentNudge.amount, y: 0 })

		if (!nodeBounds.collides(parentExpandedBounds)) return

		const newNudgeAmount = parentExpandedBounds.right - nodeBounds.left
		toNudgeRight.set(nodeId, {
			initialX: currentNudge.initialX,
			amount: currentNudge.amount + newNudgeAmount,
		})

		nodeBounds.translate({ x: newNudgeAmount, y: 0 }).expandBy(DEFAULT_NODE_SPACING_PX)
		for (const connection of getNodePortConnections(editor, node)) {
			if (connection.terminal !== 'start') continue
			visit(connection.connectedShapeId, nodeBounds)
		}
	}

	// fade the new node in while the others slide to their new positions
	editor.updateShape({ id: newNodeId, type: 'node', opacity: 0 }).animateShapes(
		[
			{
				id: newNodeId,
				type: 'node',
				opacity: 1,
			},
			...Array.from(toNudgeRight.entries()).map(([id, nudge]) => ({
				id,
				type: 'node' as const,
				x: nudge.initialX + nudge.amount,
			})),
		],
		{ animation: { duration: 100 } }
	)
}
