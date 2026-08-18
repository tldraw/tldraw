import { AtomMap, Editor, TLShapeId } from 'tldraw'
import {
	getNodeOutputPortInfo,
	getNodePortConnections,
	NodePortConnection,
} from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { executeNode } from '../nodes/nodeTypes'
import { ExecutionResult, STOP_EXECUTION } from '../nodes/types/shared'

interface PendingExecutionGraphNode {
	readonly state: 'waiting' | 'executing'
	readonly shape: NodeShape
	readonly connections: NodePortConnection[]
}
interface ExecutedExecutionGraphNode {
	readonly state: 'executed'
	readonly shape: NodeShape
	readonly connections: NodePortConnection[]
	readonly outputs: ExecutionResult
}

type ExecutionGraphNode = PendingExecutionGraphNode | ExecutedExecutionGraphNode

/**
 * Executes a workflow: starting nodes run in parallel, and each node runs once all of its inputs
 * have produced a value.
 */
export class ExecutionGraph {
	// Snapshotted at construction so the graph is frozen in time once execution starts.
	private readonly nodesById = new AtomMap<TLShapeId, ExecutionGraphNode>('node by id')

	constructor(
		private readonly editor: Editor,
		private readonly startingNodeIds: Set<TLShapeId>
	) {
		const toVisit = Array.from(startingNodeIds)
		while (toVisit.length > 0) {
			const nodeId = toVisit.pop()!
			if (this.nodesById.has(nodeId)) continue

			const node = this.editor.getShape(nodeId)
			if (!node || !this.editor.isShapeOfType(node, 'node')) continue

			const connections = getNodePortConnections(this.editor, node)
			this.nodesById.set(nodeId, { state: 'waiting', shape: node, connections })

			for (const connection of connections) {
				if (connection.terminal !== 'start') continue
				toVisit.push(connection.connectedShapeId)
			}
		}
	}

	private state: 'waiting' | 'executing' | 'stopped' = 'waiting'

	async execute() {
		if (this.state !== 'waiting') {
			throw new Error('ExecutionGraph can only be executed once')
		}

		this.state = 'executing'
		try {
			await Promise.all(
				Array.from(this.startingNodeIds, (nodeId) => this.executeNodeIfReady(nodeId))
			)
		} finally {
			this.state = 'stopped'
		}
	}

	stop() {
		this.state = 'stopped'
	}

	private async executeNodeIfReady(nodeId: TLShapeId) {
		if (this.state !== 'executing') return

		const node = this.nodesById.get(nodeId)
		if (!node || node.state !== 'waiting') return

		// Bail if any input dependency hasn't run yet, or produced STOP_EXECUTION (a disabled
		// conditional branch). Dependencies outside this graph use their cached value from last run.
		const inputs: Record<string, number> = {}
		for (const connection of node.connections) {
			if (connection.terminal !== 'end') continue

			const dependency = this.nodesById.get(connection.connectedShapeId)
			if (dependency) {
				if (dependency.state !== 'executed') return
				const output = dependency.outputs[connection.connectedPortId]
				if (output === STOP_EXECUTION) return
				inputs[connection.ownPortId] = output
			} else {
				const outputs = getNodeOutputPortInfo(this.editor, connection.connectedShapeId)
				const output = outputs[connection.connectedPortId]
				if (output.value === STOP_EXECUTION) return
				inputs[connection.ownPortId] = output.value
			}
		}

		this.nodesById.set(nodeId, { ...node, state: 'executing' })

		this.editor.updateShape({
			id: nodeId,
			type: node.shape.type,
			props: { isOutOfDate: true },
		})
		const outputs = await executeNode(this.editor, node.shape, inputs)
		this.editor.updateShape({
			id: nodeId,
			type: node.shape.type,
			props: { isOutOfDate: false },
		})

		this.nodesById.set(nodeId, { ...node, state: 'executed', outputs })

		await Promise.all(
			node.connections
				.filter((connection) => connection.terminal === 'start')
				.map((connection) => this.executeNodeIfReady(connection.connectedShapeId))
		)
	}

	getNodeStatus(nodeId: TLShapeId) {
		return this.nodesById.get(nodeId)?.state
	}
}
