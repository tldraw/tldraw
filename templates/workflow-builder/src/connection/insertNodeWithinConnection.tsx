import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { updateHoveredShapeId } from 'tldraw/src/lib/tools/selection-logic/updateHoveredShapeId'
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from '../constants'
import { getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

export function insertNodeWithinConnection(editor: Editor, connection: ConnectionShape) {
	const mark = editor.markHistoryStoppingPoint()
	const originalBindings = getConnectionBindings(editor, connection)
	if (!originalBindings.start || !originalBindings.end) return

	const startBounds = editor.getShapePageBounds(originalBindings.start.toId)!
	const endBounds = editor.getShapePageBounds(originalBindings.end.toId)!

	const newNodeY = (startBounds.top + endBounds.top) / 2
	const newNodeIdealX = (startBounds.right + endBounds.left - NODE_WIDTH_PX) / 2
	const newNodeMin = startBounds.right + DEFAULT_NODE_SPACING_PX
	const newNodeX = Math.max(newNodeIdealX, newNodeMin)

	const newNodeId = createShapeId()
	editor.createShape<NodeShape>({
		type: 'node',
		id: newNodeId,
		x: newNodeX,
		y: newNodeY,
	})

	const ports = getNodePorts(editor, newNodeId)
	const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
	const firstOutputPort = Object.values(ports).find((p) => p.terminal === 'start')
	if (!firstInputPort || !firstOutputPort) {
		editor.bailToMark(mark)
		return
	}

	createOrUpdateConnectionBinding(editor, connection, newNodeId, {
		portId: firstInputPort.id,
		terminal: 'end',
	})

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

	editor.select(newNodeId)
	updateHoveredShapeId(editor)

	moveDownstreamNodesIfNeeded(editor, newNodeId, originalBindings.end.toId)
}

function moveDownstreamNodesIfNeeded(editor: Editor, newNodeId: TLShapeId, rootNodeId: TLShapeId) {
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

	const rootNodeBounds = editor.getShapePageBounds(rootNodeId)!
	const newNodeBounds = editor.getShapePageBounds(newNodeId)!

	if (!newNodeBounds.clone().expandBy(DEFAULT_NODE_SPACING_PX).collides(rootNodeBounds)) {
		// nodes are far enough apart, we don't need to do anything
		return
	}

	const nudgeAmount = newNodeBounds.right + DEFAULT_NODE_SPACING_PX - rootNodeBounds.left

	editor.updateShape({ id: newNodeId, type: 'node', opacity: 0 }).animateShapes(
		[
			{
				id: newNodeId,
				type: 'node',
				opacity: 1,
			},
			{
				id: rootNodeId,
				type: 'node',
				x: rootNode.x + nudgeAmount,
			},
		],
		{ animation: { duration: 100 } }
	)
}
