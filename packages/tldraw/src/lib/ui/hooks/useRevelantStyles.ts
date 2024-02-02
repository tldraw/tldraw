import {
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	ReadonlySharedStyleMap,
	SharedStyle,
	SharedStyleMap,
	useEditor,
	useValue,
} from '@tldraw/editor'

const selectToolStyles = [DefaultColorStyle, DefaultDashStyle, DefaultFillStyle, DefaultSizeStyle]

export function useRelevantStyles(): {
	styles: ReadonlySharedStyleMap
	opacity: SharedStyle<number>
} | null {
	const editor = useEditor()
	return useValue(
		'getRelevantStyles',
		() => {
			const styles = new SharedStyleMap(editor.getSharedStyles())
			const hasShape =
				editor.getSelectedShapeIds().length > 0 || !!editor.root.getCurrent()?.shapeType

			// TODO: Do we still need this? It's applying styles when in select tool and no shapes are selected
			// I guess we need to decide on the UX for this case
			// if (styles.size === 0 && editor.isIn('select') && editor.getSelectedShapeIds().length === 0) {
			// 	for (const style of selectToolStyles) {
			// 		styles.applyValue(style, editor.getStyleForNextShape(style))
			// 	}
			// }

			if (styles.size === 0 && !hasShape) return null
			return { styles, opacity: editor.getSharedOpacity() }
		},
		[editor]
	)
}
