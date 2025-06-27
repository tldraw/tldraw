import { TLShapeId } from '@tldraw/tlschema'

export type Node = {
	type: string
	id: TLShapeId
	x: number
	y: number
}

/** @internal */
export type Padding = number | [number, number, number, number] // [top, right, bottom, left]

export type RequestNode = Node & {
	w: number
	h: number
	weight?: number
	padding?: Padding
}

export type Request = {
	requestId: string
	nodes: RequestNode[]
}

export type ResponseNode = Node

export type Response = {
	requestId: string
	nodes: ResponseNode[]
}
