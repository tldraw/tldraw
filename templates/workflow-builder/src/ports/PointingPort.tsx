import { createShapeId, StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'
import { InsertComponentDialog } from '../components/InsertComponentDialog'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import { getNodePortConnections, getNodePorts } from '../nodes/NodeShapeUtil'
import { NodeType } from '../nodes/nodeTypes.tsx'
import { PortId } from './portState'

interface PointingPortInfo {
	shapeId: TLShapeId
	portId: PortId
	terminal: 'start' | 'end'
}

// Helper function to create a node selection dialog for click-to-create
function createNodeSelectionDialogForClick(
	sourceShapeId: TLShapeId,
	sourcePortId: PortId,
	nodePosition: { x: number; y: number },
	editor: any
) {
	return function NodeSelectionDialog({ onClose }: { onClose: () => void }) {
		const handleNodeSelected = (nodeType: NodeType) => {
			const newNodeId = createShapeId()
			const newConnectionId = createShapeId()

			// Create the new node with selected type
			editor.createShape({
				type: 'node',
				id: newNodeId,
				x: nodePosition.x,
				y: nodePosition.y,
				props: {
					node: nodeType,
				},
			})

			// Get ports for the newly created node
			const ports = getNodePorts(editor, newNodeId)
			const firstInputPort = Object.values(ports).find((p: any) => p.terminal === 'end')

			if (firstInputPort) {
				// Create the connection shape
				editor.createShape({
					type: 'connection',
					id: newConnectionId,
					x: nodePosition.x + 100,
					y: nodePosition.y,
					index: getNextConnectionIndex(editor),
				})

				// Create bindings for both ends of the connection
				createOrUpdateConnectionBinding(editor, newConnectionId, sourceShapeId, {
					portId: sourcePortId,
					terminal: 'start',
				})
				createOrUpdateConnectionBinding(editor, newConnectionId, newNodeId, {
					portId: (firstInputPort as any).id,
					terminal: 'end',
				})
			}

			onClose()
		}

		return <InsertComponentDialog onClose={onClose} onNodeSelected={handleNodeSelected} />
	}
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
		const hasExistingConnection = getNodePortConnections(this.editor, this.info!.shapeId)[
			this.info!.portId
		]
		if (hasExistingConnection) return

		// Get the global dialog helpers (we'll need to import this)
		const dialogHelpersRef = (globalThis as any).dialogHelpersRef
		if (!dialogHelpersRef) return

		const bounds = this.editor.getShapePageBounds(this.info!.shapeId)
		if (!bounds) return

		// Calculate position for new node
		const nodePosition = {
			x: bounds.right + 100,
			y: bounds.top,
		}

		// Create dialog component with closure and show it
		const DialogComponent = createNodeSelectionDialogForClick(
			this.info!.shapeId,
			this.info!.portId,
			nodePosition,
			this.editor
		)

		dialogHelpersRef.addDialog({
			component: DialogComponent,
		})
	}
}
