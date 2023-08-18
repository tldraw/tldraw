import { useEditor, useValue } from '@tldraw/editor'

export function useStableZoomLevel() {
	const editor = useEditor()
	return useValue('stable zoom level', () => editor.stableZoomLevel, [editor])
}
