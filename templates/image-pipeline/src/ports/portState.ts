import { Editor, TLShapeId } from 'tldraw'
import { PortDataType } from '../constants'
import { EditorAtom } from '../utils'
import { PortIdentifier } from './Port'

/**
 * The UI state for ports. These mostly highlight ports relevant to the user's current action.
 */
export interface PortState {
	hintingPort: PortIdentifier | null
	eligiblePorts: {
		terminal: 'start' | 'end'
		excludeNodes: Set<TLShapeId> | null
		/** Only ports matching this data type are eligible. */
		dataType: PortDataType | null
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
