import { Editor, TLShapeId } from 'tldraw'
import { EditorState } from '../utils'
import { ExecutionGraph } from './ExecutionGraph'

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
