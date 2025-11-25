export const FAIRY_POSE = [
	'idle',
	'active',
	'thinking',
	'working',
	'reading',
	'writing',
	'sleeping',
	'waiting',
	'poof',
] as const

export type FairyPose = (typeof FAIRY_POSE)[number]
