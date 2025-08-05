import { Editor, TLShapeId } from 'tldraw'
import { EditorAtom } from '../utils'
import { PortIdentifier } from './Port'

/**
 * The UI state for ports. These mostly highlight ports relevant to the user's current action.
 */
export interface PortState {
	// hintingPort is the port that the user is currently dragging a connection to.
	hintingPort: PortIdentifier | null
	// eligiblePorts is the set of ports that the user can connect a new connection to.
	eligiblePorts: {
		terminal: 'start' | 'end'
		excludeNodes: Set<TLShapeId> | null
	} | null
}

export const portState = new EditorAtom<PortState>('port state', () => ({
	hintingPort: null,
	eligiblePorts: null,
}))

export function updatePortState(editor: Editor, update: Partial<PortState>) {
	portState.update(editor, (state) => {
		const newState = { ...state, ...update }
		return newState
	})
}
