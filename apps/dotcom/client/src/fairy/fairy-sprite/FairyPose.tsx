export const FAIRY_POSE = ['idle', 'thinking', 'acting'] as const

export type FairyPose = (typeof FAIRY_POSE)[number]
