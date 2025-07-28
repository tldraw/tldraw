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

export class ExecutionGraph {
	/**
	 * A map of node objects by their ID. We use this instead of looking them up from the editor so
	 * they're frozen in time once you start executing.
	 */
	private readonly nodesById = new AtomMap<TLShapeId, ExecutionGraphNode>('node by id')

	constructor(
		private readonly editor: Editor,
		private readonly startingNodeId: TLShapeId
	) {
		const toVisit = [startingNodeId]

		while (toVisit.length > 0) {
			const nodeId = toVisit.pop()!
			if (this.nodesById.has(nodeId)) continue

			const node = this.editor.getShape(nodeId)
			if (!node || !this.editor.isShapeOfType<NodeShape>(node, 'node')) continue

			const connections = getNodePortConnections(this.editor, node)

			this.nodesById.set(nodeId, {
				state: 'waiting',
				shape: node,
				connections,
			})

			for (const connection of Object.values(connections)) {
				if (!connection || connection.terminal !== 'start') continue

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
			await this.executeNodeIfReady(this.startingNodeId)
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

		const inputs: Record<string, number> = {}

		for (const [portId, connection] of Object.entries(node.connections)) {
			if (!connection || connection.terminal !== 'end') continue

			const dependency = this.nodesById.get(connection.connectedShapeId)
			if (dependency) {
				if (dependency.state !== 'executed') {
					// if one of the dependencies of this shape hasn't executed, we can't execute it.
					return
				}

				const output = dependency.outputs[connection.connectedPortId]
				if (output === STOP_EXECUTION) {
					// we use STOP_EXECUTION outputs for conditional execution. it means that this
					// branch should not continue.
					return
				}

				inputs[portId] = output
			} else {
				// if the dependency isn't in nodesById, it's not involved in this execution. We
				// don't need to wait for it. We should retrieve it's cached value from last time:
				const outputs = getNodeOutputPortValues(this.editor, connection.connectedShapeId)
				const output = outputs[connection.connectedPortId]

				if (output === STOP_EXECUTION) {
					// it still might be conditional though, and this branch may be disabled:
					return
				}

				inputs[portId] = output
			}
		}

		// all dependencies are ready and we have their outputs!
		this.nodesById.set(nodeId, {
			...node,
			state: 'executing',
		})

		// In a real app, you'd probably have your nodes do a "real" execution here. For simplicity,
		// we're going to re-use our synchronous computeNodeOutput, but we'll add a delay so you can
		// see what async execution might look like.
		await new Promise((resolve) => setTimeout(resolve, 2000))
		const outputs = computeNodeOutput(node.shape.props.node, inputs)

		this.nodesById.set(nodeId, {
			...node,
			state: 'executed',
			outputs,
		})

		// now that we've executed this node, we can see if any of its dependents are ready:
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
