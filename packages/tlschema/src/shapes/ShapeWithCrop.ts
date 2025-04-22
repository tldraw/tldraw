import { VecModel } from '../misc/geometry-types'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLShapeCrop {
	topLeft: VecModel
	bottomRight: VecModel
	isCircle?: boolean
}

/** @public */
export type ShapeWithCrop = TLBaseShape<string, { w: number; h: number; crop: TLShapeCrop | null }>
