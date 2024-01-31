import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const bookmarkShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	assetId: assetIdValidator.nullable(),
	url: T.linkUrl,
}

/** @public */
export type TLBookmarkShapeProps = ShapePropsType<typeof bookmarkShapeProps>

/** @public */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>
