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

interface PipelineRegion {
	bounds: BoxModel
	nodes: Set<TLShapeId>
	startingNodes: Set<TLShapeId>
}

function findPipelineRegions(editor: Editor): PipelineRegion[] {
	const regionsByShape = new Map<TLShapeId, Set<TLShapeId>>()
	const visitedNodes = new Set<TLShapeId>()

	function visit(node: NodeShape, currentRegion?: Set<TLShapeId>) {
		if (visitedNodes.has(node.id)) return
		visitedNodes.add(node.id)

		if (!currentRegion) {
			currentRegion = new Set()
		}

		regionsByShape.set(node.id, currentRegion)
		currentRegion.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			visit(editor.getShape(connection.connectedShapeId) as NodeShape, currentRegion)
		}
	}

	for (const node of editor.getCurrentPageShapes()) {
		if (editor.isShapeOfType(node, 'node')) {
			visit(node)
		}
	}

	return Array.from(new Set(regionsByShape.values()), (nodeIds): PipelineRegion => {
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

export function PipelineRegions() {
	const editor = useEditor()
	const regions = useValue('regions', () => findPipelineRegions(editor), [editor])

	return regions.map((region, i) => <PipelineRegionComponent key={i} region={region} />)
}

function PipelineRegionComponent({ region }: { region: PipelineRegion }) {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	const isExecuting = useValue(
		'isExecuting',
		() => {
			const execution = executionState.get(editor).runningGraph
			if (!execution) return false

			for (const nodeId of region.nodes) {
				if (execution.getNodeStatus(nodeId) === 'executing') {
					return true
				}
			}

			return false
		},
		[editor, region]
	)

	useQuickReactor(
		'PipelineRegion positioning',
		() => {
			if (!ref.current) return
			const camera = editor.getCamera()

			if (camera.z < 0.25) {
				ref.current.style.display = 'none'
				return
			} else {
				ref.current.style.display = 'block'
			}

			const position = editor.pageToViewport(region.bounds)
			ref.current.style.transform = `translate(${position.x}px, ${position.y}px)`
			ref.current.style.width = `${region.bounds.w * camera.z}px`
			ref.current.style.height = `${region.bounds.h * camera.z}px`
		},
		[region, editor]
	)

	usePassThroughWheelEvents(ref)

	return (
		<div
			className={classNames('PipelineRegion', { PipelineRegion_executing: isExecuting })}
			ref={ref}
		>
			<button
				className="PipelineRegion-button"
				onPointerDown={editor.markEventAsHandled}
				onClick={() => {
					if (isExecuting) {
						stopExecution(editor)
					} else {
						startExecution(editor, region.startingNodes)
					}
				}}
			>
				{isExecuting ? <StopIcon /> : <PlayIcon />}
			</button>
		</div>
	)
}
