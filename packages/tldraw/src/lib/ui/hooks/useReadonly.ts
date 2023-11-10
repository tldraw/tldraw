import { useEditor, useValue } from '@tldraw/editor'

/** @public */
export function useReadonly() {
	const editor = useEditor()
	return useValue('isReadonlyMode', () => editor.getInstanceState().isReadonly, [editor])
}
