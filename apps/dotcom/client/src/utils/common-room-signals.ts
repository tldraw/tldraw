import { COMMON_ROOM_SNIPPET } from '../../../../../internal/shared/common-room-signals'
import { isProductionEnv } from './env'

interface CommonRoomUser {
	email: string
	name: string
}

interface CommonRoomWindow extends Window {
	signals?: {
		_opts: { apiHost: string; autoTracking?: boolean }
		identify(user: CommonRoomUser): void
		page(url: string): void
	}
}

let iframe: HTMLIFrameElement | null = null
let identifiedEmail: string | undefined
let lastPageUrl: string | null = null

function removeCommonRoom() {
	// Removing the iframe stops the vendor's running code, unlike removing its script tag.
	iframe?.remove()
	iframe = null
	identifiedEmail = undefined
	lastPageUrl = null
}

function getSignals() {
	return (iframe?.contentWindow as CommonRoomWindow | null)?.signals
}

export function configureCommonRoom(consent: boolean, user?: CommonRoomUser) {
	if (!isProductionEnv || !consent) {
		removeCommonRoom()
		return
	}

	// A new account or sign-out must not retain the previous visitor's identity.
	if (identifiedEmail !== user?.email) removeCommonRoom()

	if (!iframe) {
		iframe = document.createElement('iframe')
		iframe.id = 'common-room-iframe-loader'
		iframe.hidden = true
		iframe.referrerPolicy = 'no-referrer'
		document.body.appendChild(iframe)

		const frameDocument = iframe.contentDocument
		if (!frameDocument) {
			removeCommonRoom()
			return
		}

		const script = frameDocument.createElement('script')
		script.textContent = COMMON_ROOM_SNIPPET
		frameDocument.head.appendChild(script)

		const signals = getSignals()
		if (!signals) {
			removeCommonRoom()
			return
		}

		// The CDN script is async: disable automatic iframe tracking before it executes.
		signals._opts.autoTracking = false
		identifiedEmail = user?.email
	}

	if (user) getSignals()?.identify({ email: user.email, name: user.name })
	trackCommonRoomPageview()
}

export function trackCommonRoomPageview() {
	const signals = getSignals()
	if (!signals || lastPageUrl === window.location.href) return
	lastPageUrl = window.location.href
	signals.page(lastPageUrl)
}
