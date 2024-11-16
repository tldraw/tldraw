import { Vec } from 'tldraw'

export const EXPAND_LEG_LENGTH = 32
export const MINIMUM_LEG_LENGTH = 24

export const DIRS = ['right', 'down', 'left', 'up'] as const

export type ArrowDirection = (typeof DIRS)[number]

export const DELTAS: Record<ArrowDirection, Vec> = {
	up: new Vec(0, -1),
	right: new Vec(1, 0),
	down: new Vec(0, 1),
	left: new Vec(-1, 0),
}

// export const turns = {
// 	up: ['left', 'right'],
// 	up: ['left', 'right'],
// }
