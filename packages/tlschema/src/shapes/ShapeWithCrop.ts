import { VecModel } from '../misc/geometry-types'
import { TLShape } from '../records/TLShape'

/** @public */
export interface TLShapeCrop {
	topLeft: VecModel
	bottomRight: VecModel
	isCircle?: boolean
}

/** @public */
export type ShapeWithCrop = Extract<
	TLShape,
	{ props: { w: number; h: number; crop: TLShapeCrop | null } }
>
