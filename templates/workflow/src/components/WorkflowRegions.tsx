import classNames from 'classnames'
import { useRef } from 'react'
import {
	Box,
	BoxModel,
	Editor,
	TLShapeId,
	useEditor,
	usePassThroughWheelEvents,
	useQuickReactor,
	useValue,
} from 'tldraw'
import { executionState, startExecution, stopExecution } from '../execution/executionState'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodePortConnections } from '../nodes/nodePorts'
import { PlayIcon } from './icons/PlayIcon'
import { StopIcon } from './icons/StopIcon'

/**
 * A workflow region is a set of connected shapes. Each shape should only belong to a single
 * workflow region: connecting two shapes from separate regions will cause them to be merged into a
 * single region.
 */
interface WorkflowRegion {
	bounds: BoxModel
	nodes: Set<TLShapeId>
	startingNodes: Set<TLShapeId>
}

// Find all workflow regions by traversing connected nodes in the canvas
function findWorkflowRegions(editor: Editor): WorkflowRegion[] {
	const workflowSetsByShape = new Map<TLShapeId, Set<TLShapeId>>()
	const visitedNodes = new Set<TLShapeId>()

	// Recursively visit connected nodes to build workflow regions
	function visit(node: NodeShape, currentWorkflow?: Set<TLShapeId>) {
		if (visitedNodes.has(node.id)) return
		visitedNodes.add(node.id)

		if (!currentWorkflow) {
			currentWorkflow = new Set()
		}

		workflowSetsByShape.set(node.id, currentWorkflow)
		currentWorkflow.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			visit(editor.getShape(connection.connectedShapeId) as NodeShape, currentWorkflow)
		}
	}

	// Start visiting from all nodes in the current page
	for (const node of editor.getCurrentPageShapes()) {
		if (editor.isShapeOfType<NodeShape>(node, 'node')) {
			visit(node)
		}
	}

	// Convert workflow sets to Workflow objects with bounds and starting nodes
	return Array.from(new Set(workflowSetsByShape.values()), (nodeIds): WorkflowRegion => {
		let bounds: Box | null = null
		const startingNodes = new Set<TLShapeId>()

		for (const nodeId of nodeIds) {
			// Check if this node has input connections (end ports)
			// If not, it's a starting node
			const hasInputs = getNodePortConnections(editor, nodeId).some((c) => c.terminal === 'end')
			if (!hasInputs) {
				startingNodes.add(nodeId)
			}

			// Get the node's bounds in page space
			const nodeBounds = editor.getShapePageBounds(nodeId)
			if (!nodeBounds) continue

			// Union all node bounds to create workflow bounds
			if (bounds) {
				bounds.union(nodeBounds)
			} else {
				bounds = Box.From(nodeBounds)
			}
		}

		return {
			bounds: bounds!.expandBy(30), // Add padding around the workflow
			nodes: nodeIds,
			startingNodes,
		}
	}).filter((w) => w.nodes.size > 1) // Only show workflows with multiple nodes
}

// Component that renders workflow regions as overlays on the canvas
export function WorkflowRegions() {
	const editor = useEditor()
	// Reactively compute workflows when the canvas changes
	const workflows = useValue('workflows', () => findWorkflowRegions(editor), [editor])

	return workflows.map((workflow, i) => <WorkflowRegion key={i} workflow={workflow} />)
}

// Individual workflow region component with execution controls
function WorkflowRegion({ workflow }: { workflow: WorkflowRegion }) {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	// Check if this workflow is currently executing
	const isExecuting = useValue(
		'isExecuting',
		() => {
			const execution = executionState.get(editor).runningGraph
			if (!execution) return false

			// Check if any node in this workflow is executing
			for (const nodeId of workflow.nodes) {
				if (execution.getNodeStatus(nodeId) === 'executing') {
					return true
				}
			}

			return false
		},
		[editor, workflow]
	)

	// Reactively position the workflow region based on camera and workflow bounds
	useQuickReactor(
		'WorkflowRegion positioning',
		() => {
			if (!ref.current) return
			const camera = editor.getCamera()

			// Hide regions when zoomed out too far
			if (camera.z < 0.25) {
				ref.current.style.display = 'none'
				return
			} else {
				ref.current.style.display = 'block'
			}

			// Transform workflow bounds from page space to viewport space
			const position = editor.pageToViewport(workflow.bounds)
			ref.current.style.transform = `translate(${position.x}px, ${position.y}px)`
			// Scale the region based on camera zoom
			ref.current.style.width = `${workflow.bounds.w * camera.z}px`
			ref.current.style.height = `${workflow.bounds.h * camera.z}px`
		},
		[workflow, editor]
	)

	usePassThroughWheelEvents(ref)

	return (
		<div
			className={classNames('WorkflowRegion', { WorkflowRegion_executing: isExecuting })}
			ref={ref}
		>
			<button
				className="WorkflowRegion-button"
				onPointerDown={editor.markEventAsHandled}
				onClick={() => {
					if (isExecuting) {
						// Stop execution if currently running
						stopExecution(editor)
					} else {
						// Start execution from the workflow's starting nodes
						startExecution(editor, workflow.startingNodes)
					}
				}}
			>
				{isExecuting ? <StopIcon /> : <PlayIcon />}
			</button>
		</div>
	)
}
