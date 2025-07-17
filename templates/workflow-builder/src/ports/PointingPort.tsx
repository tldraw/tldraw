import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindings,
} from '../connection/ConnectionBindingUtil'
import { ConnectionShape } from '../connection/ConnectionShapeUtil.tsx'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import {
	DEFAULT_NODE_SPACING_PX,
	NODE_HEADER_HEIGHT_PX,
	NODE_PORT_OFFSET_Y_PX,
} from '../constants.tsx'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { PortId } from '../ports/Port'
import { onCanvasComponentPickerState } from '../state.tsx'

interface PointingPortInfo {
	shapeId: TLShapeId
	portId: PortId
	terminal: 'start' | 'end'
}

export class PointingPort extends StateNode {
	static override id = 'pointing_port'

	info?: PointingPortInfo

	override onEnter(info: PointingPortInfo): void {
		this.info = info
	}

	override onPointerUp(info: TLPointerEventInfo): void {
		this.onClick()
		this.parent.transition('idle', info)
	}

	override onPointerMove(info: TLPointerEventInfo): void {
		if (this.editor.inputs.isDragging) {
			const allowsMultipleConnections = this.info?.terminal === 'start'
			const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId).find(
				(c) => c.ownPortId === this.info!.portId
			)

			if (!allowsMultipleConnections && hasExistingConnection) {
				// we've got a connection and can't have multiple, so lets move it:
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

			createOrUpdateConnectionBinding(this.editor, connectionShapeId, this.info!.shapeId, {
				portId: this.info!.portId,
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
	}

	private onClick() {
		if (this.info?.terminal !== 'start') return
		const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId).find(
			(c) => c.ownPortId === this.info!.portId
		)
		if (hasExistingConnection) return

		const bounds = this.editor.getShapePageBounds(this.info!.shapeId)
		if (!bounds) return

		// Calculate position for new node
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

		createOrUpdateConnectionBinding(this.editor, connectionShapeId, this.info!.shapeId, {
			portId: this.info!.portId,
			terminal: 'start',
		})

		const targetPositionInConnectionSpace = this.editor
			.getPointInShapeSpace(connectionShapeId, targetPositionInPageSpace)
			.addXY(0, NODE_HEADER_HEIGHT_PX + NODE_PORT_OFFSET_Y_PX)

		this.editor.updateShape<ConnectionShape>({
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
				const newNodeId = createShapeId()
				this.editor.createShape({
					type: 'node',
					id: newNodeId,
					x: terminalInPageSpace.x,
					y: terminalInPageSpace.y,
					props: {
						node: nodeType,
					},
				})
				this.editor.select(newNodeId)

				const ports = getNodePorts(this.editor, newNodeId)
				const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
				if (firstInputPort) {
					this.editor.updateShape({
						id: newNodeId,
						type: 'node',
						x: terminalInPageSpace.x - firstInputPort.x,
						y: terminalInPageSpace.y - firstInputPort.y,
					})

					createOrUpdateConnectionBinding(this.editor, connectionShapeId, newNodeId, {
						portId: firstInputPort.id,
						terminal: 'end',
					})
				}
			},
			onClose: () => {
				const connection = this.editor.getShape(connectionShapeId)
				if (!connection || !this.editor.isShapeOfType<ConnectionShape>(connection, 'connection'))
					return

				const bindings = getConnectionBindings(this.editor, connection)
				if (!bindings.start || !bindings.end) {
					this.editor.deleteShapes([connection.id])
				}
			},
		})
	}
}
