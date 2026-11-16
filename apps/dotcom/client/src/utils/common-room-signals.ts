import { CommonRoomTracker } from '../../../../../internal/shared/common-room-tracker'
import { isProductionEnv } from './env'

interface CommonRoomUser {
	email: string
	name: string
}

export const shouldUseCommonRoom = isProductionEnv

const tracker = new CommonRoomTracker()
let identifiedEmail: string | undefined

export function configureCommonRoom(consent: boolean, user?: CommonRoomUser) {
	if (!shouldUseCommonRoom) return
	if (!consent) {
		tracker.disable()
		identifiedEmail = undefined
		return
	}

	// A new account or sign-out must not retain the previous visitor's identity.
	if (identifiedEmail && identifiedEmail !== user?.email) tracker.reset()
	if (!tracker.enable()) return
	identifiedEmail = user?.email
	if (user) tracker.identify({ email: user.email, name: user.name })
}

export const commonRoom = {
	reset() {
		tracker.reset()
		identifiedEmail = undefined
	},
}

export function trackCommonRoomPageview() {
	tracker.page()
}
