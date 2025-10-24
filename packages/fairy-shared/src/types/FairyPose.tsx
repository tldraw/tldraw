export const FAIRY_POSE = ['idle', 'active', 'thinking', 'acting', 'poof', 'flutter'] as const

export type FairyPose = (typeof FAIRY_POSE)[number]

export function getValidPose(pose?: string | null): FairyPose {
	// If a named pose is valid, return it
	// Otherwise, default to idle
	const validPose = FAIRY_POSE.find((p) => p === pose)
	return validPose ?? 'idle'
}

export function getValidGesture(gesture?: string | null) {
	// If no gesture provided, return null
	if (!gesture) return null

	// If a named gesture is provided, return it if it's valid
	// Otherwise, default to null
	const validGesture = FAIRY_POSE.find((p) => p === gesture)
	return validGesture ?? null
}
