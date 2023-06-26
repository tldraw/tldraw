import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

export function useForceSolid() {
	const editor = useEditor()
	return useValue('zoom', () => editor.zoomLevel < 0.35, [editor])
}
