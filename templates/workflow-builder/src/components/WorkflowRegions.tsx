import classNames from 'classnames'
import { useRef } from 'react'
import {
	Box,
	BoxModel,
	Editor,
	stopEventPropagation,
	TLShapeId,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodePortConnections } from '../nodes/nodePorts'
import { executionState, startExecution, stopExecution } from '../state'
import { PlayIcon } from './icons/PlayIcon'
import { StopIcon } from './icons/StopIcon'

interface Workflow {
	bounds: BoxModel
	nodes: Set<TLShapeId>
	startingNodes: Set<TLShapeId>
}

function findWorkflows(editor: Editor) {
	const workflowsByShape = new Map<TLShapeId, Set<TLShapeId>>()
	const visitedNodes = new Set<TLShapeId>()

	function visit(node: NodeShape, currentWorkflow?: Set<TLShapeId>) {
		if (visitedNodes.has(node.id)) return
		visitedNodes.add(node.id)

		if (!currentWorkflow) {
			currentWorkflow = new Set()
		}

		workflowsByShape.set(node.id, currentWorkflow)
		currentWorkflow.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			visit(editor.getShape(connection.connectedShapeId) as NodeShape, currentWorkflow)
		}
	}

	for (const node of editor.getCurrentPageShapes()) {
		if (editor.isShapeOfType<NodeShape>(node, 'node')) {
			visit(node)
		}
	}

	return Array.from(new Set(workflowsByShape.values()), (nodeIds): Workflow => {
		let bounds: Box | null = null
		const startingNodes = new Set<TLShapeId>()

		for (const nodeId of nodeIds) {
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
	}).filter((w) => w.nodes.size > 1)
}

export function WorkflowRegions() {
	const editor = useEditor()
	const workflows = useValue('workflows', () => findWorkflows(editor), [editor])

	return workflows.map((workflow, i) => <WorkflowRegion key={i} workflow={workflow} />)
}

function WorkflowRegion({ workflow }: { workflow: Workflow }) {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	const isExecuting = useValue(
		'isExecuting',
		() => {
			const execution = executionState.get(editor).runningGraph
			if (!execution) return false

			for (const nodeId of workflow.nodes) {
				if (execution.getNodeStatus(nodeId) === 'executing') {
					return true
				}
			}

			return false
		},
		[editor, workflow]
	)

	useQuickReactor(
		'WorkflowRegion positioning',
		() => {
			if (!ref.current) return
			const camera = editor.getCamera()

			if (camera.z < 0.25) {
				ref.current.style.display = 'none'
				return
			} else {
				ref.current.style.display = 'block'
			}

			const position = editor.pageToViewport(workflow.bounds)
			ref.current.style.transform = `translate(${position.x}px, ${position.y}px)`
			ref.current.style.width = `${workflow.bounds.w * camera.z}px`
			ref.current.style.height = `${workflow.bounds.h * camera.z}px`
		},
		[workflow, editor]
	)
	return (
		<div
			className={classNames('WorkflowRegion', { WorkflowRegion_executing: isExecuting })}
			ref={ref}
		>
			<button
				className="WorkflowRegion-button"
				onPointerDown={stopEventPropagation}
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
