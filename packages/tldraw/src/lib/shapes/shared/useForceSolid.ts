import { useEditor, useValue } from '@tldraw/editor'

export function useForceSolid() {
	const editor = useEditor()
	return useValue('zoom', () => editor.stableZoomLevel < 0.35, [editor])
}
