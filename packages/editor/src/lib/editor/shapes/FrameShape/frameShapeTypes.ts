import { TLBaseShape } from '@tldraw/tlschema'

/** @public */
export type TLFrameShapeProps = {
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>
