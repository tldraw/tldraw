import { useValue } from '@tldraw/state'
import { useEditor } from '../../editor'

/** @public */
export function useReadonly() {
	const editor = useEditor()
	return useValue('isReadonlyMode', () => editor.instanceState.isReadonly, [editor])
}
