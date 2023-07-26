import { useValue } from '@tldraw/state'
import { useEditor } from '../../editor'

export function useForceSolid() {
	const editor = useEditor()
	return useValue('zoom', () => editor.zoomLevel < 0.35, [editor])
}
