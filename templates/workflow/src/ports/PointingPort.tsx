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

// Information about which port is being pointed at
interface PointingPortInfo {
	shapeId: TLShapeId
	portId: PortId
	terminal: 'start' | 'end'
}

// State node that handles pointing at ports to create connections
// This will be added to tldraw's state machine to customize the built-in select tool
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
		// isDragging is true if the user has moved the pointer sufficiently. below this threshold,
		// we treat the pointer as a click.
		if (!this.editor.inputs.getIsDragging()) return

		const { shapeId, portId, terminal: connectingTerminal } = this.info!
		const existingConnection = this.getExistingConnection()

		// If we can't have multiple connections and one already exists, move the existing
		// connection by transitioning to dragging the existing connection's handle.
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

		// Otherwise, create a new connection, and start dragging that connection's handle instead.
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

		// bind one end of the connection to the port the user pointer-down'd on.
		createOrUpdateConnectionBinding(this.editor, connectionShapeId, shapeId, {
			portId,
			terminal: connectingTerminal,
		})

		// transition to dragging the other end of the connection:
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
		// if we get a pointer up while we're still in this state, it means we haven't transitioned
		// into a dragging state so we'll treat this as a click:
		this.onClick()
		// switch back to the idle state when we're done:
		this.parent.transition('idle', info)
	}

	// Handle clicks on ports (without dragging)
	private onClick() {
		// Only handle clicks on start ports (output ports)
		if (this.info?.terminal !== 'start') return

		// Don't create new connections if one already exists
		if (this.getExistingConnection()) return

		// Get the bounds of the source node
		const { shapeId, portId } = this.info
		const bounds = this.editor.getShapePageBounds(shapeId)
		if (!bounds) return

		// Calculate position for new node to the right of the source node
		const targetPositionInPageSpace = {
			x: bounds.right + DEFAULT_NODE_SPACING_PX,
			y: bounds.top,
		}

		// Create a connection shape
		const connectionShapeId = createShapeId()
		this.editor.createShape({
			type: 'connection',
			id: connectionShapeId,
			x: bounds.right,
			y: bounds.top,
			index: getNextConnectionIndex(this.editor),
		})

		// Bind the connection to the source port
		createOrUpdateConnectionBinding(this.editor, connectionShapeId, shapeId, {
			portId,
			terminal: 'start',
		})

		// Position the connection end point where the new node will be
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

		// Open the component picker to let the user choose what node to create
		onCanvasComponentPickerState.set(this.editor, {
			connectionShapeId,
			location: 'end',
			onPick: (nodeType, terminalInPageSpace) => {
				// Create the new node at the specified position
				createNodeAtConnectionEnd(this.editor, connectionShapeId, nodeType, terminalInPageSpace)
			},
			// If the connection isn't fully connected, delete it
			onClose: () => deleteConnectionIfIncomplete(this.editor, connectionShapeId),
		})
	}
}
