import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { vecModelValidator } from '../misc/geometry-types'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const ImageShapeCrop = T.object({
	topLeft: vecModelValidator,
	bottomRight: vecModelValidator,
})
/** @public */
export type TLImageShapeCrop = T.TypeOf<typeof ImageShapeCrop>

/** @public */
export const imageShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
}

/** @public */
export type TLImageShapeProps = ShapePropsType<typeof imageShapeProps>

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>
