import { TLAssetId, TLBaseShape } from '@tldraw/tlschema'

/** @public */
export type TLVideoShapeProps = {
	w: number
	h: number
	time: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
}

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>
