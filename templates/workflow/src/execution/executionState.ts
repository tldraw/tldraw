import { Editor, TLShapeId } from 'tldraw'
import { EditorAtom } from '../utils'
import { ExecutionGraph } from './ExecutionGraph'

/**
 * The state of the execution system, so executions are available to the UI.
 */
export interface ExecutionState {
	runningGraph: ExecutionGraph | null
}

/**
 * We store the execution state in an atom scoped to each editor.
 */
export const executionState = new EditorAtom<ExecutionState>('execution state', () => ({
	runningGraph: null,
}))

/**
 * Start an execution, scoped to the editor. This will stop any existing execution.
 */
export async function startExecution(editor: Editor, startingNodeIds: Set<TLShapeId>) {
	const graph = new ExecutionGraph(editor, startingNodeIds)
	executionState.update(editor, (state) => {
		state.runningGraph?.stop()
		return {
			...state,
			runningGraph: graph,
		}
	})
	try {
		await graph.execute()
	} finally {
		executionState.update(editor, (state) => ({
			...state,
			runningGraph: null,
		}))
	}
}

/**
 * Stop the currently running execution.
 */
export function stopExecution(editor: Editor) {
	executionState.update(editor, (state) => {
		if (!state.runningGraph) return state
		state.runningGraph.stop()
		return { ...state, runningGraph: null }
	})
}
