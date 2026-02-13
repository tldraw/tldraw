import { useEditor, useValue } from '@tldraw/editor'

/** Returns true when zoomed out far enough that shapes should render in a simplified "solid" style. */
export function useEfficientZoomThreshold(threshold = 0.25) {
	const editor = useEditor()
	return useValue('efficient zoom threshold', () => editor.getEfficientZoomLevel() < threshold, [
		editor,
		threshold,
	])
}
