import { ElbowArrowSide, Vec, VecModel } from '@tldraw/editor'

export const ELBOW_ARROW_DIRS = ['right', 'bottom', 'left', 'top'] as const

/** @public */
export interface ElbowArrowOptions {
	expandElbowLegLength: number
	minElbowLegLength: number
	minArrowDistanceFromCorner: number
	shortestArrowMeasure: 'distance' | 'count'
}

export const ElbowArrowSideDeltas = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
} as const satisfies Record<ElbowArrowSide, VecModel>

export const ElbowArrowSideOpposites = {
	left: 'right',
	right: 'left',
	top: 'bottom',
	bottom: 'top',
} as const satisfies Record<ElbowArrowSide, ElbowArrowSide>

export const ElbowArrowSideAxes = {
	left: 'x',
	right: 'x',
	top: 'y',
	bottom: 'y',
} as const satisfies Record<ElbowArrowSide, 'x' | 'y'>

export const ElbowArrowAxes = {
	x: {
		v: (x: number, y: number) => new Vec(x, y),
		loEdge: 'left',
		hiEdge: 'right',
		mid: 'midX',
		crossLoEdge: 'top',
		crossHiEdge: 'bottom',
		crossMid: 'midY',
		max: 'maxX',
		min: 'minX',
		self: 'x',
		cross: 'y',
		crossMax: 'maxY',
		crossMin: 'minY',
	},
	y: {
		v: (y: number, x: number) => new Vec(x, y),
		loEdge: 'top',
		hiEdge: 'bottom',
		mid: 'midY',
		crossLoEdge: 'left',
		crossHiEdge: 'right',
		crossMid: 'midX',
		max: 'maxY',
		min: 'minY',
		self: 'y',
		cross: 'x',
		crossMax: 'maxX',
		crossMin: 'minX',
	},
} as const

export type ElbowArrowAxis = (typeof ElbowArrowAxes)[keyof typeof ElbowArrowAxes]
