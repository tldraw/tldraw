import { TLAssetId, TLBaseShape, Vec2dModel } from '@tldraw/tlschema'

/** @public */
export type TLImageCrop = {
	topLeft: Vec2dModel
	bottomRight: Vec2dModel
}

/** @public */
export type TLImageShapeProps = {
	url: string
	playing: boolean
	w: number
	h: number
	assetId: TLAssetId | null
	crop: TLImageCrop | null
}

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>
