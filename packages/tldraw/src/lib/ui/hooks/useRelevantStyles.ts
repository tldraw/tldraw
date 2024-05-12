import { ReadonlySharedStyleMap, useEditor, useValue } from '@tldraw/editor'

/** @public */
export function useRelevantStyles(): ReadonlySharedStyleMap | null {
	const editor = useEditor()
	return useValue(
		'getRelevantStyles',
		() => {
			const currentTool = editor.getCurrentTool()
			const currentToolStyles = currentTool.getStyles()
			return currentToolStyles

			// const isInShapeSpecificTool = false
			// const hasShapesSelected = editor.isIn('select') && editor.getSelectedShapeIds().length > 0

			// if (styles.size === 0 && editor.isIn('select') && editor.getSelectedShapeIds().length === 0) {
			// 	for (const style of stylesToCheck) {
			// 		styles.applyValue(style, editor.getStyleForNextShape(style))
			// 	}
			// }

			// if (isInShapeSpecificTool || hasShapesSelected || styles.size > 0) {
			// 	// If size is 0 we may still want to return an empty styles map to allow
			// 	// the opacity slider to show up.
			// 	// This can happen in two situations:
			// 	// 1. When the user is in the select tool and has multiple shapes selected but they have no supported styles (beyond opacity).
			// 	// 2. When the user is in a shape-specific tool and the shape has no supported styles (beyond opacity obvs).
			// 	return styles
			// }

			// return null
		},
		[editor]
	)
}
