import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

/** @public */
export function useReadonly() {
	const editor = useEditor()
	return useValue('isReadOnlyMode', () => editor.isReadOnly, [editor])
}
