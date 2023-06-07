import { TLBaseShape } from '@tldraw/tlschema'

type TLFrameShapeProps = {
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>
