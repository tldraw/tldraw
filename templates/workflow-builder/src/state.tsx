import { Editor, TLShapeId } from 'tldraw'
import { PortIdentifier } from './ports/Port'
import { EditorState } from './utils'

export interface PortState {
	hintingPort: PortIdentifier | null
}

export const portState = new EditorState<PortState>('port state', () => ({ hintingPort: null }))
export function updatePortState(editor: Editor, update: Partial<PortState>) {
	portState.update(editor, (state) => ({
		...state,
		...update,
	}))
}

export interface OnCanvasComponentPickerState {
	connectionShapeId: TLShapeId
	terminal: 'start' | 'end'
}

export const onCanvasComponentPickerState = new EditorState<OnCanvasComponentPickerState | null>(
	'on canvas component picker',
	() => null
)
