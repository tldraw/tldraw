import { Editor, TLShapeId } from 'tldraw'
import { EditorState } from '../utils'
import { PortIdentifier } from './Port'

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
