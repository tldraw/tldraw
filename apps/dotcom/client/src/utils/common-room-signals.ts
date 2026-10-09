import { CommonRoomTracker } from '../../../../../internal/shared/common-room-tracker'
import { isProductionEnv } from './env'

interface CommonRoomUser {
	email: string
	name: string
}

const tracker = new CommonRoomTracker()
let identifiedEmail: string | undefined

export function configureCommonRoom(consent: boolean, user?: CommonRoomUser) {
	if (!isProductionEnv || !consent) {
		tracker.disable()
		identifiedEmail = undefined
		return
	}

	// A new account or sign-out must not retain the previous visitor's identity.
	if (identifiedEmail !== user?.email) tracker.disable()
	if (!tracker.enable()) return
	identifiedEmail = user?.email
	if (user) tracker.identify({ email: user.email, name: user.name })
}

export function trackCommonRoomPageview() {
	tracker.page()
}
