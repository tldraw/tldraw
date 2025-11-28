import { useEditor, useValue } from '@tldraw/editor'

/** Returns true when zoomed out far enough that shapes should render in a simplified "solid" style. */
export function useForceSolid() {
	const editor = useEditor()
	return useValue('force solid', () => editor.getDebouncedZoomLevel() < 0.25, [editor])
}
