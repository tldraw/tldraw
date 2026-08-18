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
import { getNodePortConnections } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
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

function findWorkflowRegions(editor: Editor): WorkflowRegion[] {
	const workflowSetsByShape = new Map<TLShapeId, Set<TLShapeId>>()
	const visitedNodes = new Set<TLShapeId>()

	function visit(node: NodeShape, currentWorkflow: Set<TLShapeId> = new Set()) {
		if (visitedNodes.has(node.id)) return
		visitedNodes.add(node.id)

		workflowSetsByShape.set(node.id, currentWorkflow)
		currentWorkflow.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			visit(editor.getShape(connection.connectedShapeId) as NodeShape, currentWorkflow)
		}
	}

	for (const node of editor.getCurrentPageShapes()) {
		if (editor.isShapeOfType(node, 'node')) {
			visit(node)
		}
	}

	return Array.from(new Set(workflowSetsByShape.values()), (nodeIds): WorkflowRegion => {
		let bounds: Box | null = null
		const startingNodes = new Set<TLShapeId>()

		for (const nodeId of nodeIds) {
			// nodes with no inputs are where execution starts
			const hasInputs = getNodePortConnections(editor, nodeId).some((c) => c.terminal === 'end')
			if (!hasInputs) {
				startingNodes.add(nodeId)
			}

			const nodeBounds = editor.getShapePageBounds(nodeId)
			if (!nodeBounds) continue

			if (bounds) {
				bounds.union(nodeBounds)
			} else {
				bounds = Box.From(nodeBounds)
			}
		}

		return {
			bounds: bounds!.expandBy(30),
			nodes: nodeIds,
			startingNodes,
		}
	}).filter((w) => w.nodes.size > 1) // a lone node isn't a workflow
}

export function WorkflowRegions() {
	const editor = useEditor()
	const workflows = useValue('workflows', () => findWorkflowRegions(editor), [editor])

	return workflows.map((workflow, i) => <WorkflowRegion key={i} workflow={workflow} />)
}

function WorkflowRegion({ workflow }: { workflow: WorkflowRegion }) {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	const isExecuting = useValue(
		'isExecuting',
		() => {
			const execution = executionState.get(editor).runningGraph
			if (!execution) return false
			return Array.from(workflow.nodes).some(
				(nodeId) => execution.getNodeStatus(nodeId) === 'executing'
			)
		},
		[editor, workflow]
	)

	// position the region over its bounds in viewport space, hiding it when zoomed far out
	useQuickReactor(
		'WorkflowRegion positioning',
		() => {
			if (!ref.current) return
			const camera = editor.getCamera()

			if (camera.z < 0.25) {
				ref.current.style.display = 'none'
				return
			}
			ref.current.style.display = 'block'

			const position = editor.pageToViewport(workflow.bounds)
			ref.current.style.transform = `translate(${position.x}px, ${position.y}px)`
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
						stopExecution(editor)
					} else {
						startExecution(editor, workflow.startingNodes)
					}
				}}
			>
				{isExecuting ? <StopIcon /> : <PlayIcon />}
			</button>
		</div>
	)
}
