import { Editor, ShapeWithCrop, TLShapePartial, Vec, clamp, structuredClone } from '@tldraw/editor'
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

	const xMinWithCrop = 1 - xCropSize
	const yMinWithCrop = 1 - yCropSize
	newCrop.topLeft.x = clamp(newCrop.topLeft.x - delta.x / w, 0, xMinWithCrop)
	newCrop.topLeft.y = clamp(newCrop.topLeft.y - delta.y / h, 0, yMinWithCrop)

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
