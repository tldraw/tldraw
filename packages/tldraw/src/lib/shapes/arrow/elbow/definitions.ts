import { ElbowArrowSide, Vec } from '@tldraw/editor'

export const ELBOW_ARROW_DIRS = ['right', 'bottom', 'left', 'top'] as const

/** @public */
export interface ElbowArrowOptions {
	expandElbowLegLength: number
	minElbowLegLength: number
	minArrowDistanceFromCorner: number
}

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
