import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import { getNodePortConnections, getNodePorts } from '../nodes/NodeShapeUtil'
import { PortId } from './portState'

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
			const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId)[
				this.info!.portId
			]

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

			console.log({
				shape: this.editor.getShape(connectionShapeId),
				handle,
				handles: this.editor.getShapeHandles(connectionShapeId),
				info: this.info,
			})

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
		console.log('onClick', this.info)
		if (this.info?.terminal !== 'start') return
		const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId)[
			this.info!.portId
		]
		if (hasExistingConnection) return
		// no existing connection, so create a new connection and shape:
		const newNodeId = createShapeId()
		const newConnectionId = createShapeId()

		const bounds = this.editor.getShapePageBounds(this.info!.shapeId)
		if (!bounds) return

		this.editor.createShape({
			type: 'node',
			id: newNodeId,
			x: bounds.right + 100,
			y: bounds.top,
		})

		const ports = getNodePorts(this.editor, newNodeId)
		const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
		if (!firstInputPort) return

		this.editor.createShape({
			type: 'connection',
			id: newConnectionId,
			x: bounds.right + 200,
			y: bounds.top,
			index: getNextConnectionIndex(this.editor),
		})

		createOrUpdateConnectionBinding(this.editor, newConnectionId, this.info!.shapeId, {
			portId: this.info!.portId,
			terminal: 'start',
		})
		createOrUpdateConnectionBinding(this.editor, newConnectionId, newNodeId, {
			portId: firstInputPort.id,
			terminal: 'end',
		})
	}
}
