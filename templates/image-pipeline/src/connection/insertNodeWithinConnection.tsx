import { createShapeId, Editor } from 'tldraw'
import { onCanvasNodePickerState } from '../components/OnCanvasNodePicker'
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from '../constants'
import { getNodePorts, getPortDataType } from '../nodes/nodePorts'
import { findFirstCompatiblePort } from '../ports/portCompatibility'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

/**
 * Insert a node in the middle of a connection.
 */
export function insertNodeWithinConnection(editor: Editor, connection: ConnectionShape) {
	onCanvasNodePickerState.set(editor, {
		connectionShapeId: connection.id,
		location: 'middle',
		onPick: (nodeType) => {
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
			editor.createShape({
				type: 'node',
				id: newNodeId,
				x: newNodeX,
				y: newNodeY,
				props: { node: nodeType },
			})

			const sourceType = getPortDataType(
				editor,
				originalBindings.start.toId,
				originalBindings.start.props.portId
			)
			const targetType = getPortDataType(
				editor,
				originalBindings.end.toId,
				originalBindings.end.props.portId
			)

			const ports = getNodePorts(editor, newNodeId)
			const firstCompatibleInputPort = sourceType
				? findFirstCompatiblePort(Object.values(ports), 'end', sourceType)
				: Object.values(ports).find((p) => p.terminal === 'end')
			const firstCompatibleOutputPort = targetType
				? findFirstCompatiblePort(Object.values(ports), 'start', targetType)
				: Object.values(ports).find((p) => p.terminal === 'start')

			if (!firstCompatibleInputPort || !firstCompatibleOutputPort) {
				editor.bailToMark(mark)
				return
			}

			createOrUpdateConnectionBinding(editor, connection, newNodeId, {
				portId: firstCompatibleInputPort.id,
				terminal: 'end',
			})

			const newConnectionId = createShapeId()
			editor.createShape({
				type: 'connection',
				id: newConnectionId,
			})
			createOrUpdateConnectionBinding(editor, newConnectionId, newNodeId, {
				portId: firstCompatibleOutputPort.id,
				terminal: 'start',
			})
			createOrUpdateConnectionBinding(editor, newConnectionId, originalBindings.end.toId, {
				portId: originalBindings.end.props.portId,
				terminal: 'end',
			})

			editor.select(newNodeId)
			editor.updatePointer()
		},
		onClose: () => {},
	})
}
