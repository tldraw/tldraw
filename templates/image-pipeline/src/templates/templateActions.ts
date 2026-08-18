import { createBindingId, createShapeId, Editor, TLShapeId, VecModel } from 'tldraw'
import { getNodePortConnections } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { NodeType } from '../nodes/nodeTypes'
import {
	PipelineTemplate,
	saveTemplate,
	SerializedTemplateConnection,
	SerializedTemplateNode,
} from './templateState'

/**
 * Save the currently selected nodes and their inter-connections as a
 * reusable template.
 */
export function saveSelectionAsTemplate(
	editor: Editor,
	name: string,
	description: string
): PipelineTemplate | null {
	const selectedShapes = editor.getSelectedShapes()
	const nodeShapes = selectedShapes.filter((s): s is NodeShape => s.type === 'node')

	if (nodeShapes.length < 2) return null

	// Positions are stored relative to the selection's top-left corner
	const minX = Math.min(...nodeShapes.map((s) => s.x))
	const minY = Math.min(...nodeShapes.map((s) => s.y))

	const selectedIds = new Set<TLShapeId>(nodeShapes.map((s) => s.id))

	const idMap = new Map<TLShapeId, string>()
	const nodes: SerializedTemplateNode[] = nodeShapes.map((s, i) => {
		const localId = `n${i}`
		idMap.set(s.id, localId)
		return {
			localId,
			nodeType: s.props.node as NodeType,
			relativeX: s.x - minX,
			relativeY: s.y - minY,
		}
	})

	// Only connections entirely within the selection are saved
	const connections: SerializedTemplateConnection[] = []
	const seenConnections = new Set<string>()

	for (const shape of nodeShapes) {
		const portConns = getNodePortConnections(editor, shape)
		for (const conn of portConns) {
			if (!selectedIds.has(conn.connectedShapeId)) continue
			// Each connection is seen from both ends; record it once from its start
			if (conn.terminal !== 'start') continue
			const key = conn.connectionId
			if (seenConnections.has(key)) continue
			seenConnections.add(key)

			const fromLocal = idMap.get(shape.id)
			const toLocal = idMap.get(conn.connectedShapeId)
			if (!fromLocal || !toLocal) continue

			connections.push({
				fromLocalId: fromLocal,
				fromPortId: conn.ownPortId,
				toLocalId: toLocal,
				toPortId: conn.connectedPortId,
			})
		}
	}

	const template: PipelineTemplate = {
		id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		name,
		description,
		createdAt: Date.now(),
		nodes,
		connections,
	}

	saveTemplate(template)
	return template
}

/**
 * Stamp a saved template onto the canvas at the given position.
 */
export function stampTemplate(editor: Editor, template: PipelineTemplate, position: VecModel) {
	editor.markHistoryStoppingPoint('stamp template')

	const localIdToShapeId = new Map<string, TLShapeId>()

	editor.run(() => {
		for (const tNode of template.nodes) {
			const shapeId = createShapeId()
			localIdToShapeId.set(tNode.localId, shapeId)

			editor.createShape({
				id: shapeId,
				type: 'node',
				x: position.x + tNode.relativeX,
				y: position.y + tNode.relativeY,
				props: { node: tNode.nodeType },
			})
		}

		for (const conn of template.connections) {
			const fromId = localIdToShapeId.get(conn.fromLocalId)
			const toId = localIdToShapeId.get(conn.toLocalId)
			if (!fromId || !toId) continue

			const connectionId = createShapeId()
			editor.createShape({
				id: connectionId,
				type: 'connection',
				props: {
					start: { x: 0, y: 0 },
					end: { x: 100, y: 0 },
				},
			})

			editor.createBinding({
				id: createBindingId(),
				type: 'connection',
				fromId: connectionId,
				toId: fromId,
				props: {
					terminal: 'start',
					portId: conn.fromPortId,
				},
			})

			editor.createBinding({
				id: createBindingId(),
				type: 'connection',
				fromId: connectionId,
				toId: toId,
				props: {
					terminal: 'end',
					portId: conn.toPortId,
				},
			})
		}

		editor.select(...Array.from(localIdToShapeId.values()))
	})
}
