import { Vec } from '@tldraw/editor'

export const DIRS = ['right', 'bottom', 'left', 'top'] as const

export type ArrowDirection = (typeof DIRS)[number]

/** @public */
export interface ElbowArrowOptions {
	expandElbowLegLength: number
	minElbowLegLength: number
	minArrowDistanceFromCorner: number
}

export const DELTAS: Record<ArrowDirection, Vec> = {
	top: new Vec(0, -1),
	right: new Vec(1, 0),
	bottom: new Vec(0, 1),
	left: new Vec(-1, 0),
}

export const ElbowArrowSideOpposites = {
	left: 'right',
	right: 'left',
	top: 'bottom',
	bottom: 'top',
} as const

export const ElbowArrowSideAxes = {
	left: 'x',
	right: 'x',
	top: 'y',
	bottom: 'y',
} as const

export const ElbowArrowAxes = {
	x: {
		v: (x: number, y: number) => new Vec(x, y),
		loEdge: 'left',
		hiEdge: 'right',
		mid: 'mx',
		crossLoEdge: 'top',
		crossHiEdge: 'bottom',
		crossMid: 'my',
		max: 'maxX',
		min: 'minX',
		crossMax: 'maxY',
		crossMin: 'minY',
	},
	y: {
		v: (y: number, x: number) => new Vec(x, y),
		loEdge: 'top',
		hiEdge: 'bottom',
		mid: 'my',
		crossLoEdge: 'left',
		crossHiEdge: 'right',
		crossMid: 'mx',
		max: 'maxY',
		min: 'minY',
		crossMax: 'maxX',
		crossMin: 'minX',
	},
} as const

export type ElbowArrowAxis = (typeof ElbowArrowAxes)[keyof typeof ElbowArrowAxes]
