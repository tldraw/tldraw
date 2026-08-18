import { Editor, TLShapeId } from 'tldraw'
import { EditorAtom } from '../utils'
import { PortIdentifier } from './Port'

/**
 * UI state highlighting ports relevant to the user's current action.
 */
export interface PortState {
	/** The port the user is currently dragging a connection to. */
	hintingPort: PortIdentifier | null
	/** The set of ports the user can connect the dragged connection to. */
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
	portState.update(editor, (state) => ({ ...state, ...update }))
}
