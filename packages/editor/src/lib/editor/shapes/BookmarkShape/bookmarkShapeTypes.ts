import { TLAssetId, TLBaseShape } from '@tldraw/tlschema'

/** @public */
export type TLBookmarkShapeProps = {
	w: number
	h: number
	assetId: TLAssetId | null
	url: string
}

/** @public */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>
