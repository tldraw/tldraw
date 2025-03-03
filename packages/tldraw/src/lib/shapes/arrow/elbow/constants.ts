import { Vec } from '@tldraw/editor'

export const DIRS = ['right', 'down', 'left', 'up'] as const

export type ArrowDirection = (typeof DIRS)[number]

export const DELTAS: Record<ArrowDirection, Vec> = {
	up: new Vec(0, -1),
	right: new Vec(1, 0),
	down: new Vec(0, 1),
	left: new Vec(-1, 0),
}
