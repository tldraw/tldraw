export const FAIRY_POSE = ['idle', 'active', 'thinking', 'acting', 'poof', 'flutter'] as const

export type FairyPose = (typeof FAIRY_POSE)[number]
