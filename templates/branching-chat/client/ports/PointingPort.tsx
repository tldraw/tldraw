import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil.tsx'
import { ConnectionShape } from '../connection/ConnectionShapeUtil.tsx'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom.tsx'
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from '../constants.tsx'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts.tsx'
import { PortId } from './Port.tsx'

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

	override onPointerMove(info: TLPointerEventInfo): void {
		// isDragging is true if the user has moved the pointer sufficiently. below this threshold,
		// we treat the pointer as a click.
		if (this.editor.inputs.isDragging) {
			const allowsMultipleConnections = this.info?.terminal === 'start'
			const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId).find(
				(c) => c.ownPortId === this.info!.portId
			)

			// If we can't have multiple connections and one already exists, move the existing
			// connection by transitioning to dragging the existing connection's handle.
			if (!allowsMultipleConnections && hasExistingConnection) {
				this.parent.transition('dragging_handle', {
					...info,
					target: 'handle',
					shape: this.editor.getShape(hasExistingConnection.connectionId)!,
					handle: this.editor
						.getShapeHandles(hasExistingConnection.connectionId)!
						.find((h) => h.id === this.info!.terminal),
				})
				return
			}

			// Otherwise, create a new connection, and start dragging that connection's handle instead.
			const creatingMarkId = this.editor.markHistoryStoppingPoint()
			const connectionShapeId = createShapeId()
			const connectingTerminal = this.info!.terminal
			const draggingTerminal = connectingTerminal === 'start' ? 'end' : 'start'

			this.editor.createShape({
				type: 'connection',
				id: connectionShapeId,
				x: this.editor.inputs.currentPagePoint.x,
				y: this.editor.inputs.currentPagePoint.y,
				index: getNextConnectionIndex(this.editor),
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			})

			// bind one end of the connection to the port the user pointer-down'd on.
			createOrUpdateConnectionBinding(this.editor, connectionShapeId, this.info!.shapeId, {
				portId: this.info!.portId,
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
		const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId).find(
			(c) => c.ownPortId === this.info!.portId
		)
		if (hasExistingConnection) return

		// Get the bounds of the source node
		const bounds = this.editor.getShapePageBounds(this.info!.shapeId)
		if (!bounds) return

		// Calculate position for new node to the right of the source node
		const targetPositionInPageSpace = {
			x: bounds.midX,
			y: bounds.bottom + DEFAULT_NODE_SPACING_PX,
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
		createOrUpdateConnectionBinding(this.editor, connectionShapeId, this.info!.shapeId, {
			portId: this.info!.portId,
			terminal: 'start',
		})

		// Position the connection end point where the new node will be
		const targetPositionInConnectionSpace = this.editor
			.getPointInShapeSpace(connectionShapeId, targetPositionInPageSpace)
			.addXY(0, 200)

		this.editor.updateShape<ConnectionShape>({
			id: connectionShapeId,
			type: 'connection',
			props: {
				end: targetPositionInConnectionSpace.toJson(),
			},
		})

		const newNodeId = createShapeId()
		this.editor.createShape({
			type: 'node',
			id: newNodeId,
			x: targetPositionInPageSpace.x - NODE_WIDTH_PX / 2,
			y: targetPositionInPageSpace.y + 100,
			props: {
				node: { type: 'message', userMessage: '', assistantMessage: '' },
			},
		})
		this.editor.select(newNodeId)

		// Position the node so its input port aligns with the connection end
		const ports = getNodePorts(this.editor, newNodeId)
		const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
		if (firstInputPort) {
			this.editor.updateShape({
				id: newNodeId,
				type: 'node',
				x: targetPositionInPageSpace.x - firstInputPort.x,
				y: targetPositionInPageSpace.y - firstInputPort.y,
			})

			// Connect the new node to the connection
			createOrUpdateConnectionBinding(this.editor, connectionShapeId, newNodeId, {
				portId: firstInputPort.id,
				terminal: 'end',
			})
		}
	}
}
