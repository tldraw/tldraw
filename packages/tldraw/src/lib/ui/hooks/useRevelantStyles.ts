import {
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	ReadonlySharedStyleMap,
	SharedStyleMap,
	StyleProp,
	useEditor,
	useValue,
} from '@tldraw/editor'

const selectToolStyles: readonly StyleProp<any>[] = Object.freeze([
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
])

/** @public */
export function useRelevantStyles(stylesToCheck = selectToolStyles): ReadonlySharedStyleMap | null {
	const editor = useEditor()
	return useValue(
		'getRelevantStyles',
		() => {
			const styles = new SharedStyleMap(editor.getSharedStyles())

			if (styles.size === 0 && editor.isIn('select') && editor.getSelectedShapeIds().length === 0) {
				for (const style of stylesToCheck) {
					styles.applyValue(style, editor.getStyleForNextShape(style))
				}
			}

			if (styles.size === 0) return null
			return styles
		},
		[editor]
	)
}
