import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil.tsx'
import { createNodeAtConnectionEnd } from '../connection/ConnectionShapeUtil.tsx'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom.tsx'
import { DEFAULT_NODE_SPACING_PX } from '../constants.tsx'
import { getNodePortConnections } from '../nodes/nodePorts.tsx'
import { PortId } from './Port.tsx'

interface PointingPortInfo {
	shapeId: TLShapeId
	portId: PortId
	terminal: 'start' | 'end'
}

// Child state of the select tool: entered on pointer down over a port. A drag creates (or moves) a
// connection; a click on an output port spawns a connected node below.
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
		if (!this.editor.inputs.getIsDragging()) return
		const { shapeId, portId, terminal: connectingTerminal } = this.info!

		// Only 'start' ports (outputs) can have multiple connections; dragging from an already
		// connected input moves the existing connection instead of creating a new one.
		const existingConnection = this.getExistingConnection()
		if (connectingTerminal !== 'start' && existingConnection) {
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
		const pagePoint = this.editor.inputs.getCurrentPagePoint()

		this.editor.createShape({
			type: 'connection',
			id: connectionShapeId,
			x: pagePoint.x,
			y: pagePoint.y,
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
		// still here on pointer up means we never started dragging, so treat it as a click
		this.onClick()
		this.parent.transition('idle', info)
	}

	private onClick() {
		if (this.info?.terminal !== 'start') return
		if (this.getExistingConnection()) return
		const { shapeId, portId } = this.info

		const bounds = this.editor.getShapePageBounds(shapeId)
		if (!bounds) return

		const targetPositionInPageSpace = {
			x: bounds.midX,
			y: bounds.bottom + DEFAULT_NODE_SPACING_PX,
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
			.addXY(0, 200)
		this.editor.updateShape({
			id: connectionShapeId,
			type: 'connection',
			props: {
				end: targetPositionInConnectionSpace.toJson(),
			},
		})

		createNodeAtConnectionEnd(this.editor, connectionShapeId, targetPositionInPageSpace)
	}
}
