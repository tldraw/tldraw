import { ISimpleShape } from './SimpleShape'

export interface BlurryShape {
	shapeId: string
	text?: string
	type: ISimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}
