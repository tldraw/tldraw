import { VecModel } from '../misc/geometry-types'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLShapeCrop {
	topLeft: VecModel
	bottomRight: VecModel
}

/** @public */
export type ShapeWithCrop = TLBaseShape
