import { Editor, EditorAtom, TLShapeId } from 'tldraw'
import { PortIdentifier } from './Port'

/** UI state highlighting the ports relevant to the user's current drag. */
export interface PortState {
	// the port a connection is currently being dragged over
	hintingPort: PortIdentifier | null
	// which ports the dragged connection could be dropped on
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
