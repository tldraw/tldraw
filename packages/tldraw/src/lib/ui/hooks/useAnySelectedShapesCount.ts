import { useEditor, useValue } from '@tldraw/editor'

/**
 * Returns true if the number of LOCKED OR UNLOCKED selected shapes is at least min or at most max.
 */
export function useAnySelectedShapesCount(min?: number, max?: number) {
	const editor = useEditor()
	return useValue(
		'selectedShapes',
		() => {
			const len = editor.getSelectedShapes().length
			if (min === undefined) {
				if (max === undefined) {
					// just length
					return len
				} else {
					// max but no min
					return len <= max
				}
			} else {
				if (max === undefined) {
					// min but no max
					return len >= min
				} else {
					// max and min
					return len >= min && len <= max
				}
			}
		},
		[editor]
	)
}
