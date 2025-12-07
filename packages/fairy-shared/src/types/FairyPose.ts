export const FAIRY_POSE = [
	'idle',
	'active',
	'thinking',
	'working',
	'reading',
	'writing',
	'sleeping',
	'waiting',
	'reviewing',
	'panicking',
	'soaring',
	'poof',
] as const

export type FairyPose = (typeof FAIRY_POSE)[number]
