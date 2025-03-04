import { Editor, ShapeWithCrop, TLShapePartial, Vec, structuredClone } from '@tldraw/editor'
import { getUncroppedSize } from '../../../../../shapes/shared/crop'

export function getTranslateCroppedImageChange(editor: Editor, shape: ShapeWithCrop, delta: Vec) {
	if (!shape) {
		throw Error('Needs to translate a cropped shape!')
	}

	const { crop: oldCrop } = shape.props
	if (!oldCrop) {
		// can't translate a shape that doesn't have an existing crop
		return
	}

	const flatten: 'x' | 'y' | null = editor.inputs.shiftKey
		? Math.abs(delta.x) < Math.abs(delta.y)
			? 'x'
			: 'y'
		: null

	if (flatten === 'x') {
		delta.x = 0
	} else if (flatten === 'y') {
		delta.y = 0
	}

	delta.rot(-shape.rotation)

	const { w, h } = getUncroppedSize(shape.props, oldCrop)
	const xCropSize = oldCrop.bottomRight.x - oldCrop.topLeft.x
	const yCropSize = oldCrop.bottomRight.y - oldCrop.topLeft.y
	const newCrop = structuredClone(oldCrop)

	const min = 0.5 * (shape.props.zoom - 1)
	const max = min * -1
	const xMinWithCrop = min + (1 - xCropSize)
	const yMinWithCrop = min + (1 - yCropSize)
	newCrop.topLeft.x = Math.min(xMinWithCrop, Math.max(max, newCrop.topLeft.x - delta.x / w))
	newCrop.topLeft.y = Math.min(yMinWithCrop, Math.max(max, newCrop.topLeft.y - delta.y / h))

	newCrop.bottomRight.x = newCrop.topLeft.x + xCropSize
	newCrop.bottomRight.y = newCrop.topLeft.y + yCropSize

	const partial: TLShapePartial<typeof shape> = {
		id: shape.id,
		type: shape.type,
		props: {
			crop: newCrop,
		},
	}

	return partial
}
