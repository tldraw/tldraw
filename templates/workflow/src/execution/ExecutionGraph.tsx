import { AtomMap, Editor, TLShapeId } from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import {
	getNodeOutputPortValues,
	getNodePortConnections,
	NodePortConnection,
} from '../nodes/nodePorts'
import { computeNodeOutput } from '../nodes/nodeTypes'
import { STOP_EXECUTION } from '../nodes/types/shared'

interface PendingExecutionGraphNode {
	readonly state: 'waiting' | 'executing'
	readonly shape: NodeShape
	readonly connections: NodePortConnection[]
}
interface ExecutedExecutionGraphNode {
	readonly state: 'executed'
	readonly shape: NodeShape
	readonly connections: NodePortConnection[]
	readonly outputs: Record<string, number | STOP_EXECUTION>
}

type ExecutionGraphNode = PendingExecutionGraphNode | ExecutedExecutionGraphNode

// This class manages the execution of a workflow by traversing connected nodes
export class ExecutionGraph {
	/**
	 * A map of node objects by their ID. We use this instead of looking them up from the editor so
	 * they're frozen in time once you start executing.
	 */
	private readonly nodesById = new AtomMap<TLShapeId, ExecutionGraphNode>('node by id')

	constructor(
		private readonly editor: Editor,
		private readonly startingNodeIds: Set<TLShapeId>
	) {
		const toVisit = Array.from(startingNodeIds)

		// Build the execution graph by traversing all connected nodes
		while (toVisit.length > 0) {
			const nodeId = toVisit.pop()!
			if (this.nodesById.has(nodeId)) continue

			const node = this.editor.getShape(nodeId)
			if (!node || !this.editor.isShapeOfType<NodeShape>(node, 'node')) continue

			const connections = getNodePortConnections(this.editor, node)

			// Add the node to the execution graph
			this.nodesById.set(nodeId, {
				state: 'waiting',
				shape: node,
				connections,
			})

			// Add all upstream nodes (connected to start ports) to the visit list
			for (const connection of Object.values(connections)) {
				if (!connection || connection.terminal !== 'start') continue

				toVisit.push(connection.connectedShapeId)
			}
		}
	}

	private state: 'waiting' | 'executing' | 'stopped' = 'waiting'

	// Execute the workflow starting from the specified nodes
	async execute() {
		if (this.state !== 'waiting') {
			throw new Error('ExecutionGraph can only be executed once')
		}

		this.state = 'executing'
		try {
			// Start execution from all starting nodes in parallel
			const promises = []
			for (const nodeId of this.startingNodeIds) {
				promises.push(this.executeNodeIfReady(nodeId))
			}
			await Promise.all(promises)
		} finally {
			this.state = 'stopped'
		}
	}

	stop() {
		this.state = 'stopped'
	}

	// Execute a node if all its dependencies are ready
	private async executeNodeIfReady(nodeId: TLShapeId) {
		if (this.state !== 'executing') return

		const node = this.nodesById.get(nodeId)
		if (!node || node.state !== 'waiting') return

		const inputs: Record<string, number> = {}

		// Check all input connections (end ports) to see if dependencies are ready
		for (const [portId, connection] of Object.entries(node.connections)) {
			if (!connection || connection.terminal !== 'end') continue

			const dependency = this.nodesById.get(connection.connectedShapeId)
			if (dependency) {
				// If the dependency hasn't executed yet, we can't execute this node
				if (dependency.state !== 'executed') {
					return
				}

				const output = dependency.outputs[connection.connectedPortId]
				if (output === STOP_EXECUTION) {
					// STOP_EXECUTION is used for conditional execution
					// It means this branch should not continue
					return
				}

				inputs[portId] = output
			} else {
				// If the dependency isn't in nodesById, it's not involved in this execution
				// We should retrieve its cached value from last time
				const outputs = getNodeOutputPortValues(this.editor, connection.connectedShapeId)
				const output = outputs[connection.connectedPortId]

				if (output === STOP_EXECUTION) {
					// It still might be conditional though, and this branch may be disabled
					return
				}

				inputs[portId] = output
			}
		}

		// All dependencies are ready and we have their outputs! Start executing this node.
		this.nodesById.set(nodeId, {
			...node,
			state: 'executing',
		})

		// In a real app, you'd probably have your nodes do a "real" execution here. For simplicity,
		// we're going to re-use our synchronous computeNodeOutput, but we'll add a delay so you can
		// see what async execution might look like.
		await new Promise((resolve) => setTimeout(resolve, 2000))
		const outputs = computeNodeOutput(node.shape.props.node, inputs)

		// Mark the node as executed with its outputs
		this.nodesById.set(nodeId, {
			...node,
			state: 'executed',
			outputs,
		})

		// Now that we've executed this node, we can see if any of its dependents are ready
		const executingDependentPromises = []
		for (const connection of Object.values(node.connections)) {
			if (!connection || connection.terminal !== 'start') continue

			executingDependentPromises.push(this.executeNodeIfReady(connection.connectedShapeId))
		}

		await Promise.all(executingDependentPromises)
	}

	getNodeStatus(nodeId: TLShapeId) {
		return this.nodesById.get(nodeId)?.state
	}
}
