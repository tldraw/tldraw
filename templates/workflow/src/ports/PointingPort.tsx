import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { onCanvasComponentPickerState } from '../components/OnCanvasComponentPicker.tsx'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil'
import {
	createNodeAtConnectionEnd,
	deleteConnectionIfIncomplete,
} from '../connection/ConnectionShapeUtil'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import {
	DEFAULT_NODE_SPACING_PX,
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
} from '../constants.tsx'
import { getNodePortConnections } from '../nodes/nodePorts'
import { PortId } from '../ports/Port'

interface PointingPortInfo {
	shapeId: TLShapeId
	portId: PortId
	terminal: 'start' | 'end'
}

/**
 * A child state of the select tool: the user has pointer-down'd on a port. Dragging creates (or
 * picks up) a connection and hands off to `dragging_handle`; a plain click opens the node picker.
 */
export class PointingPort extends StateNode {
	static override id = 'pointing_port'

	info?: PointingPortInfo

	override onEnter(info: PointingPortInfo): void {
		this.info = info
	}

	private getExistingConnection() {
		const { shapeId, portId } = this.info!
		return getNodePortConnections(this.editor, shapeId).find((c) => c.ownPortId === portId)
	}

	override onPointerMove(info: TLPointerEventInfo): void {
		// below the drag threshold, we treat the pointer as a click (see onPointerUp)
		if (!this.editor.inputs.getIsDragging()) return

		const { shapeId, portId, terminal: connectingTerminal } = this.info!
		const existingConnection = this.getExistingConnection()

		// input ports only accept a single connection, so dragging from a connected input port moves
		// the existing connection rather than creating a new one
		if (connectingTerminal === 'end' && existingConnection) {
			this.parent.transition('dragging_handle', {
				...info,
				target: 'handle',
				shape: this.editor.getShape(existingConnection.connectionId)!,
				handle: this.editor
					.getShapeHandles(existingConnection.connectionId)!
					.find((h) => h.id === connectingTerminal),
			})
			return
		}

		const creatingMarkId = this.editor.markHistoryStoppingPoint()
		const connectionShapeId = createShapeId()
		const draggingTerminal = connectingTerminal === 'start' ? 'end' : 'start'
		const { x, y } = this.editor.inputs.getCurrentPagePoint()

		this.editor.createShape({
			type: 'connection',
			id: connectionShapeId,
			x,
			y,
			index: getNextConnectionIndex(this.editor),
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
			},
		})
		createOrUpdateConnectionBinding(this.editor, connectionShapeId, shapeId, {
			portId,
			terminal: connectingTerminal,
		})

		const handle = this.editor
			.getShapeHandles(connectionShapeId)
			?.find((h) => h.id === draggingTerminal)

		this.parent.transition('dragging_handle', {
			...info,
			target: 'handle',
			shape: this.editor.getShape(connectionShapeId)!,
			handle: handle!,
			creatingMarkId,
			isCreating: true,
		})
	}

	override onPointerUp(info: TLPointerEventInfo): void {
		this.onClick()
		this.parent.transition('idle', info)
	}

	private onClick() {
		if (this.info?.terminal !== 'start') return
		if (this.getExistingConnection()) return

		const { shapeId, portId } = this.info
		const bounds = this.editor.getShapePageBounds(shapeId)
		if (!bounds) return

		// dangle a new connection off to the right of the source node, then let the user pick a
		// node to create at its end
		const targetPositionInPageSpace = {
			x: bounds.right + DEFAULT_NODE_SPACING_PX,
			y: bounds.top,
		}

		const connectionShapeId = createShapeId()
		this.editor.createShape({
			type: 'connection',
			id: connectionShapeId,
			x: bounds.right,
			y: bounds.top,
			index: getNextConnectionIndex(this.editor),
		})
		createOrUpdateConnectionBinding(this.editor, connectionShapeId, shapeId, {
			portId,
			terminal: 'start',
		})

		const targetPositionInConnectionSpace = this.editor
			.getPointInShapeSpace(connectionShapeId, targetPositionInPageSpace)
			.addXY(0, NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX + NODE_ROW_HEIGHT_PX / 2)

		this.editor.updateShape({
			id: connectionShapeId,
			type: 'connection',
			props: {
				end: targetPositionInConnectionSpace.toJson(),
			},
		})

		onCanvasComponentPickerState.set(this.editor, {
			connectionShapeId,
			location: 'end',
			onPick: (nodeType, terminalInPageSpace) => {
				createNodeAtConnectionEnd(this.editor, connectionShapeId, nodeType, terminalInPageSpace)
			},
			onClose: () => deleteConnectionIfIncomplete(this.editor, connectionShapeId),
		})
	}
}
