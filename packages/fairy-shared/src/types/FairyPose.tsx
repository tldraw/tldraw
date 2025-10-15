export const FAIRY_POSE = ['idle', 'active', 'thinking', 'acting'] as const

export type FairyPose = (typeof FAIRY_POSE)[number]
