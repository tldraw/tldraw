import { SimpleShape } from './SimpleShape'

export interface BlurryShape {
	shapeId: string
	text?: string
	type: SimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}
