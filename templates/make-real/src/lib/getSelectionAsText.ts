import { Editor, TLArrowShape, TLGeoShape, TLNoteShape, TLTextShape } from 'tldraw'

export function getTextFromSelectedShapes(editor: Editor) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const selectedShapeDescendantIds = editor.getShapeAndDescendantIds(selectedShapeIds)

	const shapesWithText = Array.from(selectedShapeDescendantIds)
		.map((id) => editor.getShape(id)!)
		.filter((shape) => {
			return (
				shape.type === 'text' ||
				shape.type === 'geo' ||
				shape.type === 'arrow' ||
				shape.type === 'note'
			)
		}) as (TLTextShape | TLGeoShape | TLArrowShape | TLNoteShape)[]

	const texts = shapesWithText
		.sort((a, b) => {
			// top first, then left, based on page position
			const pageBoundsA = editor.getShapePageBounds(a)
			const pageBoundsB = editor.getShapePageBounds(b)
			if (!pageBoundsA || !pageBoundsB) return 0
			return pageBoundsA.y === pageBoundsB.y
				? pageBoundsA.x < pageBoundsB.x
					? -1
					: 1
				: pageBoundsA.y < pageBoundsB.y
					? -1
					: 1
		})
		.map((shape) => {
			const shapeUtil = editor.getShapeUtil(shape)
			const text = shapeUtil.getText(shape)
			if ('color' in shape.props && shape.props.color === 'red') {
				return `Annotation: ${text}`
			}
			return text
		})
		.filter((v) => !!v)

	return texts.join('\n')
}
