import { Editor, TLShapeId, VecModel } from 'tldraw'
import { ExecutionGraph } from './execution/ExecutionGraph'
import { NodeType } from './nodes/nodeTypes'
import { PortIdentifier } from './ports/Port'
import { EditorState } from './utils'

export interface PortState {
	hintingPort: PortIdentifier | null
	eligiblePorts: {
		terminal: 'start' | 'end'
		excludeNodes: Set<TLShapeId> | null
	} | null
}

export const portState = new EditorState<PortState>('port state', () => ({
	hintingPort: null,
	eligiblePorts: null,
}))
export function updatePortState(editor: Editor, update: Partial<PortState>) {
	portState.update(editor, (state) => {
		const newState = { ...state, ...update }
		return newState
	})
}

export interface OnCanvasComponentPickerState {
	connectionShapeId: TLShapeId
	location: 'start' | 'end' | 'middle'
	onPick: (nodeType: NodeType, position: VecModel) => void
	onClose: () => void
}

export const onCanvasComponentPickerState = new EditorState<OnCanvasComponentPickerState | null>(
	'on canvas component picker',
	() => null
)

export interface ExecutionState {
	runningGraph: ExecutionGraph | null
}
export const executionState = new EditorState<ExecutionState>('execution state', () => ({
	runningGraph: null,
}))
export async function startExecution(editor: Editor, startingNodeIds: Set<TLShapeId>) {
	const graph = new ExecutionGraph(editor, startingNodeIds)
	executionState.update(editor, (state) => ({
		...state,
		runningGraph: graph,
	}))
	try {
		await graph.execute()
	} finally {
		executionState.update(editor, (state) => ({
			...state,
			runningGraph: null,
		}))
	}
}
export function stopExecution(editor: Editor) {
	executionState.update(editor, (state) => {
		if (!state.runningGraph) return state
		state.runningGraph.stop()
		return { ...state, runningGraph: null }
	})
}
