export const MINIMUM_LEG_LENGTH = 10

export const DIRS = [
	// right
	{ x: 1, y: 0 },
	// down
	{ x: 0, y: 1 },
	// left
	{ x: -1, y: 0 },
	// up
	{ x: 0, y: -1 },
] as const

export type ArrowDirection = (typeof DIRS)[number]
