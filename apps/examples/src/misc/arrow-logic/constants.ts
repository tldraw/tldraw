export const EXPAND_LEG_LENGTH = 32
export const MINIMUM_LEG_LENGTH = 24

export const DIRS = ['right', 'down', 'left', 'up'] as const

export type ArrowDirection = (typeof DIRS)[number]
